import { randomUUID } from "node:crypto";

import type {
  Adventure,
  AdventureCreate,
  AdventureParticipant,
  AdventurePhoto,
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
      : createLazyPostgresStore(now));

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
      creatorId: creator.id,
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

  const completeAdventure = async (
    id: string,
    requesterId?: string,
  ): Promise<Adventure | null> => {
    const adventure = await store.findById(id);
    if (!adventure) return null;
    if (requesterId && adventure.creatorId !== requesterId) return null;

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
    file?: File | Blob,
  ): Promise<AdventurePhoto | null> => {
    const adventure = await store.findById(adventureId);
    if (!adventure || adventure.creatorId !== uploaderId) return null;

    const fileName =
      (file && "name" in file && typeof file.name === "string" && file.name) ||
      "upload.jpg";
    const contentType =
      _contentType ||
      (file && "type" in file && typeof file.type === "string" && file.type) ||
      contentTypeFromFilename(fileName);

    let uploadedUrl = photoUrl;
    if (!uploadedUrl && file) {
      try {
        const key = `adventures/${adventureId}/${randomUUID()}/${fileName}`;
        const signed = await signer.signPutUrl(key, contentType);
        const response = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: contentType ? { "Content-Type": contentType } : undefined,
          body: file,
        });
        if (!response.ok) {
          console.error("Failed to upload photo to signed URL", {
            status: response.status,
            statusText: response.statusText,
          });
          return null;
        }
        uploadedUrl = signed.photoUrl;
      } catch (error) {
        console.error("Photo upload failed", error);
        return null;
      }
    }

    const uploader = await participantForUser(uploaderId);
    const photo: AdventurePhoto = {
      id: randomUUID(),
      adventureId,
      url:
        uploadedUrl ??
        `https://placehold.co/800x600?text=${adventureId.slice(0, 6)}`,
      uploader,
      caption,
      createdAt: now(),
    };

    return store.createPhoto(photo);
  };

  const signPhotoView = async (
    adventureId: string,
    photoId: string,
    requesterId: string,
  ) => {
    const adventure = await store.findById(adventureId);
    if (!adventure) return null;

    const isParticipant = adventure.participants.some(
      (p) => p.id === requesterId,
    );
    if (!isParticipant) return null;

    const photos = await store.listPhotos(adventureId);
    const photo = photos?.find((p) => p.id === photoId);
    if (!photo) return null;

    const key = keyFromPhotoUrl(photo.url, signer.baseUrl);
    if (!key) return null;

    return signer.signGetUrl(key);
  };

  const listPhotos = async (
    adventureId: string,
  ): Promise<AdventurePhoto[] | null> => {
    return store.listPhotos(adventureId);
  };

  const listPhotosForViewer = async (
    adventureId: string,
    viewerId?: string,
  ): Promise<AdventurePhoto[] | null> => {
    const photos = await listPhotos(adventureId);
    if (!photos) return null;

    const adventure =
      viewerId && photos.length > 0 ? await store.findById(adventureId) : null;
    const canViewSigned =
      Boolean(viewerId) &&
      Boolean(adventure) &&
      adventure?.participants.some((p) => p.id === viewerId);

    const withReactions = await Promise.all(
      photos.map(async (photo) => {
        const key =
          canViewSigned && photo.url
            ? keyFromPhotoUrl(photo.url, signer.baseUrl)
            : null;
        const signedUrl = key ? await signer.signGetUrl(key) : null;
        return {
          ...photo,
          url: signedUrl?.url ?? photo.url,
        };
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
    adventureId: string,
    userId: string,
    emoji: string,
  ): Promise<AdventureReaction | null> => {
    const adventure = await store.findById(adventureId);
    if (!adventure) return null;
    const isParticipant = adventure.participants.some((p) => p.id === userId);
    if (!isParticipant) return null;

    const reaction: AdventureReaction = {
      id: randomUUID(),
      adventureId,
      userId,
      emoji,
      createdAt: now(),
    };

    const saved = await store.addReaction(reaction);
    if (saved) {
      await invalidateCaches(adventure);
    }
    return saved;
  };

  const removeReaction = async (
    adventureId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean> => {
    const adventure = await store.findById(adventureId);
    if (!adventure) return false;
    const isParticipant = adventure.participants.some((p) => p.id === userId);
    if (!isParticipant) return false;

    const removed = await store.removeReaction(adventureId, userId, emoji);
    if (removed) {
      await invalidateCaches(adventure);
    }
    return removed;
  };

  const listReactions = async (
    adventureId: string,
  ): Promise<AdventureReaction[] | null> => {
    return store.listReactions(adventureId);
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
    listPhotosWithReactions: listPhotosForViewer,
    listFriends,
    signPhotoView,
  };
};

const createLazyPostgresStore = (now: () => Date) => {
  // Lazy import to avoid loading DB client when not needed (e.g., tests without DATABASE_URL).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createPostgresAdventureStore } =
    require("./adventure.store.postgres") as {
      createPostgresAdventureStore: () => AdventureStore;
    };
  return createPostgresAdventureStore();
};

const contentTypeFromFilename = (filename: string | undefined) => {
  if (!filename) return undefined;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
};

const keyFromPhotoUrl = (photoUrl: string, baseUrl: string) => {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const prefix = `${normalizedBase}/`;
  if (photoUrl.startsWith(prefix)) {
    return photoUrl.slice(prefix.length);
  }
  return null;
};
