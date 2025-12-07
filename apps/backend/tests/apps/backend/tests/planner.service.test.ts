import { describe, expect, it } from "bun:test";

import { createPlannerService } from "@acme/backend/services/planner.service";

const windowOf = (startIso: string, minutes: number) => {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  return { start, end } as const;
};

const recurrenceNone = { type: "none" as const };

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

  it("exports calendar with events, todos and habits", async () => {
    const planner = createPlannerService();
    const userId = "u2";

    await planner.createEvent(userId, {
      title: "Meeting",
      description: "Discuss roadmap",
      window: windowOf("2024-01-01T10:00:00Z", 60),
      recurrence: recurrenceNone,
    });

    await planner.createTodo(userId, {
      title: "Ship feature",
      due: windowOf("2024-01-02T09:00:00Z", 30),
      recurrence: recurrenceNone,
    });

    await planner.createHabit(userId, {
      title: "Stretch",
      cadence: { period: "day", target: 1 },
    });

    const ics = await planner.exportCalendar(userId);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Meeting");
    expect(ics).toContain("Ship feature");
    expect(ics).toContain("Stretch");
  });

  it("normalizes reversed windows when exporting ICS", async () => {
    const planner = createPlannerService();
    const userId = "u2-ics";
    await planner.createEvent(userId, {
      title: "Reverse",
      window: {
        start: new Date("2024-01-01T12:00:00Z"),
        end: new Date("2024-01-01T10:00:00Z"),
      },
      recurrence: recurrenceNone,
    });

    const ics = await planner.exportCalendar(userId);
    const lines = ics.split(/\r?\n/);
    const startLine = lines
      .find((line) => line.startsWith("DTSTART:"))
      ?.replace("DTSTART:", "");
    const endLine = lines
      .find((line) => line.startsWith("DTEND:"))
      ?.replace("DTEND:", "");

    expect(startLine && endLine).toBeTruthy();
    const toDate = (value: string) => {
      const [, y, m, d, hh, mm, ss] =
        value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/) ?? [];
      return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
    };

    const start = toDate(startLine!);
    const end = toDate(endLine!);
    expect(start.getTime()).toBeLessThan(end.getTime());
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

  it("filters events by range and normalizes event window", async () => {
    const planner = createPlannerService();
    const userId = "u5";
    await planner.createEvent(userId, {
      title: "Inside",
      window: {
        start: new Date("2024-01-02T10:00:00Z"),
        end: new Date("2024-01-02T09:00:00Z"),
      },
      recurrence: recurrenceNone,
    });
    await planner.createEvent(userId, {
      title: "Outside",
      window: windowOf("2024-02-01T10:00:00Z", 60),
      recurrence: recurrenceNone,
    });

    const events = await planner.listEvents(userId, {
      from: new Date("2024-01-01T00:00:00Z"),
      to: new Date("2024-01-10T00:00:00Z"),
    });

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Inside");
    expect(events[0].window.start.getTime()).toBeLessThan(
      events[0].window.end.getTime(),
    );
  });

  it("updates todo status and returns null when not found", async () => {
    const planner = createPlannerService();
    const userId = "u6";
    const todo = await planner.createTodo(userId, {
      title: "Task",
      recurrence: recurrenceNone,
    });

    const updated = await planner.updateTodo(userId, todo.id, {
      status: "completed",
    });
    expect(updated?.status).toBe("completed");

    const missing = await planner.updateTodo(userId, "missing", {
      status: "completed",
    });
    expect(missing).toBeNull();
  });

  it("deletes habit and returns false when missing", async () => {
    const planner = createPlannerService();
    const userId = "u7";
    const habit = await planner.createHabit(userId, {
      title: "Read",
      cadence: { period: "day", target: 1 },
    });

    const deleted = await planner.deleteHabit(userId, habit.id);
    expect(deleted).toBe(true);
    const missing = await planner.deleteHabit(userId, habit.id);
    expect(missing).toBe(false);
  });

  it("merges profile updates and reminder defaults", async () => {
    const planner = createPlannerService();
    const userId = "u8";

    const updated = await planner.updateProfile(userId, {
      onboardingState: "completed",
      defaultReminders: { event: { minutesBefore: 5 } },
    });

    expect(updated.onboardingState).toBe("completed");
    expect(updated.defaultReminders.event.minutesBefore).toBe(5);
    expect(updated.defaultReminders.todo.minutesBefore).toBe(15);
  });

  it("builds plan page with fallback windows for todos and habits", async () => {
    const planner = createPlannerService();
    const userId = "u9";
    await planner.createTodo(userId, {
      title: "Todo",
      recurrence: recurrenceNone,
    });
    await planner.createHabit(userId, {
      title: "Habit",
      cadence: { period: "week", target: 3 },
    });

    const plan = await planner.getPlanPage(userId, {
      from: new Date("2024-03-01T00:00:00Z"),
      to: new Date("2024-03-02T00:00:00Z"),
    });

    expect(plan.items.length).toBeGreaterThanOrEqual(2);
    plan.items.forEach((item) => {
      expect(item.window.start).toBeInstanceOf(Date);
      expect(item.window.end).toBeInstanceOf(Date);
    });
  });
});
