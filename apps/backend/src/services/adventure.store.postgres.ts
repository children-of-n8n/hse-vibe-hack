import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import type {
  Adventure,
  AdventureParticipant,
  AdventurePhoto,
  AdventureReaction,
} from "@acme/backend/controllers/contracts/adventure.schemas";
import { db } from "@acme/backend/db/client";
import {
  adventureParticipants,
  adventurePhotos,
  adventureReactions,
  adventures,
  user,
} from "@acme/backend/db/schema";

import type { AdventureStore } from "./adventure.store";

const toParticipant = (
  row:
    | {
        userId: string;
        username: string | null;
      }
    | undefined,
): AdventureParticipant | undefined => {
  if (!row) return undefined;
  return {
    id: row.userId,
    username: row.username ?? `user-${row.userId.slice(0, 6)}`,
    avatarUrl: undefined,
  };
};

const toAdventure = (
  base: typeof adventures.$inferSelect,
  participants: AdventureParticipant[],
): Adventure => ({
  id: base.id,
  creatorId: base.creatorId,
  title: base.title,
  description: base.description,
  status: base.status,
  summary: base.summary ?? undefined,
  shareToken: base.shareToken,
  startsAt: base.startsAt ?? base.createdAt ?? new Date(),
  creator: participants.find((p) => p.id === base.creatorId) ?? {
    id: base.creatorId,
    username: `user-${base.creatorId.slice(0, 6)}`,
    avatarUrl: undefined,
  },
  participants,
  createdAt: base.createdAt ?? new Date(),
  updatedAt: base.updatedAt ?? new Date(),
});

const toPhoto = (
  row: typeof adventurePhotos.$inferSelect & { uploaderName: string | null },
  uploaderId: string,
): AdventurePhoto => ({
  id: row.id,
  adventureId: row.adventureId,
  url: row.url,
  caption: row.caption ?? undefined,
  createdAt: row.createdAt ?? new Date(),
  uploader: {
    id: uploaderId,
    username: row.uploaderName ?? `user-${uploaderId.slice(0, 6)}`,
    avatarUrl: undefined,
  },
});

const toReaction = (
  row: typeof adventureReactions.$inferSelect,
): AdventureReaction => ({
  id: row.id,
  adventureId: row.adventureId,
  userId: row.userId,
  emoji: row.emoji,
  createdAt: row.createdAt ?? new Date(),
});

const mapParticipants = async (
  adventureIds: string[],
): Promise<Map<string, AdventureParticipant[]>> => {
  if (adventureIds.length === 0) return new Map();
  const rows = await db
    .select({
      adventureId: adventureParticipants.adventureId,
      userId: adventureParticipants.userId,
      username: user.username,
    })
    .from(adventureParticipants)
    .innerJoin(user, eq(adventureParticipants.userId, user.id))
    .where(inArray(adventureParticipants.adventureId, adventureIds));

  const grouped = new Map<string, AdventureParticipant[]>();
  for (const row of rows) {
    const participant = toParticipant(row);
    if (!participant) continue;
    const list = grouped.get(row.adventureId) ?? [];
    list.push(participant);
    grouped.set(row.adventureId, list);
  }
  return grouped;
};

