import { describe, expect, it } from "bun:test";

import { passwordHasher } from "@acme/backend/shared/password";

import {
  InMemoryUserRepository,
  authJsonRequest,
  createTestApp,
  extractAuthCookie,
  getRequest,
} from "./mocks";

describe("auth controller", () => {
  it("registers a user and sets auth cookie", async () => {
    const users = new InMemoryUserRepository();
    const app = createTestApp(users);

    const response = await app.handle(
      authJsonRequest("/auth/register", {
        username: "alice",
        password: "password123",
      }),
    );

    expect(response.status).toBe(204);
    expect(extractAuthCookie(response)).toContain("auth=");

    const created = await users.findByUsername("alice");
    expect(created?.username).toBe("alice");
  });

  it("returns conflict when registering duplicate username", async () => {
    const users = new InMemoryUserRepository();
    await users.create({
      username: "alice",
      password: await passwordHasher.hash("password123"),
    });
    const app = createTestApp(users);

    const response = await app.handle(
      authJsonRequest("/auth/register", {
        username: "alice",
        password: "password123",
      }),
    );

    expect(response.status).toBe(409);
  });

  it("logs in existing user and sets cookie", async () => {
    const users = new InMemoryUserRepository();
    await users.create({
      username: "bob",
      password: await passwordHasher.hash("hunter2"),
    });
    const app = createTestApp(users);

    const response = await app.handle(
      authJsonRequest("/auth/login", {
        username: "bob",
        password: "hunter2",
      }),
    );

    expect(response.status).toBe(204);
    expect(extractAuthCookie(response)).toContain("auth=");
  });

  it("rejects login with invalid credentials", async () => {
    const users = new InMemoryUserRepository();
    await users.create({
      username: "bob",
      password: await passwordHasher.hash("hunter2"),
    });
    const app = createTestApp(users);

    const response = await app.handle(
      authJsonRequest("/auth/login", {
        username: "bob",
        password: "wrong-password",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("clears auth cookie on logout", async () => {
    const users = new InMemoryUserRepository();
    const app = createTestApp(users);

    const registerResponse = await app.handle(
      authJsonRequest("/auth/register", {
        username: "charlie",
        password: "password123",
      }),
    );
    const authCookie = extractAuthCookie(registerResponse);

    const logoutResponse = await app.handle(
      authJsonRequest("/auth/logout", {}, authCookie),
    );

    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("users controller", () => {
  it("returns current user when auth cookie is valid", async () => {
    const users = new InMemoryUserRepository();
    const app = createTestApp(users);

    const registerResponse = await app.handle(
      authJsonRequest("/auth/register", {
        username: "diana",
        password: "password123",
      }),
    );
    const authCookie = extractAuthCookie(registerResponse);

    const response = await app.handle(getRequest("/users/me", authCookie));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.username).toBe("diana");
    expect(new Date(body.createdAt).getTime()).not.toBeNaN();
    expect(new Date(body.updatedAt).getTime()).not.toBeNaN();
  });

  it("returns unauthorized without auth cookie", async () => {
    const users = new InMemoryUserRepository();
    const app = createTestApp(users);

    const response = await app.handle(getRequest("/users/me"));

    expect(response.status).toBe(401);
  });
});
