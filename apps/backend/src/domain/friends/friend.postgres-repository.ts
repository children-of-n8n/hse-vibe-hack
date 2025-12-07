import { eq } from "drizzle-orm";

import { db } from "@acme/backend/db/client";
import { plannerFriends } from "@acme/backend/db/schema";

import type { Friend, FriendRepository } from "./friend.repository";

export class PostgresFriendRepository implements FriendRepository {
  async listByUser(userId: string): Promise<Friend[]> {
    const rows = await db
      .select()
      .from(plannerFriends)
      .where(eq(plannerFriends.userId, userId));

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      avatarUrl: null,
    }));
  }
}
