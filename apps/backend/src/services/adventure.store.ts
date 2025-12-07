import { randomUUID } from "node:crypto";

import type {
  Adventure,
  AdventureParticipant,
  AdventurePhoto,
  AdventureReaction,
  AdventureStatus,
} from "@acme/backend/controllers/contracts/adventure.schemas";

export interface AdventureStore {
  createAdventure(
    adventure: Adventure,
    participants: AdventureParticipant[],
  ): Promise<Adventure>;
  updateAdventure(adventure: Adventure): Promise<Adventure | null>;
  findById(id: string): Promise<Adventure | null>;
  findByShareToken(token: string): Promise<Adventure | null>;
  listByStatus(userId: string, status: AdventureStatus): Promise<Adventure[]>;
  listParticipants(adventureId: string): Promise<AdventureParticipant[] | null>;
  addParticipant(
    adventureId: string,
    participant: AdventureParticipant,
  ): Promise<Adventure | null>;
  createPhoto(photo: AdventurePhoto): Promise<AdventurePhoto | null>;
  listPhotos(adventureId: string): Promise<AdventurePhoto[] | null>;
  deletePhoto(adventureId: string, photoId: string): Promise<boolean>;
  addReaction(reaction: AdventureReaction): Promise<AdventureReaction | null>;
  removeReaction(
    adventureId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean>;
  listReactions(adventureId: string): Promise<AdventureReaction[] | null>;
}

export const createInMemoryAdventureStore = (
  now: () => Date = () => new Date(),
): AdventureStore => {
  const adventures = new Map<string, Adventure>();
  const photos = new Map<string, AdventurePhoto>();
  const reactions = new Map<string, AdventureReaction>();

  const cloneAdventure = (adv: Adventure) => ({ ...adv });

  return {
    async createAdventure(adventure, participants) {
      const stored: Adventure = {
        ...adventure,
        participants: [...participants],
      };
      adventures.set(adventure.id, stored);
      return cloneAdventure(stored);
    },

    async updateAdventure(adventure) {
      const existing = adventures.get(adventure.id);
      if (!existing) return null;
      adventures.set(adventure.id, { ...adventure });
      return cloneAdventure(adventure);
    },

    async findById(id) {
      const found = adventures.get(id);
      return found ? cloneAdventure(found) : null;
    },

    async findByShareToken(token) {
      const found = [...adventures.values()].find(
        (entry) => entry.shareToken === token,
      );
      return found ? cloneAdventure(found) : null;
    },

    async listByStatus(userId, status) {
      return [...adventures.values()]
        .filter(
          (adv) =>
            adv.status === status &&
            adv.participants.some((p) => p.id === userId),
        )
        .map(cloneAdventure);
    },

    async listParticipants(adventureId) {
      const adv = adventures.get(adventureId);
      return adv ? [...adv.participants] : null;
    },

    async addParticipant(adventureId, participant) {
      const adv = adventures.get(adventureId);
      if (!adv) return null;
      if (adv.participants.some((p) => p.id === participant.id))
        return cloneAdventure(adv);

      const updated: Adventure = {
        ...adv,
        participants: [...adv.participants, participant],
        updatedAt: now(),
      };
      adventures.set(adventureId, updated);
      return cloneAdventure(updated);
    },

    async createPhoto(photo) {
      const adv = adventures.get(photo.adventureId);
      if (!adv) return null;
      photos.set(photo.id, { ...photo });
      return { ...photo };
    },

    async listPhotos(adventureId) {
      const adv = adventures.get(adventureId);
      if (!adv) return null;
      return [...photos.values()]
        .filter((p) => p.adventureId === adventureId)
        .map((p) => ({ ...p }));
    },

    async deletePhoto(adventureId, photoId) {
      const photo = photos.get(photoId);
      if (!photo || photo.adventureId !== adventureId) return false;
      photos.delete(photoId);
      return true;
    },

    async addReaction(reaction) {
      const adventure = adventures.get(reaction.adventureId);
      if (!adventure) return null;

      for (const [id, entry] of [...reactions.entries()]) {
        if (
          entry.adventureId === reaction.adventureId &&
          entry.userId === reaction.userId
        ) {
          reactions.delete(id);
        }
      }

      const id = reaction.id ?? randomUUID();
      const stored: AdventureReaction = { ...reaction, id };
      reactions.set(id, stored);
      return { ...stored };
    },

    async removeReaction(adventureId, userId, emoji) {
      let removed = false;
      for (const [id, entry] of [...reactions.entries()]) {
        if (
          entry.adventureId === adventureId &&
          entry.userId === userId &&
          entry.emoji === emoji
        ) {
          reactions.delete(id);
          removed = true;
        }
      }
      return removed;
    },

    async listReactions(adventureId) {
      const adventure = adventures.get(adventureId);
      if (!adventure) return null;
      return [...reactions.values()]
        .filter((r) => r.adventureId === adventureId)
        .map((r) => ({ ...r }));
    },
  };
};
