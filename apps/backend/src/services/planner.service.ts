import { randomUUID } from "node:crypto";

import type {
  PlannerCrazyTask,
  PlannerCrazyTaskRequest,
  PlannerCrazyTaskResponse,
  PlannerCrazyTaskStatus,
  PlannerFeedResponse,
  PlannerFriend,
  PlannerFriendInvite,
  PlannerPhotoReport,
  PlannerPhotoReportInput,
  PlannerPrioritizeRequest,
  PlannerPrioritizeResponse,
  PlannerRandomTask,
  PlannerRandomTaskRequest,
  PlannerRandomTaskResponse,
  PlannerTodo,
  PlannerTodoInput,
  PlannerTodoUpdate,
} from "@acme/backend/controllers/contracts/planner.schemas";

type PlannerState = {
  todos: PlannerTodo[];
  friends: PlannerFriend[];
  invites: PlannerFriendInvite[];
  crazyTasks: PlannerCrazyTask[];
  photoReports: PlannerPhotoReport[];
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

const baseInviteUrl = process.env.APP_BASE_URL ?? "https://example.com";

export const createPlannerService = () => {
  const store = new Map<string, PlannerState>();

  const getState = (userId: string): PlannerState => {
    const existing = store.get(userId);
    if (existing) return existing;

    const initial: PlannerState = {
      todos: [],
      friends: [],
      invites: [],
      crazyTasks: [],
      photoReports: [],
    };

    store.set(userId, initial);
    return initial;
  };

  const getStateMaybe = (userId: string): PlannerState | undefined =>
    store.get(userId);

  const listTodos = async (userId: string): Promise<PlannerTodo[]> => {
    const state = getState(userId);
    return [...state.todos];
  };

  const createTodo = async (
    userId: string,
    input: PlannerTodoInput,
  ): Promise<PlannerTodo> => {
    const state = getState(userId);
    const todo: PlannerTodo = {
      id: randomUUID(),
      ...input,
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

  const generateRandomTasks = async (
    _userId: string,
    request: PlannerRandomTaskRequest,
  ): Promise<PlannerRandomTaskResponse> => {
    const count = request.count ?? 3;
    const shuffled = [...SUGGESTION_POOL].sort(() => Math.random() - 0.5);
    const tasks = shuffled.slice(0, count).map((task) => {
      if (!request.mood && !request.focus) {
        return { ...task };
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
      return importance * 3 + Math.max(0, 720 - effort) / 100;
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

  const addPhotoReport = async (
    userId: string,
    input: PlannerPhotoReportInput,
  ): Promise<PlannerPhotoReport> => {
    const state = getState(userId);
    const report: PlannerPhotoReport = {
      id: randomUUID(),
      authorId: userId,
      taskId: input.taskId,
      taskType: input.taskType,
      imageUrl: input.imageUrl,
      caption: input.caption,
      createdAt: new Date(),
    };

    state.photoReports.push(report);
    return report;
  };

  const getFeed = async (userId: string): Promise<PlannerFeedResponse> => {
    const state = getState(userId);
    const friendIds = state.friends.map((friend) => friend.id);
    const collectReports = (ownerId: string) =>
      getStateMaybe(ownerId)?.photoReports ?? [];

    const reports = [
      ...collectReports(userId),
      ...friendIds.flatMap((id) => collectReports(id)),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { reports };
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
      id: randomUUID(),
      title,
      description,
      rewardXp,
      friends: targetFriends.map((friend) => friend.id),
      promptUsed:
        request.mood ?? "late-night adventurous juice run with friends",
      status: "pending",
    };

    state.crazyTasks.push(task);
    return { task };
  };

  const updateCrazyTaskStatus = async (
    userId: string,
    taskId: string,
    status: PlannerCrazyTaskStatus["status"],
  ): Promise<PlannerCrazyTask | null> => {
    const state = getState(userId);
    const index = state.crazyTasks.findIndex((task) => task.id === taskId);
    if (index === -1) return null;

    state.crazyTasks[index] = { ...state.crazyTasks[index], status };
    return state.crazyTasks[index];
  };

  return {
    listTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    generateRandomTasks,
    prioritizeTasks,
    createFriendInvite,
    acceptFriendInvite,
    listFriends,
    generateCrazyTask,
    updateCrazyTaskStatus,
    addPhotoReport,
    getFeed,
  };
};
