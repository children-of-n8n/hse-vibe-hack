import { describe, expect, it } from "bun:test";

import {
  createInMemoryCache,
  createRedisCache,
} from "@acme/backend/shared/cache";

describe("cache helpers", () => {
  it("sets and gets in-memory cache with ttl", async () => {
    const cache = createInMemoryCache();
    await cache.set("key", "value", 1);
    expect(await cache.get("key")).toBe("value");
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(await cache.get("key")).toBeNull();
  });

  it("handles redis cache when server missing by falling back to errors", async () => {
    // This test does not require a live Redis, just verifies interface calls don't throw synchronously.
    const cache = createRedisCache("redis://localhost:0");
    await cache.set("k", { a: 1 }, 1).catch(() => {});
    await cache.get("k").catch(() => {});
    await cache.del("k").catch(() => {});
  });
});
