import { describe, expect, it } from "bun:test";

const getApp = async () => {
  process.env.NODE_ENV = "test";
  process.env.AUTO_MIGRATE = "false";
  process.env.DATABASE_URL ??=
    "postgres://postgres:postgres@localhost:5432/postgres";

  const { app } = await import("../src");
  return app;
};

describe("core", () => {
  it("health check", async () => {
    const app = await getApp();
    const response = await app
      .handle(new Request("http://localhost:3000/health"))
      .then((res) => res.text());

    expect(response).toBe("OK");
  });
});
