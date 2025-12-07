import { describe, expect, it } from "bun:test";

import { createPlannerService } from "@acme/backend/services/planner.service";

const windowOf = (startIso: string, minutes: number) => {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  return { start, end } as const;
};

describe("planner service", () => {
  it("prioritizes tasks by importance and effort", async () => {
    const planner = createPlannerService();
    const response = await planner.prioritizeTasks("u1", {
      tasks: [
        {
          id: "important",
          type: "todo",
          title: "Big deliverable",
          importance: 5,
          effortMinutes: 120,
        },
        {
          id: "later",
          type: "todo",
          title: "Minor clean-up",
          importance: 2,
          effortMinutes: 15,
        },
      ],
    });

    expect(response.recommendations).toHaveLength(2);
    expect(response.recommendations[0].id).toBe("important");
    expect(response.recommendations[0].rank).toBe(1);
    expect(response.recommendations[1].rank).toBe(2);
  });

  it("prioritizes lower effort when other factors equal", async () => {
    const planner = createPlannerService();
    const now = new Date();
    const window = windowOf(now.toISOString(), 30);

    const response = await planner.prioritizeTasks("u1", {
      tasks: [
        {
          id: "heavy",
          type: "todo",
          title: "Heavy",
          importance: 3,
          effortMinutes: 300,
          window,
        },
        {
          id: "light",
          type: "todo",
          title: "Light",
          importance: 3,
          effortMinutes: 20,
          window,
        },
      ],
    });

    expect(response.recommendations[0].id).toBe("light");
  });

  it("creates invite, accepts it and lists friends", async () => {
    process.env.APP_BASE_URL = "https://inv.test";
    const planner = createPlannerService();

    const invite = await planner.createFriendInvite("u1");
    expect(invite.url).toContain(invite.code);

    const accepted = await planner.acceptFriendInvite("u1", invite.code);
    expect(accepted?.viaInviteCode).toBe(invite.code);

    const missing = await planner.acceptFriendInvite("u1", "nope");
    expect(missing).toBeNull();

    const friends = await planner.listFriends("u1");
    expect(friends.map((f) => f.id)).toContain(accepted?.id);
  });

  it("returns null when accepting missing invite code", async () => {
    const planner = createPlannerService();
    const result = await planner.acceptFriendInvite("u1", "missing-code");
    expect(result).toBeNull();
  });

  it("auto-picks first friends when crazy task called without explicit list", async () => {
    const planner = createPlannerService();
    const inviteA = await planner.createFriendInvite("u1");
    const inviteB = await planner.createFriendInvite("u1");
    const friendA = await planner.acceptFriendInvite("u1", inviteA.code);
    const friendB = await planner.acceptFriendInvite("u1", inviteB.code);

    const response = await planner.generateCrazyTask("u1", {
      mood: "adventure",
      locationHint: "park",
    });

    expect(response.task.friends.length).toBeGreaterThan(0);
    expect(response.task.friends).toContain(friendA?.id);
    expect(response.task.friends).toContain(friendB?.id);
  });

  it("generates crazy task with XP and friend bindings", async () => {
    const planner = createPlannerService();
    const invite = await planner.createFriendInvite("u1");
    const friend = await planner.acceptFriendInvite("u1", invite.code);

    const response = await planner.generateCrazyTask("u1", {
      friends: friend ? [friend.id] : undefined,
      mood: "ночной забег",
      locationHint: "центр",
    });

    expect(response.task.rewardXp).toBeGreaterThan(0);
    expect(response.task.title.length).toBeGreaterThan(3);
    if (friend) {
      expect(response.task.friends).toContain(friend.id);
    }
    expect(response.task.description).toContain("центр");
  });

  it("generates random tasks with mood and focus in description", async () => {
    const planner = createPlannerService();
    const response = await planner.generateRandomTasks("u3", {
      count: 2,
      mood: "веселье",
      focus: ["здоровье"],
    });

    expect(response.tasks).toHaveLength(2);
    expect(response.tasks[0].description).toContain("веселье");
  });

  it("defaults random tasks count to 3 when not provided", async () => {
    const planner = createPlannerService();
    const response = await planner.generateRandomTasks("u4", {});
    expect(response.tasks).toHaveLength(3);
  });

  it("updates todo status and returns null when not found", async () => {
    const planner = createPlannerService();
    const userId = "u6";
    const todo = await planner.createTodo(userId, {
      title: "Task",
    });

    const updated = await planner.updateTodo(userId, todo.id, {
      status: "in_progress",
    });
    expect(updated?.status).toBe("in_progress");

    const missing = await planner.updateTodo(userId, "missing", {
      status: "completed",
    });
    expect(missing).toBeNull();
  });

  it("updates crazy task status and returns null when missing", async () => {
    const planner = createPlannerService();
    const userId = "u10";
    const crazy = await planner.generateCrazyTask(userId, {
      mood: "wild",
    });

    const updated = await planner.updateCrazyTaskStatus(
      userId,
      crazy.task.id,
      "in_progress",
    );
    expect(updated?.status).toBe("in_progress");

    const missing = await planner.updateCrazyTaskStatus(
      userId,
      "missing",
      "completed",
    );
    expect(missing).toBeNull();
  });

  it("creates photo report and returns feed merged with friends", async () => {
    const planner = createPlannerService();
    const userId = "u11";
    const invite = await planner.createFriendInvite(userId);
    const friend = await planner.acceptFriendInvite(userId, invite.code);
    if (!friend) throw new Error("Friend expected");

    const ownReport = await planner.addPhotoReport(userId, {
      taskId: "task-own",
      taskType: "todo",
      imageUrl: "https://img/own.jpg",
      caption: "done",
    });

    await planner.addPhotoReport(friend.id, {
      taskId: "task-friend",
      taskType: "crazy",
      imageUrl: "https://img/friend.jpg",
      caption: "lol",
    });

    const feed = await planner.getFeed(userId);
    expect(feed.reports.length).toBeGreaterThanOrEqual(2);
    const ids = feed.reports.map((r) => r.id);
    expect(ids).toContain(ownReport.id);
    expect(feed.reports.some((r) => r.taskType === "crazy")).toBe(true);
  });
});
