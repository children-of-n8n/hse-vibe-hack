import { Elysia } from "elysia";

import { createAuthController } from "@acme/backend/controllers/auth.controller";
import { createPlannerController } from "@acme/backend/controllers/planner.controller";
import { createUserController } from "@acme/backend/controllers/user.controller";
import type {
  NewUser,
  User,
  UserRepository,
} from "@acme/backend/domain/users/user.repository";

// Легковесный in-memory репозиторий, чтобы тесты не трогали реальную БД.
export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findByUsername(username: string) {
    const user = [...this.users.values()].find(
      (entry) => entry.username === username,
    );
    return user ?? null;
  }

  async create(input: NewUser) {
    const now = new Date();
    const user: User = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...input,
    };

    this.users.set(user.id, user);
    return user;
  }
}

export const createTestApp = (users: InMemoryUserRepository) =>
  new Elysia().use([
    createAuthController({ users }),
    createUserController({ users }),
    createPlannerController({ users }),
  ]);

export const authJsonRequest = (path: string, body: unknown, cookie?: string) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

export const getRequest = (path: string, cookie?: string) =>
  new Request(`http://localhost${path}`, {
    headers: cookie ? { cookie } : undefined,
  });

export const extractAuthCookie = (response: Response) =>
  response.headers.get("set-cookie")?.split(";")[0] ?? "";
