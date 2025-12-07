import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../domain/users/user.table";

export const todoStatusEnum = pgEnum("todo_status", [
  "pending",
  "in_progress",
  "completed",
]);

export const plannerTodos = pgTable("planner_todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  title: text("title").notNull(),
  description: text("description"),
  dueStart: timestamp("due_start"),
  dueEnd: timestamp("due_end"),
  reminderMinutes: integer("reminder_minutes").notNull().default(15),
  tags: text("tags").array(),
  status: todoStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const plannerInvites = pgTable("planner_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const plannerFriends = pgTable("planner_friends", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  name: text("name").notNull(),
  viaInviteCode: text("via_invite_code"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export const crazyStatusEnum = pgEnum("crazy_status", [
  "pending",
  "in_progress",
  "completed",
]);

export const plannerCrazyTasks = pgTable("planner_crazy_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardXp: integer("reward_xp").notNull(),
  promptUsed: text("prompt_used"),
  status: crazyStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const plannerCrazyTaskFriends = pgTable(
  "planner_crazy_task_friends",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => plannerCrazyTasks.id, {
        onDelete: "cascade",
      }),
    friendId: uuid("friend_id")
      .notNull()
      .references(() => plannerFriends.id, {
        onDelete: "cascade",
      }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.taskId, table.friendId] }),
  }),
);

export const reportTaskTypeEnum = pgEnum("report_task_type", ["todo", "crazy"]);

export const plannerPhotoReports = pgTable("planner_photo_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => user.id, {
      onDelete: "cascade",
    }),
  taskId: uuid("task_id").notNull(),
  taskType: reportTaskTypeEnum("task_type").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export { user };
