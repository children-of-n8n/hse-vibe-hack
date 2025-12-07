import { Elysia, type Static, t } from "elysia";

export const plannerRangeQuerySchema = t.Object({
  from: t.Optional(t.Date({ description: "Start of range (inclusive)" })),
  to: t.Optional(t.Date({ description: "End of range (inclusive)" })),
});

export type PlannerRangeQuery = Static<typeof plannerRangeQuerySchema>;

export const plannerReminderSchema = t.Object({
  minutesBefore: t.Integer({
    minimum: 0,
    default: 30,
    description: "How many minutes before start to remind",
  }),
});

export type PlannerReminder = Static<typeof plannerReminderSchema>;

export const plannerTimeWindowSchema = t.Object({
  start: t.Date({ description: "UTC start" }),
  end: t.Date({ description: "UTC end" }),
});

export type PlannerTimeWindow = Static<typeof plannerTimeWindowSchema>;

export const plannerTodoInputSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 1024 })),
  due: t.Optional(plannerTimeWindowSchema),
  reminder: t.Optional(plannerReminderSchema),
  tags: t.Optional(t.Array(t.String({ maxLength: 32 }))),
});

export type PlannerTodoInput = Static<typeof plannerTodoInputSchema>;

export const plannerTodoSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: plannerTodoInputSchema.properties.title,
  description: plannerTodoInputSchema.properties.description,
  due: plannerTodoInputSchema.properties.due,
  reminder: plannerTodoInputSchema.properties.reminder,
  tags: plannerTodoInputSchema.properties.tags,
  status: t.Union([
    t.Literal("pending"),
    t.Literal("in_progress"),
    t.Literal("completed"),
  ]),
});

export type PlannerTodo = Static<typeof plannerTodoSchema>;

export const plannerTodoUpdateSchema = t.Intersect([
  t.Partial(plannerTodoInputSchema),
  t.Object({
    status: t.Optional(
      t.Union([
        t.Literal("pending"),
        t.Literal("in_progress"),
        t.Literal("completed"),
      ]),
    ),
  }),
]);

export type PlannerTodoUpdate = Static<typeof plannerTodoUpdateSchema>;

export const plannerRandomTaskRequestSchema = t.Object({
  count: t.Optional(t.Integer({ minimum: 1, maximum: 10, default: 3 })),
  mood: t.Optional(t.String({ maxLength: 64 })),
  focus: t.Optional(t.Array(t.String({ maxLength: 64 }))),
  range: t.Optional(plannerTimeWindowSchema),
});

export type PlannerRandomTaskRequest = Static<
  typeof plannerRandomTaskRequestSchema
>;

export const plannerRandomTaskSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 512 })),
  durationMinutes: t.Optional(t.Integer({ minimum: 5, maximum: 480 })),
  category: t.Optional(t.String({ maxLength: 64 })),
  suggestedWindow: t.Optional(plannerTimeWindowSchema),
});

export type PlannerRandomTask = Static<typeof plannerRandomTaskSchema>;

export const plannerRandomTaskResponseSchema = t.Object({
  tasks: t.Array(plannerRandomTaskSchema),
});

export type PlannerRandomTaskResponse = Static<
  typeof plannerRandomTaskResponseSchema
>;

export const plannerIdParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export type PlannerIdParams = Static<typeof plannerIdParamsSchema>;

const plannerPrioritizeTaskSchema = t.Object({
  id: t.String({ format: "uuid" }),
  type: t.Union([t.Literal("todo"), t.Literal("crazy")]),
  title: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 512 })),
  window: t.Optional(plannerTimeWindowSchema),
  effortMinutes: t.Optional(t.Integer({ minimum: 5, maximum: 480 })),
  importance: t.Optional(t.Integer({ minimum: 1, maximum: 5 })),
});

export const plannerPrioritizeRequestSchema = t.Object({
  tasks: t.Array(plannerPrioritizeTaskSchema, { minItems: 1 }),
  context: t.Optional(
    t.String({ maxLength: 1024, description: "Additional LLM context" }),
  ),
  mood: t.Optional(t.String({ maxLength: 64 })),
  focus: t.Optional(t.Array(t.String({ maxLength: 64 }))),
});

export const plannerPrioritizeResponseSchema = t.Object({
  recommendations: t.Array(
    t.Object({
      id: t.String({ format: "uuid" }),
      type: plannerPrioritizeTaskSchema.properties.type,
      rank: t.Integer({ minimum: 1 }),
      score: t.Number({ minimum: 0, maximum: 1 }),
      reason: t.String({ maxLength: 512 }),
    }),
  ),
});

export type PlannerPrioritizeRequest = Static<
  typeof plannerPrioritizeRequestSchema
>;
export type PlannerPrioritizeResponse = Static<
  typeof plannerPrioritizeResponseSchema
>;

export const plannerFriendSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String({ minLength: 1, maxLength: 64 }),
  connectedAt: t.Date(),
  viaInviteCode: t.Optional(t.String({ maxLength: 12 })),
});

export type PlannerFriend = Static<typeof plannerFriendSchema>;

