CREATE TYPE "public"."crazy_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."report_task_type" AS ENUM('todo', 'crazy', 'event', 'habit');--> statement-breakpoint
CREATE TYPE "public"."todo_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "planner_crazy_task_friends" (
	"task_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	CONSTRAINT "planner_crazy_task_friends_task_id_friend_id_pk" PRIMARY KEY("task_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "planner_crazy_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reward_xp" integer NOT NULL,
	"prompt_used" text,
	"status" "crazy_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_friends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"via_invite_code" text,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "planner_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "planner_photo_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"task_type" "report_task_type" NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
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
--> statement-breakpoint
ALTER TABLE "planner_crazy_task_friends" ADD CONSTRAINT "planner_crazy_task_friends_task_id_planner_crazy_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."planner_crazy_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_crazy_task_friends" ADD CONSTRAINT "planner_crazy_task_friends_friend_id_planner_friends_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."planner_friends"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_crazy_tasks" ADD CONSTRAINT "planner_crazy_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_friends" ADD CONSTRAINT "planner_friends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_invites" ADD CONSTRAINT "planner_invites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_photo_reports" ADD CONSTRAINT "planner_photo_reports_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_todos" ADD CONSTRAINT "planner_todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;