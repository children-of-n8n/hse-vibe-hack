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

import type { FriendRepository } from "../domain/friends/friend.repository";
import {
  type AdventureStore,
  createInMemoryAdventureStore,
} from "./adventure.store";
import { createPostgresAdventureStore } from "./adventure.store.postgres";
import { type AiClient, createAiClient } from "./ai.service";

const defaultNow = () => new Date();

const buildShareToken = () =>
  `ADV-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

export const createAdventureService = (deps: {
  users: UserRepository;
  friends?: FriendRepository;
  cache?: CacheClient;
  ai?: AiClient;
  store?: AdventureStore;
  now?: () => Date;
}) => {
  const cache = deps.cache ?? defaultCache;
  const signer = createS3Signer();
  const ai = deps.ai ?? createAiClient();
  const now = deps.now ?? defaultNow;
  const store =
    deps.store ??
    (process.env.NODE_ENV === "test"
      ? createInMemoryAdventureStore(now)
      : createPostgresAdventureStore());

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
    const startsAt = input.startsAt ?? now();

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
      creator,
      participants: [creator, ...friendParticipants],
      startsAt,
      createdAt: now(),
      updatedAt: now(),
    };

    const saved = await store.createAdventure(
      adventure,
      adventure.participants,
    );
    await invalidateCaches(saved);
    return saved;
  };

  const listByStatus = async (
    userId: string,
    status: AdventureStatus,
  ): Promise<Adventure[]> => {
    const cached = await cache.get<Adventure[]>(cacheKey(status, userId));
    if (cached) return cached;

    const items = await store.listByStatus(userId, status);
    await cache.set(cacheKey(status, userId), items, 30);
    return items;
  };

  const getById = async (id: string): Promise<Adventure | null> => {
    return store.findById(id);
  };

  const updateAdventure = async (
    id: string,
    patch: Partial<
      Pick<
        Adventure,
        "title" | "description" | "status" | "summary" | "startsAt"
      >
    >,
  ): Promise<Adventure | null> => {
    const current = await store.findById(id);
    if (!current) return null;

    const updated: Adventure = {
      ...current,
      ...patch,
      updatedAt: now(),
    };

    const persisted = await store.updateAdventure(updated);
    if (persisted) {
      await invalidateCaches(persisted);
    }
    return persisted;
  };

  const completeAdventure = async (id: string): Promise<Adventure | null> => {
    const adventure = await store.findById(id);
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
    const adventure = await store.findByShareToken(token);
    if (!adventure) return null;

    const already = adventure.participants.some(
      (participant) => participant.id === userId,
    );
    if (already) return adventure;

    const participant = await participantForUser(userId);
    const updated = await store.addParticipant(adventure.id, participant);
    if (updated) {
      await invalidateCaches(updated);
    }
    return updated;
  };

  const getShareToken = async (id: string) => {
    const adventure = await store.findById(id);
    if (!adventure) return null;

    return {
      token: adventure.shareToken,
      url: `${process.env.APP_BASE_URL ?? "https://example.com"}/join/${adventure.shareToken}`,
    };
  };

  const listParticipants = async (
    adventureId: string,
  ): Promise<AdventureParticipant[] | null> => {
    return store.listParticipants(adventureId);
  };

  const listFriends = async (
    userId: string,
  ): Promise<AdventureParticipant[]> => {
    if (!deps.friends) return [];
    const friends = await deps.friends.listByUser(userId);
    return friends.map((friend) => ({
      id: friend.id,
      username: friend.name,
      avatarUrl: friend.avatarUrl ?? undefined,
    }));
  };

  const addParticipant = async (
    adventureId: string,
    userId: string,
  ): Promise<AdventureParticipant[] | null> => {
    const participant = await participantForUser(userId);
    const updated = await store.addParticipant(adventureId, participant);
    if (!updated) return null;
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

    return store.createPhoto(photo);
  };

  const listPhotos = async (
    adventureId: string,
  ): Promise<AdventurePhoto[] | null> => {
    return store.listPhotos(adventureId);
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
    return store.deletePhoto(adventureId, photoId);
  };

  const addReaction = async (
    photoId: string,
    userId: string,
    emoji: string,
  ): Promise<AdventureReaction | null> => {
    const reaction: AdventureReaction = {
      id: randomUUID(),
      photoId,
      userId,
      emoji,
      createdAt: now(),
    };

    return store.addReaction(reaction);
  };

  const removeReaction = async (
    photoId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean> => {
    return store.removeReaction(photoId, userId, emoji);
  };

  const listReactions = async (
    photoId: string,
  ): Promise<AdventureReaction[] | null> => {
    return store.listReactions(photoId);
  };

  const signPhotoUpload = async (adventureId: string, filename: string) => {
    const adventure = await store.findById(adventureId);
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
    listFriends,
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
