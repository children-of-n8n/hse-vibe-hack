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

export const plannerRecurrenceSchema = t.Object({
  type: t.Union([
    t.Literal("none"),
    t.Literal("daily"),
    t.Literal("weekly"),
    t.Literal("monthly"),
    t.Literal("custom"),
  ]),
  interval: t.Optional(
    t.Integer({ minimum: 1, default: 1, description: "Repeat every N" }),
  ),
  daysOfWeek: t.Optional(
    t.Array(t.Integer({ minimum: 0, maximum: 6 }), {
      maxItems: 7,
      description: "Repeat on these weekday numbers (0-6)",
    }),
  ),
  endsAt: t.Optional(t.Date({ description: "Recurrence end" })),
  occurrences: t.Optional(
    t.Integer({ minimum: 1, description: "Stop after N repeats" }),
  ),
});

export const plannerTimeWindowSchema = t.Object({
  start: t.Date({ description: "UTC start" }),
  end: t.Date({ description: "UTC end" }),
});

export type PlannerTimeWindow = Static<typeof plannerTimeWindowSchema>;

export const plannerEventInputSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 1024 })),
  window: plannerTimeWindowSchema,
  recurrence: plannerRecurrenceSchema,
  reminder: t.Optional(plannerReminderSchema),
  timezone: t.Optional(t.String({ maxLength: 64 })),
  tags: t.Optional(t.Array(t.String({ maxLength: 32 }))),
});

export type PlannerEventInput = Static<typeof plannerEventInputSchema>;

export const plannerEventSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: plannerEventInputSchema.properties.title,
  description: plannerEventInputSchema.properties.description,
  window: plannerTimeWindowSchema,
  recurrence: plannerRecurrenceSchema,
  reminder: plannerEventInputSchema.properties.reminder,
  timezone: plannerEventInputSchema.properties.timezone,
  tags: plannerEventInputSchema.properties.tags,
});

export type PlannerEvent = Static<typeof plannerEventSchema>;

export const plannerEventUpdateSchema = t.Partial(plannerEventInputSchema);

export type PlannerEventUpdate = Static<typeof plannerEventUpdateSchema>;

export const plannerTodoInputSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 1024 })),
  due: t.Optional(plannerTimeWindowSchema),
  recurrence: plannerRecurrenceSchema,
  reminder: t.Optional(plannerReminderSchema),
  sourceEventIds: t.Optional(
    t.Array(t.String({ format: "uuid" }), {
      description: "Events feeding this task",
    }),
  ),
  promotesHabit: t.Optional(
    t.Boolean({
      default: false,
      description: "If done repeatedly, convert to habit",
    }),
  ),
  tags: t.Optional(t.Array(t.String({ maxLength: 32 }))),
});

export type PlannerTodoInput = Static<typeof plannerTodoInputSchema>;

export const plannerTodoSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: plannerTodoInputSchema.properties.title,
  description: plannerTodoInputSchema.properties.description,
  due: plannerTodoInputSchema.properties.due,
  recurrence: plannerRecurrenceSchema,
  reminder: plannerTodoInputSchema.properties.reminder,
  sourceEventIds: plannerTodoInputSchema.properties.sourceEventIds,
  promotesHabit: plannerTodoInputSchema.properties.promotesHabit,
  tags: plannerTodoInputSchema.properties.tags,
  status: t.Union([t.Literal("pending"), t.Literal("completed")]),
});

export type PlannerTodo = Static<typeof plannerTodoSchema>;

export const plannerTodoUpdateSchema = t.Intersect([
  t.Partial(plannerTodoInputSchema),
  t.Object({
    status: t.Optional(t.Union([t.Literal("pending"), t.Literal("completed")])),
  }),
]);

export type PlannerTodoUpdate = Static<typeof plannerTodoUpdateSchema>;

export const plannerHabitCadenceSchema = t.Object({
  period: t.Union([t.Literal("day"), t.Literal("week"), t.Literal("month")]),
  target: t.Integer({ minimum: 1, default: 1 }),
  daysOfWeek: t.Optional(
    t.Array(t.Integer({ minimum: 0, maximum: 6 }), {
      description: "Days habit should be done",
    }),
  ),
});

export const plannerHabitInputSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 1024 })),
  cadence: plannerHabitCadenceSchema,
  reminder: t.Optional(plannerReminderSchema),
  sourceTodoIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
  sourceEventIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
  tags: t.Optional(t.Array(t.String({ maxLength: 32 }))),
});

export type PlannerHabitInput = Static<typeof plannerHabitInputSchema>;

