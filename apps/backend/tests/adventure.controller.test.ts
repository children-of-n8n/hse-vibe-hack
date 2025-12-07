import { describe, expect, it } from "bun:test";

import {
  InMemoryUserRepository,
  authJsonRequest,
  createAdventureTestApp,
  extractAuthCookie,
  getRequest,
} from "./mocks";

describe("adventure controller", () => {
  const registerUser = async (app: any, username: string) => {
    const res = await app.handle(
      authJsonRequest("/auth/register", {
        username,
        password: "password123",
      }),
    );
    const cookie = extractAuthCookie(res);
    if (!cookie) {
      const body = await res.text();
      throw new Error(`Auth cookie expected, got ${res.status} ${body}`);
    }
    return cookie;
  };

  it("guards endpoints without auth", async () => {
    const app = createAdventureTestApp(new InMemoryUserRepository());
    const res = await app.handle(getRequest("/adventures/upcoming"));
    expect(res.status).toBe(401);
  });

  it("creates, completes and joins adventure, handles share token and participants", async () => {
    const users = new InMemoryUserRepository();
    const app = createAdventureTestApp(users);
    const cookieA = await registerUser(app, "alice");

    const createRes = await app.handle(
      authJsonRequest("/adventures", { title: "Ночное приключение" }, cookieA),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.shareToken).toMatch(/ADV-/);

    const upcomingRes = await app.handle(
      getRequest("/adventures/upcoming", cookieA),
    );
    expect(upcomingRes.status).toBe(200);
    const upcoming = await upcomingRes.json();
    expect(upcoming.adventures.length).toBeGreaterThan(0);

    const completeRes = await app.handle(
      authJsonRequest(`/adventures/${created.id}/complete`, {}, cookieA),
    );
    expect(completeRes.status).toBe(200);
    const completed = await completeRes.json();
    expect(completed.status).toBe("completed");

    const tokenRes = await app.handle(
      getRequest(`/adventures/${created.id}/share-token`, cookieA),
    );
    expect(tokenRes.status).toBe(200);
    const tokenPayload = await tokenRes.json();
    expect(tokenPayload.token).toBe(created.shareToken);

    const cookieB = await registerUser(app, "bob");
    const joinRes = await app.handle(
      authJsonRequest(`/adventures/join/${created.shareToken}`, {}, cookieB),
    );
    expect(joinRes.status).toBe(200);
    const joined = await joinRes.json();
    expect(joined.participants.length).toBe(2);

    const participantsRes = await app.handle(
      getRequest(`/adventures/${created.id}/participants`, cookieA),
    );
    expect(participantsRes.status).toBe(200);
    const participants = await participantsRes.json();
    expect(participants.participants.length).toBe(2);
  });

  it("signs upload, attaches photo and reactions", async () => {
    const users = new InMemoryUserRepository();
    const app = createAdventureTestApp(users);
    const cookie = await registerUser(app, "charlie");
    const adventureRes = await app.handle(
      authJsonRequest("/adventures", { title: "Фото" }, cookie),
    );
    const adventure = await adventureRes.json();

    const signRes = await app.handle(
      authJsonRequest(
        `/adventures/${adventure.id}/photos/sign`,
        { filename: "pic.png" },
        cookie,
      ),
    );
    expect(signRes.status).toBe(200);
    const signed = await signRes.json();
    expect(signed.uploadUrl).toContain("pic.png");

    const uploadRes = await app.handle(
      authJsonRequest(
        `/adventures/${adventure.id}/photos`,
        {
          photoUrl: signed.photoUrl,
          caption: "ready",
          contentType: "image/png",
        },
        cookie,
      ),
    );
    expect(uploadRes.status).toBe(201);
    const photo = await uploadRes.json();

    const reactionRes = await app.handle(
      authJsonRequest(
        `/adventures/photos/${photo.id}/reactions`,
        { emoji: "🔥" },
        cookie,
      ),
    );
    expect(reactionRes.status).toBe(201);

    const reactionsList = await app.handle(
      getRequest(`/adventures/photos/${photo.id}/reactions`, cookie),
    );
    expect(reactionsList.status).toBe(200);
    const reactions = await reactionsList.json();
    expect(reactions.reactions.length).toBe(1);
  });
});
