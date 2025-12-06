import { eq } from "drizzle-orm";

import { db } from "@acme/backend/db/client";

import type { NewUser, User, UserRepository } from "./user.repository";
import { user } from "./user.table";

export class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    return (await db.query.user.findFirst({ where: eq(user.id, id) })) ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (
      (await db.query.user.findFirst({ where: eq(user.username, username) })) ??
      null
    );
  }

  async create(input: NewUser): Promise<User> {
    const [record] = await db.insert(user).values(input).returning();
    return record;
  }
}