export const plannerFriendInviteSchema = t.Object({
  code: t.String({ minLength: 6, maxLength: 32 }),
  url: t.String({ description: "Shareable invite link" }),
  createdAt: t.Date(),
  expiresAt: t.Optional(t.Date()),
});

export type PlannerFriendInvite = Static<typeof plannerFriendInviteSchema>;

export const plannerFriendInviteAcceptSchema = t.Object({
  code: t.String({ minLength: 6, maxLength: 32 }),
});

export type PlannerFriendInviteAccept = Static<
  typeof plannerFriendInviteAcceptSchema
>;

export const plannerFriendListResponseSchema = t.Object({
  friends: t.Array(plannerFriendSchema),
});

export type PlannerFriendListResponse = Static<
  typeof plannerFriendListResponseSchema
>;

export const plannerCrazyTaskRequestSchema = t.Object({
  friends: t.Optional(t.Array(t.String({ format: "uuid" }))),
  mood: t.Optional(t.String({ maxLength: 64 })),
  locationHint: t.Optional(t.String({ maxLength: 128 })),
});

export type PlannerCrazyTaskRequest = Static<
  typeof plannerCrazyTaskRequestSchema
>;

export const plannerCrazyTaskSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String({ minLength: 1, maxLength: 160 }),
  description: t.String({ minLength: 1, maxLength: 512 }),
  rewardXp: t.Integer({ minimum: 10, maximum: 1000 }),
  friends: t.Array(t.String({ format: "uuid" })),
  promptUsed: t.String({ maxLength: 256 }),
  status: t.Union([
    t.Literal("pending"),
    t.Literal("in_progress"),
    t.Literal("completed"),
  ]),
});

export type PlannerCrazyTask = Static<typeof plannerCrazyTaskSchema>;

export const plannerCrazyTaskResponseSchema = t.Object({
  task: plannerCrazyTaskSchema,
});

export type PlannerCrazyTaskResponse = Static<
  typeof plannerCrazyTaskResponseSchema
>;

export const plannerCrazyTaskStatusSchema = t.Object({
  status: t.Union([
    t.Literal("pending"),
    t.Literal("in_progress"),
    t.Literal("completed"),
  ]),
});

export type PlannerCrazyTaskStatus = Static<
  typeof plannerCrazyTaskStatusSchema
>;

export const plannerPhotoReportInputSchema = t.Object({
  taskId: t.String({ format: "uuid" }),
  taskType: t.Union([t.Literal("todo"), t.Literal("crazy")]),
  imageUrl: t.String({ format: "uri", maxLength: 512 }),
  caption: t.Optional(t.String({ maxLength: 280 })),
});

export type PlannerPhotoReportInput = Static<
  typeof plannerPhotoReportInputSchema
>;

export const plannerPhotoReportSchema = t.Object({
  id: t.String({ format: "uuid" }),
  authorId: t.String({ format: "uuid" }),
  taskId: plannerPhotoReportInputSchema.properties.taskId,
  taskType: plannerPhotoReportInputSchema.properties.taskType,
  imageUrl: plannerPhotoReportInputSchema.properties.imageUrl,
  caption: plannerPhotoReportInputSchema.properties.caption,
  createdAt: t.Date(),
});

export type PlannerPhotoReport = Static<typeof plannerPhotoReportSchema>;

export const plannerFeedResponseSchema = t.Object({
  reports: t.Array(plannerPhotoReportSchema),
});

export type PlannerFeedResponse = Static<typeof plannerFeedResponseSchema>;

export const plannerContracts = new Elysia({ name: "planner-contracts" }).model(
  {
    PlannerRangeQuery: plannerRangeQuerySchema,
    PlannerReminder: plannerReminderSchema,
    PlannerTimeWindow: plannerTimeWindowSchema,
    PlannerTodoInput: plannerTodoInputSchema,
    PlannerTodo: plannerTodoSchema,
    PlannerTodoUpdateBody: plannerTodoUpdateSchema,
    PlannerRandomTaskRequest: plannerRandomTaskRequestSchema,
    PlannerRandomTask: plannerRandomTaskSchema,
    PlannerRandomTaskResponse: plannerRandomTaskResponseSchema,
    PlannerIdParams: plannerIdParamsSchema,
    PlannerPrioritizeRequest: plannerPrioritizeRequestSchema,
    PlannerPrioritizeResponse: plannerPrioritizeResponseSchema,
    PlannerFriend: plannerFriendSchema,
    PlannerFriendInvite: plannerFriendInviteSchema,
    PlannerFriendInviteAccept: plannerFriendInviteAcceptSchema,
    PlannerFriendListResponse: plannerFriendListResponseSchema,
    PlannerCrazyTaskRequest: plannerCrazyTaskRequestSchema,
    PlannerCrazyTask: plannerCrazyTaskSchema,
    PlannerCrazyTaskResponse: plannerCrazyTaskResponseSchema,
    PlannerCrazyTaskStatus: plannerCrazyTaskStatusSchema,
    PlannerPhotoReportInput: plannerPhotoReportInputSchema,
    PlannerPhotoReport: plannerPhotoReportSchema,
    PlannerFeedResponse: plannerFeedResponseSchema,
  },
);