export const plannerHabitSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: plannerHabitInputSchema.properties.title,
  description: plannerHabitInputSchema.properties.description,
  cadence: plannerHabitCadenceSchema,
  reminder: plannerHabitInputSchema.properties.reminder,
  sourceTodoIds: plannerHabitInputSchema.properties.sourceTodoIds,
  sourceEventIds: plannerHabitInputSchema.properties.sourceEventIds,
  tags: plannerHabitInputSchema.properties.tags,
  streak: t.Integer({ minimum: 0 }),
  progress: t.Integer({ minimum: 0 }),
});

export type PlannerHabit = Static<typeof plannerHabitSchema>;

export const plannerHabitUpdateSchema = t.Intersect([
  t.Partial(plannerHabitInputSchema),
  t.Object({
    streak: t.Optional(t.Integer({ minimum: 0 })),
    progress: t.Optional(t.Integer({ minimum: 0 })),
  }),
]);

export type PlannerHabitUpdate = Static<typeof plannerHabitUpdateSchema>;

export const plannerOverviewResponseSchema = t.Object({
  events: t.Array(plannerEventSchema),
  todos: t.Array(plannerTodoSchema),
  habits: t.Array(plannerHabitSchema),
});

export type PlannerOverviewResponse = Static<
  typeof plannerOverviewResponseSchema
>;

export const plannerPlanItemSchema = t.Object({
  id: t.String({ format: "uuid" }),
  referenceId: t.String({ format: "uuid" }),
  type: t.Union([t.Literal("event"), t.Literal("todo"), t.Literal("habit")]),
  title: t.String({ minLength: 1 }),
  window: plannerTimeWindowSchema,
  status: t.Optional(
    t.Union([
      t.Literal("pending"),
      t.Literal("completed"),
      t.Literal("skipped"),
    ]),
  ),
  tags: t.Optional(t.Array(t.String({ maxLength: 32 }))),
});

export type PlannerPlanItem = Static<typeof plannerPlanItemSchema>;

export const plannerPlanPageResponseSchema = t.Object({
  range: t.Object({ from: t.Optional(t.Date()), to: t.Optional(t.Date()) }),
  items: t.Array(plannerPlanItemSchema),
});

export type PlannerPlanPageResponse = Static<
  typeof plannerPlanPageResponseSchema
>;

export const plannerProfileSchema = t.Object({
  timezone: t.String({ default: "UTC" }),
  onboardingState: t.Union([
    t.Literal("not_started"),
    t.Literal("in_progress"),
    t.Literal("completed"),
  ]),
  defaultReminders: t.Object({
    event: plannerReminderSchema,
    todo: plannerReminderSchema,
    habit: plannerReminderSchema,
  }),
  calendarExportEnabled: t.Boolean({ default: true }),
});

export type PlannerProfile = Static<typeof plannerProfileSchema>;

export const plannerProfileUpdateSchema = t.Partial(plannerProfileSchema);

export type PlannerProfileUpdate = Static<typeof plannerProfileUpdateSchema>;

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

export const plannerCalendarExportSchema = t.String({
  description: "Generated iCalendar content",
});

export const plannerContracts = new Elysia({ name: "planner-contracts" }).model(
  {
    PlannerRangeQuery: plannerRangeQuerySchema,
    PlannerReminder: plannerReminderSchema,
    PlannerRecurrence: plannerRecurrenceSchema,
    PlannerTimeWindow: plannerTimeWindowSchema,
    PlannerEventInput: plannerEventInputSchema,
    PlannerEvent: plannerEventSchema,
    PlannerEventUpdateBody: plannerEventUpdateSchema,
    PlannerTodoInput: plannerTodoInputSchema,
    PlannerTodo: plannerTodoSchema,
    PlannerTodoUpdateBody: plannerTodoUpdateSchema,
    PlannerHabitInput: plannerHabitInputSchema,
    PlannerHabit: plannerHabitSchema,
    PlannerHabitUpdateBody: plannerHabitUpdateSchema,
    PlannerOverviewResponse: plannerOverviewResponseSchema,
    PlannerPlanItem: plannerPlanItemSchema,
    PlannerPlanPageResponse: plannerPlanPageResponseSchema,
    PlannerProfile: plannerProfileSchema,
    PlannerProfileUpdateBody: plannerProfileUpdateSchema,
    PlannerRandomTaskRequest: plannerRandomTaskRequestSchema,
    PlannerRandomTask: plannerRandomTaskSchema,
    PlannerRandomTaskResponse: plannerRandomTaskResponseSchema,
    PlannerIdParams: plannerIdParamsSchema,
    PlannerCalendarExport: plannerCalendarExportSchema,
  },
);
