import { describe, expect, it } from "bun:test";

import { createAdventureService } from "@acme/backend/services/adventure.service";
import { createInMemoryAdventureStore } from "@acme/backend/services/adventure.store";

import { InMemoryUserRepository } from "../../../mocks";

describe("adventure service", () => {
  it("creates adventure with share token and creator participant", async () => {
    const users = new InMemoryUserRepository();
    const creator = await users.create({
      username: "alice",
      password: "secret",
    });
    const service = createAdventureService({
      users,
      store: createInMemoryAdventureStore(),
    });

    const adventure = await service.createAdventure(creator.id, {
      title: "Ночное приключение",
    });

    expect(adventure.shareToken).toMatch(/ADV-/);
    expect(adventure.participants[0]?.id).toBe(creator.id);
    expect(adventure.status).toBe("upcoming");
    expect(adventure.creator.id).toBe(creator.id);
    expect(adventure.startsAt).toBeInstanceOf(Date);
  });

  it("joins by token and completes adventure", async () => {
    const users = new InMemoryUserRepository();
    const owner = await users.create({ username: "owner", password: "pwd" });
    const friend = await users.create({ username: "bob", password: "pwd" });
    const service = createAdventureService({
      users,
      store: createInMemoryAdventureStore(),
    });

    const adventure = await service.createAdventure(owner.id, {
      title: "Пешком за соком",
    });

    const joined = await service.joinByToken(friend.id, adventure.shareToken);
    expect(joined?.participants.some((p) => p.id === friend.id)).toBe(true);

    const completed = await service.completeAdventure(adventure.id);
    expect(completed?.status).toBe("completed");
  });

  it("returns null when joining invalid token and signing missing adventure", async () => {
    const users = new InMemoryUserRepository();
    const owner = await users.create({ username: "owner2", password: "pwd" });
    const service = createAdventureService({
      users,
      store: createInMemoryAdventureStore(),
    });

    const miss = await service.joinByToken(owner.id, "missing");
    expect(miss).toBeNull();

    const signed = await service.signPhotoUpload("missing", "file.png");
    expect(signed).toBeNull();
  });

  it("invalidates cached lists after status change", async () => {
    const users = new InMemoryUserRepository();
    const owner = await users.create({ username: "cache", password: "pwd" });
    const service = createAdventureService({
      users,
      store: createInMemoryAdventureStore(),
    });

    const adventure = await service.createAdventure(owner.id, {
      title: "Кеш-тест",
    });

    const first = await service.listByStatus(owner.id, "upcoming");
    expect(first.find((a) => a.id === adventure.id)).toBeDefined();

    await service.completeAdventure(adventure.id);
    const upcoming = await service.listByStatus(owner.id, "upcoming");
    expect(upcoming.find((a) => a.id === adventure.id)).toBeUndefined();

    const completed = await service.listByStatus(owner.id, "completed");
    expect(completed.find((a) => a.id === adventure.id)).toBeDefined();
  });

  it("uploads photo and manages reactions", async () => {
    const users = new InMemoryUserRepository();
    const owner = await users.create({ username: "owner", password: "pwd" });
    const service = createAdventureService({
      users,
      store: createInMemoryAdventureStore(),
    });
    const adventure = await service.createAdventure(owner.id, {
      title: "Фото-тест",
    });

    const signed = await service.signPhotoUpload(adventure.id, "image.jpg");
    expect(signed?.uploadUrl).toContain("image.jpg");

    const photo = await service.uploadPhoto(
      adventure.id,
      owner.id,
      "caption",
      signed?.photoUrl,
    );
    expect(photo?.adventureId).toBe(adventure.id);

    const reaction = await service.addReaction(photo?.id ?? "", owner.id, "🔥");
    expect(reaction?.emoji).toBe("🔥");

    const reactions = await service.listReactions(photo?.id ?? "");
    expect(reactions?.length).toBe(1);

    const removed = await service.removeReaction(
      photo?.id ?? "",
      owner.id,
      "🔥",
    );
    expect(removed).toBe(true);

    const deleted = await service.deletePhoto(adventure.id, photo?.id ?? "");
    expect(deleted).toBe(true);

    const reactionsAfterDelete = await service.listReactions(photo?.id ?? "");
    expect(reactionsAfterDelete).toBeNull();
  });

  it("returns null for missing adventure lookups", async () => {
    const users = new InMemoryUserRepository();
    const service = createAdventureService({
      users,
      store: createInMemoryAdventureStore(),
    });

    expect(await service.getById("missing")).toBeNull();
    expect(await service.listParticipants("missing")).toBeNull();
    expect(await service.listPhotos("missing")).toBeNull();
  });
});
