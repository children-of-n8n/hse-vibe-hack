import { describe, expect, it } from "bun:test";

import {
  InMemoryUserRepository,
  authJsonRequest,
  createTestApp,
  extractAuthCookie,
  getRequest,
} from "./mocks";

const register = async (app: any, username: string) => {
  const res = await app.handle(
    authJsonRequest("/auth/register", { username, password: "password123" }),
  );
  const cookie = extractAuthCookie(res);
  if (!cookie) {
    const body = await res.text();
    throw new Error(`No auth cookie: ${res.status} ${body}`);
  }
  return cookie;
};

describe("planner controller", () => {
  it("creates, updates and deletes todo", async () => {
    const users = new InMemoryUserRepository();
    const app = createTestApp(users);
    const cookie = await register(app, "planner");

    const createRes = await app.handle(
      authJsonRequest(
        "/planner/todos",
        { title: "Task", description: "desc" },
        cookie,
      ),
    );
    expect(createRes.status).toBe(201);
    const todo = await createRes.json();

    const listRes = await app.handle(getRequest("/planner/todos", cookie));
    expect(listRes.status).toBe(200);
    const todos = await listRes.json();
    expect(todos.length).toBe(1);

    const updateRes = await app.handle(
      new Request(`http://localhost/planner/todos/${todo.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({ status: "completed", title: "Task updated" }),
      }),
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.status).toBe("completed");

    const deleteRes = await app.handle(
      new Request(`http://localhost/planner/todos/${todo.id}`, {
        method: "DELETE",
        headers: { cookie },
      }),
    );
    expect(deleteRes.status).toBe(204);
  });

  it("returns random tasks and prioritization", async () => {
    const users = new InMemoryUserRepository();
    const app = createTestApp(users);
    const cookie = await register(app, "planner2");

    const randomRes = await app.handle(
      authJsonRequest("/planner/random-tasks", { count: 2 }, cookie),
    );
    expect(randomRes.status).toBe(200);
    const random = await randomRes.json();
    expect(random.tasks.length).toBe(2);

    const prioritizeRes = await app.handle(
      authJsonRequest(
        "/planner/prioritize",
        {
          tasks: [
            {
              id: crypto.randomUUID(),
              type: "todo",
              title: "A",
              importance: 5,
            },
            {
              id: crypto.randomUUID(),
              type: "todo",
              title: "B",
              importance: 1,
            },
          ],
        },
        cookie,
      ),
    );
    expect(prioritizeRes.status).toBe(200);
    const prioritized = await prioritizeRes.json();
    expect(prioritized.recommendations.length).toBe(2);
    expect(prioritized.recommendations[0].rank).toBe(1);
  });
});