export const createPostgresAdventureStore = (): AdventureStore => {
  return {
    async createAdventure(adventure, participants) {
      await db.transaction(async (tx) => {
        await tx.insert(adventures).values({
          id: adventure.id,
          creatorId: adventure.creator.id,
          title: adventure.title,
          description: adventure.description,
          status: adventure.status,
          summary: adventure.summary ?? null,
          shareToken: adventure.shareToken,
          startsAt: adventure.startsAt,
          createdAt: adventure.createdAt,
          updatedAt: adventure.updatedAt,
        });

        if (participants.length) {
          await tx.insert(adventureParticipants).values(
            participants.map((participant) => ({
              adventureId: adventure.id,
              userId: participant.id,
            })),
          );
        }
      });

      const base =
        (await db.query.adventures.findFirst({
          where: eq(adventures.id, adventure.id),
        })) ?? null;

      const mappedParticipants = await mapParticipants([adventure.id]);
      if (!base) {
        return toAdventure(
          {
            id: adventure.id,
            creatorId: adventure.creator.id,
            title: adventure.title,
            description: adventure.description,
            status: adventure.status,
            summary: adventure.summary ?? null,
            shareToken: adventure.shareToken,
            startsAt: adventure.startsAt,
            createdAt: adventure.createdAt,
            updatedAt: adventure.updatedAt,
          },
          mappedParticipants.get(adventure.id) ?? [],
        );
      }
      return toAdventure(base, mappedParticipants.get(adventure.id) ?? []);
    },

    async updateAdventure(adventure) {
      const [updated] = await db
        .update(adventures)
        .set({
          title: adventure.title,
          description: adventure.description,
          status: adventure.status,
          summary: adventure.summary ?? null,
          startsAt: adventure.startsAt,
          updatedAt: adventure.updatedAt,
        })
        .where(eq(adventures.id, adventure.id))
        .returning();
      if (!updated) return null;

      const participants = await mapParticipants([adventure.id]);
      return toAdventure(updated, participants.get(adventure.id) ?? []);
    },

    async findById(id) {
      const base =
        (await db.query.adventures.findFirst({
          where: eq(adventures.id, id),
        })) ?? null;
      if (!base) return null;
      const participants = await mapParticipants([base.id]);
      return toAdventure(base, participants.get(base.id) ?? []);
    },

    async findByShareToken(token) {
      const base =
        (await db.query.adventures.findFirst({
          where: eq(adventures.shareToken, token),
        })) ?? null;
      if (!base) return null;
      const participants = await mapParticipants([base.id]);
      return toAdventure(base, participants.get(base.id) ?? []);
    },

    async listByStatus(userId, status) {
      const rows = await db
        .select({ adventure: adventures })
        .from(adventures)
        .innerJoin(
          adventureParticipants,
          eq(adventureParticipants.adventureId, adventures.id),
        )
        .where(
          and(
            eq(adventures.status, status),
            eq(adventureParticipants.userId, userId),
          ),
        );

      const bases = rows.map((row) => row.adventure);
      const ids = [...new Set(bases.map((b) => b.id))];
      const participants = await mapParticipants(ids);

      return bases.map((base) =>
        toAdventure(base, participants.get(base.id) ?? []),
      );
    },

    async listParticipants(adventureId) {
      const participants = await mapParticipants([adventureId]);
      const list = participants.get(adventureId);
      return list ? [...list] : null;
    },

    async addParticipant(adventureId, participant) {
      const adventure = await db.query.adventures.findFirst({
        where: eq(adventures.id, adventureId),
      });
      if (!adventure) return null;

      await db
        .insert(adventureParticipants)
        .values({ adventureId, userId: participant.id })
        .onConflictDoNothing();

      const participants = await mapParticipants([adventureId]);
      return toAdventure(adventure, participants.get(adventureId) ?? []);
    },

    async createPhoto(photo) {
      const exists = await db.query.adventures.findFirst({
        where: eq(adventures.id, photo.adventureId),
      });
      if (!exists) return null;

      const [created] = await db
        .insert(adventurePhotos)
        .values({
          id: photo.id,
          adventureId: photo.adventureId,
          uploaderId: photo.uploader.id,
          url: photo.url,
          caption: photo.caption ?? null,
          createdAt: photo.createdAt,
        })
        .returning({
          id: adventurePhotos.id,
          adventureId: adventurePhotos.adventureId,
          uploaderId: adventurePhotos.uploaderId,
          url: adventurePhotos.url,
          caption: adventurePhotos.caption,
          createdAt: adventurePhotos.createdAt,
        });

      const uploader = await db.query.user.findFirst({
        where: eq(user.id, photo.uploader.id),
      });

      return toPhoto(
        { ...created, uploaderName: uploader?.username ?? null },
        photo.uploader.id,
      );
    },

    async listPhotos(adventureId) {
      const adventure = await db.query.adventures.findFirst({
        where: eq(adventures.id, adventureId),
      });
      if (!adventure) return null;

      const rows = await db
        .select({
          id: adventurePhotos.id,
          adventureId: adventurePhotos.adventureId,
          uploaderId: adventurePhotos.uploaderId,
          url: adventurePhotos.url,
          caption: adventurePhotos.caption,
          createdAt: adventurePhotos.createdAt,
          uploaderName: user.username,
        })
        .from(adventurePhotos)
        .leftJoin(user, eq(user.id, adventurePhotos.uploaderId))
        .where(eq(adventurePhotos.adventureId, adventureId));

      return rows.map((row) => toPhoto(row, row.uploaderId));
    },

    async deletePhoto(adventureId, photoId) {
      const [deleted] = await db
        .delete(adventurePhotos)
        .where(
          and(
            eq(adventurePhotos.id, photoId),
            eq(adventurePhotos.adventureId, adventureId),
          ),
        )
        .returning({ id: adventurePhotos.id });
      return Boolean(deleted);
    },

    async addReaction(reaction) {
      const adventure = await db.query.adventures.findFirst({
        where: eq(adventures.id, reaction.adventureId),
      });
      if (!adventure) return null;

      const id = reaction.id ?? randomUUID();
      const result = await db.transaction(async (tx) => {
        await tx
          .delete(adventureReactions)
          .where(
            and(
              eq(adventureReactions.adventureId, reaction.adventureId),
              eq(adventureReactions.userId, reaction.userId),
            ),
          );

        const [created] = await tx
          .insert(adventureReactions)
          .values({
            id,
            adventureId: reaction.adventureId,
            userId: reaction.userId,
            emoji: reaction.emoji,
            createdAt: reaction.createdAt,
          })
          .returning();

        return created;
      });

      return result ? toReaction(result) : null;
    },

    async removeReaction(adventureId, userId, emoji) {
      const [deleted] = await db
        .delete(adventureReactions)
        .where(
          and(
            eq(adventureReactions.adventureId, adventureId),
            eq(adventureReactions.userId, userId),
            eq(adventureReactions.emoji, emoji),
          ),
        )
        .returning({ id: adventureReactions.id });
      return Boolean(deleted);
    },

    async listReactions(adventureId) {
      const adventure = await db.query.adventures.findFirst({
        where: eq(adventures.id, adventureId),
      });
      if (!adventure) return null;

      const rows = await db
        .select()
        .from(adventureReactions)
        .where(eq(adventureReactions.adventureId, adventureId));

      return rows.map(toReaction);
    },
  };
};
