--> statement-breakpoint
CREATE TYPE "todo_status" AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE "crazy_status" AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE "report_task_type" AS ENUM ('todo', 'crazy', 'event', 'habit');

CREATE TABLE "planner_todos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "description" text,
  "due_start" timestamp,
  "due_end" timestamp,
  "recurrence" jsonb,
  "reminder_minutes" integer DEFAULT 15 NOT NULL,
  "source_event_ids" text[],
  "promotes_habit" boolean DEFAULT false NOT NULL,
  "tags" text[],
  "status" "todo_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "planner_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "code" text UNIQUE NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);

CREATE TABLE "planner_friends" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "via_invite_code" text,
  "connected_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "planner_crazy_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "reward_xp" integer NOT NULL,
  "prompt_used" text,
  "status" "crazy_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "planner_crazy_task_friends" (
  "task_id" uuid NOT NULL REFERENCES "planner_crazy_tasks"("id") ON DELETE cascade,
  "friend_id" uuid NOT NULL REFERENCES "planner_friends"("id") ON DELETE cascade,
  CONSTRAINT "planner_crazy_task_friends_pk" PRIMARY KEY ("task_id", "friend_id")
);

CREATE TABLE "planner_photo_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "task_id" uuid NOT NULL,
  "task_type" "report_task_type" NOT NULL,
  "image_url" text NOT NULL,
  "caption" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
