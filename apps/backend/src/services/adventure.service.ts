import { randomUUID } from "node:crypto";

import type {
  Adventure,
  AdventureCreate,
  AdventureParticipant,
  AdventurePhoto,
  AdventurePhotoWithReactions,
  AdventureReaction,
  AdventureStatus,
} from "@acme/backend/controllers/contracts/adventure.schemas";
import type { UserRepository } from "@acme/backend/domain/users/user.repository";
import type { CacheClient } from "@acme/backend/shared/cache";
import { cache as defaultCache } from "@acme/backend/shared/cache";
import { createS3Signer } from "@acme/backend/shared/s3";

import { type AiClient, createAiClient } from "./ai.service";

type AdventureState = {
  adventures: Map<string, Adventure>;
  photos: Map<string, AdventurePhoto>;
  reactions: Map<string, AdventureReaction>;
};

const now = () => new Date();

const buildShareToken = () =>
  `ADV-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

export const createAdventureService = (deps: {
  users: UserRepository;
  cache?: CacheClient;
  ai?: AiClient;
}) => {
  const state: AdventureState = {
    adventures: new Map(),
    photos: new Map(),
    reactions: new Map(),
  };
  const cache = deps.cache ?? defaultCache;
  const signer = createS3Signer();
  const ai = deps.ai ?? createAiClient();

  const participantForUser = async (
    userId: string,
  ): Promise<AdventureParticipant> => {
    const user = await deps.users.findById(userId);
    return {
      id: userId,
      username: user?.username ?? `user-${userId.slice(0, 6)}`,
      avatarUrl: undefined,
    };
  };

  const createAdventure = async (
    creatorId: string,
    input: AdventureCreate,
  ): Promise<Adventure> => {
    const creator = await participantForUser(creatorId);
    const friendParticipants = await Promise.all(
      (input.friendIds ?? []).map((id) => participantForUser(id)),
    );

    const description =
      (await ai
        .generateAdventureDescription({
          title: input.title,
          participants: [creator, ...friendParticipants],
        })
        .catch(() => null)) ??
      `AI draft: приключение "${input.title}" с друзьями.`;

    const adventure: Adventure = {
      id: randomUUID(),
      title: input.title,
      description,
      status: "upcoming",
      summary: undefined,
      shareToken: buildShareToken(),
      participants: [creator, ...friendParticipants],
      createdAt: now(),
      updatedAt: now(),
    };

    state.adventures.set(adventure.id, adventure);
    for (const participant of adventure.participants) {
      await cache.del(cacheKey("upcoming", participant.id));
    }
    return adventure;
  };

  const listByStatus = async (
    userId: string,
    status: AdventureStatus,
  ): Promise<Adventure[]> => {
    const cached = await cache.get<Adventure[]>(cacheKey(status, userId));
    if (cached) return cached;

    const items = [...state.adventures.values()].filter(
      (item) =>
        item.status === status &&
        item.participants.some((participant) => participant.id === userId),
    );

    await cache.set(cacheKey(status, userId), items, 30);
    return items;
  };

  const getById = async (id: string): Promise<Adventure | null> => {
    return state.adventures.get(id) ?? null;
  };

  const updateAdventure = async (
    id: string,
    patch: Partial<
      Pick<Adventure, "title" | "description" | "status" | "summary">
    >,
  ): Promise<Adventure | null> => {
    const current = state.adventures.get(id);
    if (!current) return null;

    const updated: Adventure = {
      ...current,
      ...patch,
      updatedAt: now(),
    };

    state.adventures.set(id, updated);
    await invalidateCaches(updated);
    return updated;
  };

  const completeAdventure = async (id: string): Promise<Adventure | null> => {
    const adventure = state.adventures.get(id);
    if (!adventure) return null;

    const summary =
      (await ai
        .generateAdventureSummary({
          title: adventure.title,
          participants: adventure.participants,
          description: adventure.description,
        })
        .catch(() => null)) ?? adventure.summary;

    return updateAdventure(id, { status: "completed", summary });
  };

  const joinByToken = async (
    userId: string,
    token: string,
  ): Promise<Adventure | null> => {
    const adventure = [...state.adventures.values()].find(
      (item) => item.shareToken === token,
    );

    if (!adventure) return null;

    const already = adventure.participants.some(
      (participant) => participant.id === userId,
    );

    if (already) return adventure;

    const participant = await participantForUser(userId);
    const updated: Adventure = {
      ...adventure,
      participants: [...adventure.participants, participant],
      updatedAt: now(),
    };

    state.adventures.set(adventure.id, updated);
    await invalidateCaches(updated);
    return updated;
  };

  const getShareToken = async (id: string) => {
    const adventure = state.adventures.get(id);
    if (!adventure) return null;

    return {
      token: adventure.shareToken,
      url: `${process.env.APP_BASE_URL ?? "https://example.com"}/join/${adventure.shareToken}`,
    };
  };

  const listParticipants = async (
    adventureId: string,
  ): Promise<AdventureParticipant[] | null> => {
    const adventure = state.adventures.get(adventureId);
    if (!adventure) return null;
    return adventure.participants;
  };

  const addParticipant = async (
    adventureId: string,
    userId: string,
  ): Promise<AdventureParticipant[] | null> => {
    const adventure = state.adventures.get(adventureId);
    if (!adventure) return null;

    if (adventure.participants.some((p) => p.id === userId)) {
      return adventure.participants;
    }

    const participant = await participantForUser(userId);
    const updated: Adventure = {
      ...adventure,
      participants: [...adventure.participants, participant],
      updatedAt: now(),
    };

    state.adventures.set(adventure.id, updated);
    await invalidateCaches(updated);
    return updated.participants;
  };

  const uploadPhoto = async (
    adventureId: string,
    uploaderId: string,
    caption?: string,
    photoUrl?: string,
    _contentType?: string,
  ): Promise<AdventurePhoto | null> => {
    const adventure = state.adventures.get(adventureId);
    if (!adventure) return null;

    const uploader = await participantForUser(uploaderId);
    const photo: AdventurePhoto = {
      id: randomUUID(),
      adventureId,
      url:
        photoUrl ??
        `https://placehold.co/800x600?text=${adventureId.slice(0, 6)}`,
      uploader,
      caption,
      createdAt: now(),
    };

    state.photos.set(photo.id, photo);
    return photo;
  };

  const listPhotos = async (
    adventureId: string,
  ): Promise<AdventurePhoto[] | null> => {
    const adventure = state.adventures.get(adventureId);
    if (!adventure) return null;

    return [...state.photos.values()].filter(
      (photo) => photo.adventureId === adventureId,
    );
  };

  const listPhotosWithReactions = async (
    adventureId: string,
  ): Promise<AdventurePhotoWithReactions[] | null> => {
    const photos = await listPhotos(adventureId);
    if (!photos) return null;
    const withReactions = await Promise.all(
      photos.map(async (photo) => {
        const reactions = (await listReactions(photo.id)) ?? [];
        return { ...photo, reactions };
      }),
    );
    return withReactions;
  };

  const deletePhoto = async (
    adventureId: string,
    photoId: string,
  ): Promise<boolean> => {
    const photo = state.photos.get(photoId);
    if (!photo || photo.adventureId !== adventureId) return false;

    state.photos.delete(photoId);
    for (const [reactionId, reaction] of [...state.reactions.entries()]) {
      if (reaction.photoId === photoId) {
        state.reactions.delete(reactionId);
      }
    }
    return true;
  };

  const addReaction = async (
    photoId: string,
    userId: string,
    emoji: string,
  ): Promise<AdventureReaction | null> => {
    const photo = state.photos.get(photoId);
    if (!photo) return null;

    for (const [id, reaction] of [...state.reactions.entries()]) {
      if (reaction.photoId === photoId && reaction.userId === userId) {
        state.reactions.delete(id);
      }
    }

    const reaction: AdventureReaction = {
      id: randomUUID(),
      photoId,
      userId,
      emoji,
      createdAt: now(),
    };

    state.reactions.set(reaction.id, reaction);
    return reaction;
  };

  const removeReaction = async (
    photoId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean> => {
    let removed = false;
    for (const [id, reaction] of [...state.reactions.entries()]) {
      if (
        reaction.photoId === photoId &&
        reaction.userId === userId &&
        reaction.emoji === emoji
      ) {
        state.reactions.delete(id);
        removed = true;
      }
    }
    return removed;
  };

  const listReactions = async (
    photoId: string,
  ): Promise<AdventureReaction[] | null> => {
    const photo = state.photos.get(photoId);
    if (!photo) return null;

    return [...state.reactions.values()].filter(
      (reaction) => reaction.photoId === photoId,
    );
  };

  const signPhotoUpload = async (adventureId: string, filename: string) => {
    const adventure = state.adventures.get(adventureId);
    if (!adventure) return null;

    const key = `adventures/${adventureId}/${randomUUID()}/${filename}`;
    return signer.signPutUrl(key, contentTypeFromFilename(filename));
  };

  const cacheKey = (status: AdventureStatus, userId: string) =>
    `adv:${status}:${userId}`;

  const invalidateCaches = async (adventure: Adventure) => {
    for (const participant of adventure.participants) {
      await cache.del(cacheKey("upcoming", participant.id));
      await cache.del(cacheKey("completed", participant.id));
    }
  };

  return {
    createAdventure,
    listByStatus,
    getById,
    updateAdventure,
    completeAdventure,
    joinByToken,
    getShareToken,
    listParticipants,
    addParticipant,
    uploadPhoto,
    listPhotos,
    deletePhoto,
    addReaction,
    removeReaction,
    listReactions,
    signPhotoUpload,
    listPhotosWithReactions,
  };
};

const contentTypeFromFilename = (filename: string | undefined) => {
  if (!filename) return undefined;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
};
