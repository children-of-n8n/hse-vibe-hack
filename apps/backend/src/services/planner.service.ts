import { randomUUID } from "node:crypto";

import type {
  PlannerCrazyTask,
  PlannerCrazyTaskRequest,
  PlannerCrazyTaskResponse,
  PlannerEvent,
  PlannerEventInput,
  PlannerEventUpdate,
  PlannerFriend,
  PlannerFriendInvite,
  PlannerHabit,
  PlannerHabitInput,
  PlannerHabitUpdate,
  PlannerOverviewResponse,
  PlannerPlanItem,
  PlannerPlanPageResponse,
  PlannerPrioritizeRequest,
  PlannerPrioritizeResponse,
  PlannerProfile,
  PlannerProfileUpdate,
  PlannerRandomTask,
  PlannerRandomTaskRequest,
  PlannerRandomTaskResponse,
  PlannerRangeQuery,
  PlannerReminder,
  PlannerTimeWindow,
  PlannerTodo,
  PlannerTodoInput,
  PlannerTodoUpdate,
} from "@acme/backend/controllers/contracts/planner.schemas";

type PlannerState = {
  events: PlannerEvent[];
  todos: PlannerTodo[];
  habits: PlannerHabit[];
  profile: PlannerProfile;
  friends: PlannerFriend[];
  invites: PlannerFriendInvite[];
};

const DEFAULT_PROFILE: PlannerProfile = {
  timezone: "UTC",
  onboardingState: "in_progress",
  defaultReminders: {
    event: { minutesBefore: 30 },
    todo: { minutesBefore: 15 },
    habit: { minutesBefore: 60 },
  },
  calendarExportEnabled: true,
};

const SUGGESTION_POOL: PlannerRandomTask[] = [
  {
    title: "Быстрый чек-лист по дому",
    description: "10 минут: проветрить, заправить кровать, выкинуть мусор",
    durationMinutes: 10,
    category: "дом",
  },
  {
    title: "Прогулка за вдохновением",
    description: "15 минут пешком без телефона, отмечаем интересные детали",
    durationMinutes: 15,
    category: "здоровье",
  },
  {
    title: "Микро-учеба",
    description: "15 минут на курс или статью по новой теме",
    durationMinutes: 15,
    category: "рост",
  },
  {
    title: "Фокус-сессия",
    description: "25 минут помидора на важную задачу",
    durationMinutes: 25,
    category: "работа",
  },
  {
    title: "Растяжка",
    description: "10 минут: шея, спина, ноги",
    durationMinutes: 10,
    category: "здоровье",
  },
  {
    title: "Соц-связь",
    description: "Написать другу или родителю, спросить как дела",
    durationMinutes: 5,
    category: "отношения",
  },
];

const normalizeWindow = (window: PlannerTimeWindow): PlannerTimeWindow => {
  const start = new Date(window.start);
  const end = new Date(window.end);

  if (end.getTime() < start.getTime()) {
    return { start: end, end: start };
  }

  return { start, end };
};

const windowOverlapsRange = (
  window: PlannerTimeWindow | undefined,
  range?: PlannerRangeQuery,
) => {
  if (!window) return true;
  if (!range) return true;

  const start = new Date(window.start);
  const end = new Date(window.end);

  if (range.from && end.getTime() < new Date(range.from).getTime()) {
    return false;
  }

  if (range.to && start.getTime() > new Date(range.to).getTime()) {
    return false;
  }

  return true;
};

const fallbackWindow = (range?: PlannerRangeQuery): PlannerTimeWindow => {
  const start = range?.from ? new Date(range.from) : new Date();
  const end = range?.to
    ? new Date(range.to)
    : new Date(start.getTime() + 60 * 60 * 1000);

  return normalizeWindow({ start, end });
};

const applyReminder = (
  reminder: PlannerReminder | undefined,
  fallback: PlannerReminder,
): PlannerReminder => reminder ?? fallback;

const buildPlanItem = (input: {
  referenceId: string;
  type: PlannerPlanItem["type"];
  title: string;
  window: PlannerTimeWindow;
  status?: PlannerPlanItem["status"];
  tags?: string[];
}): PlannerPlanItem => ({
  id: randomUUID(),
  referenceId: input.referenceId,
  type: input.type,
  title: input.title,
  window: input.window,
  status: input.status,
  tags: input.tags,
});

const formatDateForIcs = (date: Date) =>
  `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

const baseInviteUrl = process.env.APP_BASE_URL ?? "https://example.com";

export const createPlannerService = () => {
  const store = new Map<string, PlannerState>();

  const getState = (userId: string): PlannerState => {
    const existing = store.get(userId);
    if (existing) return existing;

    const initial: PlannerState = {
      events: [],
      todos: [],
      habits: [],
      profile: { ...DEFAULT_PROFILE },
      friends: [],
      invites: [],
    };

    store.set(userId, initial);
    return initial;
  };

  const listEvents = async (
    userId: string,
    range?: PlannerRangeQuery,
  ): Promise<PlannerEvent[]> => {
    const state = getState(userId);
    return state.events.filter((event) =>
      windowOverlapsRange(event.window, range),
    );
  };

  const createEvent = async (
    userId: string,
    input: PlannerEventInput,
  ): Promise<PlannerEvent> => {
    const state = getState(userId);
    const event: PlannerEvent = {
      id: randomUUID(),
      ...input,
      window: normalizeWindow(input.window),
      reminder: applyReminder(
        input.reminder,
        state.profile.defaultReminders.event,
      ),
    };

    state.events.push(event);
    return event;
  };

  const updateEvent = async (
    userId: string,
    id: string,
    patch: PlannerEventUpdate,
  ): Promise<PlannerEvent | null> => {
    const state = getState(userId);
    const index = state.events.findIndex((event) => event.id === id);

    if (index === -1) return null;

    const current = state.events[index];
    const updated: PlannerEvent = {
      ...current,
      ...patch,
      window: patch.window ? normalizeWindow(patch.window) : current.window,
      reminder: applyReminder(
        patch.reminder ?? current.reminder,
        state.profile.defaultReminders.event,
      ),
      recurrence: patch.recurrence ?? current.recurrence,
    };

    state.events[index] = updated;
    return updated;
  };

  const deleteEvent = async (userId: string, id: string): Promise<boolean> => {
    const state = getState(userId);
    const sizeBefore = state.events.length;
    state.events = state.events.filter((event) => event.id !== id);
    return sizeBefore !== state.events.length;
  };

  const listTodos = async (
    userId: string,
    range?: PlannerRangeQuery,
  ): Promise<PlannerTodo[]> => {
    const state = getState(userId);
    return state.todos.filter((todo) => windowOverlapsRange(todo.due, range));
  };

  const createTodo = async (
    userId: string,
    input: PlannerTodoInput,
  ): Promise<PlannerTodo> => {
    const state = getState(userId);
    const todo: PlannerTodo = {
      id: randomUUID(),
      ...input,
      due: input.due ? normalizeWindow(input.due) : undefined,
      reminder: applyReminder(
        input.reminder,
        state.profile.defaultReminders.todo,
      ),
      status: "pending",
    };

    state.todos.push(todo);
    return todo;
  };

  const updateTodo = async (
    userId: string,
    id: string,
    patch: PlannerTodoUpdate,
  ): Promise<PlannerTodo | null> => {
    const state = getState(userId);
    const index = state.todos.findIndex((todo) => todo.id === id);

    if (index === -1) return null;

    const current = state.todos[index];
    const updated: PlannerTodo = {
      ...current,
      ...patch,
      due: patch.due ? normalizeWindow(patch.due) : current.due,
      reminder: applyReminder(
        patch.reminder ?? current.reminder,
        state.profile.defaultReminders.todo,
      ),
      recurrence: patch.recurrence ?? current.recurrence,
      status: patch.status ?? current.status,
    };

    state.todos[index] = updated;
    return updated;
  };

  const deleteTodo = async (userId: string, id: string): Promise<boolean> => {
    const state = getState(userId);
    const sizeBefore = state.todos.length;
    state.todos = state.todos.filter((todo) => todo.id !== id);
    return sizeBefore !== state.todos.length;
  };

  const listHabits = async (userId: string): Promise<PlannerHabit[]> => {
    const state = getState(userId);
    return state.habits;
  };

  const createHabit = async (
    userId: string,
    input: PlannerHabitInput,
  ): Promise<PlannerHabit> => {
    const state = getState(userId);
    const habit: PlannerHabit = {
      id: randomUUID(),
      ...input,
      reminder: applyReminder(
        input.reminder,
        state.profile.defaultReminders.habit,
      ),
      streak: 0,
      progress: 0,
    };

    state.habits.push(habit);
    return habit;
  };

  const updateHabit = async (
    userId: string,
    id: string,
    patch: PlannerHabitUpdate,
  ): Promise<PlannerHabit | null> => {
    const state = getState(userId);
    const index = state.habits.findIndex((habit) => habit.id === id);

    if (index === -1) return null;

    const current = state.habits[index];
    const updated: PlannerHabit = {
      ...current,
      ...patch,
      reminder: applyReminder(
        patch.reminder ?? current.reminder,
        state.profile.defaultReminders.habit,
      ),
      cadence: patch.cadence ?? current.cadence,
    };

    state.habits[index] = updated;
    return updated;
  };

  const deleteHabit = async (userId: string, id: string): Promise<boolean> => {
    const state = getState(userId);
    const sizeBefore = state.habits.length;
    state.habits = state.habits.filter((habit) => habit.id !== id);
    return sizeBefore !== state.habits.length;
  };

  const getOverview = async (
    userId: string,
    range?: PlannerRangeQuery,
  ): Promise<PlannerOverviewResponse> => {
    const [events, todos, habits] = await Promise.all([
      listEvents(userId, range),
      listTodos(userId, range),
      listHabits(userId),
    ]);

    return { events, todos, habits };
  };

  const getPlanPage = async (
    userId: string,
    range?: PlannerRangeQuery,
  ): Promise<PlannerPlanPageResponse> => {
    const [events, todos, habits] = await Promise.all([
      listEvents(userId, range),
      listTodos(userId, range),
      listHabits(userId),
    ]);

    const items: PlannerPlanItem[] = [
      ...events.map((event) =>
        buildPlanItem({
          referenceId: event.id,
          type: "event",
          title: event.title,
          window: event.window,
          status: "pending",
          tags: event.tags,
        }),
      ),
      ...todos.map((todo) =>
        buildPlanItem({
          referenceId: todo.id,
          type: "todo",
          title: todo.title,
          window: todo.due ?? fallbackWindow(range),
          status: todo.status,
          tags: todo.tags,
        }),
      ),
      ...habits.map((habit) =>
        buildPlanItem({
          referenceId: habit.id,
          type: "habit",
          title: habit.title,
          window: fallbackWindow(range),
          status: "pending",
          tags: habit.tags,
        }),
      ),
    ]
      .filter((item) => windowOverlapsRange(item.window, range))
      .sort(
        (left, right) =>
          left.window.start.getTime() - right.window.start.getTime(),
      );

    return {
      range: { from: range?.from, to: range?.to },
      items,
    };
  };

  const getProfile = async (userId: string): Promise<PlannerProfile> =>
    getState(userId).profile;

  const updateProfile = async (
    userId: string,
    patch: PlannerProfileUpdate,
  ): Promise<PlannerProfile> => {
    const state = getState(userId);
    state.profile = {
      ...state.profile,
      ...patch,
      defaultReminders: {
        ...state.profile.defaultReminders,
        ...patch.defaultReminders,
      },
    };

    return state.profile;
  };

  const exportCalendar = async (
    userId: string,
    range?: PlannerRangeQuery,
  ): Promise<string> => {
    const overview = await getOverview(userId, range);
    const now = formatDateForIcs(new Date());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//acme/hse-vibe-hack//planner//EN",
    ];

    const addEvent = (
      title: string,
      window: PlannerTimeWindow,
      description?: string,
    ) => {
      const normalized = normalizeWindow(window);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${randomUUID()}`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatDateForIcs(normalized.start)}`,
        `DTEND:${formatDateForIcs(normalized.end)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description ?? ""}`,
        "END:VEVENT",
      );
    };

    overview.events.forEach((event: PlannerEvent) => {
      addEvent(event.title, event.window);
    });
    overview.todos.forEach((todo: PlannerTodo) => {
      const window = todo.due ?? fallbackWindow(range);
      addEvent(todo.title, window, todo.description);
    });
    overview.habits.forEach((habit: PlannerHabit) => {
      const window = fallbackWindow(range);
      addEvent(habit.title, window, habit.description);
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  };

  const generateRandomTasks = async (
    _userId: string,
    request: PlannerRandomTaskRequest,
  ): Promise<PlannerRandomTaskResponse> => {
    const count = request.count ?? 3;
    const shuffled = [...SUGGESTION_POOL].sort(() => Math.random() - 0.5);
    const tasks = shuffled.slice(0, count).map((task) => {
      const suggestedWindow = request.range
        ? normalizeWindow(request.range)
        : undefined;

      if (!request.mood && !request.focus) {
        return { ...task, suggestedWindow };
      }

      const descriptionParts = [task.description];
      if (request.mood) {
        descriptionParts.push(`Под настроение: ${request.mood}`);
      }
      if (request.focus?.length) {
        descriptionParts.push(`Фокус: ${request.focus.join(", ")}`);
      }

      return {
        ...task,
        suggestedWindow,
        description: descriptionParts.filter(Boolean).join(". "),
      } satisfies PlannerRandomTask;
    });

    return { tasks };
  };

  const prioritizeTasks = async (
    _userId: string,
    request: PlannerPrioritizeRequest,
  ): Promise<PlannerPrioritizeResponse> => {
    type PrioritizeTask = PlannerPrioritizeRequest["tasks"][number];
    const score = (task: PrioritizeTask) => {
      const importance = task.importance ?? 3;
      const effort = task.effortMinutes ?? 30;
      const due = task.window?.start
        ? new Date(task.window.start).getTime()
        : Date.now() + 24 * 60 * 60 * 1000;

      return importance * 3 + Math.max(0, 720 - effort) / 100 + 1 / due;
    };

    const sorted = [...request.tasks].sort(
      (left, right) => score(right) - score(left),
    );

    const recommendations = sorted.map((task, index) => ({
      id: task.id,
      type: task.type,
      rank: index + 1,
      score: Math.max(0.1, Math.min(1, 1 - index * 0.08)),
      reason:
        task.importance && task.importance >= 4
          ? "Высокая важность"
          : "Балансируем по важности и усилиям",
    }));

    return { recommendations };
  };

  const createFriendInvite = async (
    userId: string,
  ): Promise<PlannerFriendInvite> => {
    const state = getState(userId);
    const code = randomUUID().replace(/-/g, "").slice(0, 10);
    const invite: PlannerFriendInvite = {
      code,
      url: `${baseInviteUrl}/invite/${code}`,
      createdAt: new Date(),
      expiresAt: undefined,
    };

    state.invites.push(invite);
    return invite;
  };

  const acceptFriendInvite = async (
    userId: string,
    code: string,
  ): Promise<PlannerFriend | null> => {
    const state = getState(userId);
    const invite = state.invites.find((item) => item.code === code);

    if (!invite) return null;

    const friend: PlannerFriend = {
      id: randomUUID(),
      name: `Friend ${code.slice(0, 4)}`,
      connectedAt: new Date(),
      viaInviteCode: code,
    };

    state.friends.push(friend);
    return friend;
  };

  const listFriends = async (userId: string): Promise<PlannerFriend[]> => {
    const state = getState(userId);
    return state.friends;
  };

  const generateCrazyTask = async (
    userId: string,
    request: PlannerCrazyTaskRequest,
  ): Promise<PlannerCrazyTaskResponse> => {
    const state = getState(userId);
    const targetFriends = request.friends?.length
      ? state.friends.filter((friend) => request.friends?.includes(friend.id))
      : state.friends.slice(0, 2);

    const rewardXp = 50 + Math.floor(Math.random() * 120);

    const title = "Безумный поход за яблочным соком";
    const description = request.locationHint?.length
      ? `В ${request.locationHint} вместе с друзьями ${targetFriends
          .map((friend) => friend.name)
          .join(", ")}`
      : "Стартуем ночью за 4 км и берем сок по пути";

    const task: PlannerCrazyTask = {
      title,
      description,
      rewardXp,
      friends: targetFriends.map((friend) => friend.id),
      promptUsed:
        request.mood ?? "late-night adventurous juice run with friends",
    };

    return { task };
  };

  return {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    listTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    listHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    getOverview,
    getPlanPage,
    getProfile,
    updateProfile,
    exportCalendar,
    generateRandomTasks,
    prioritizeTasks,
    createFriendInvite,
    acceptFriendInvite,
    listFriends,
    generateCrazyTask,
  };
};
