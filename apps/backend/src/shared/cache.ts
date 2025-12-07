import Redis from "ioredis";

type CacheEntry<T> = { value: T; expiresAt?: number };

export type CacheClient = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
};

export const createInMemoryCache = (): CacheClient => {
  const store = new Map<string, CacheEntry<unknown>>();

  const isExpired = (entry: CacheEntry<unknown>) =>
    entry.expiresAt !== undefined && entry.expiresAt < Date.now();

  return {
    async get<T>(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set<T>(key: string, value: T, ttlSeconds?: number) {
      const expiresAt =
        ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined;
      store.set(key, { value, expiresAt });
    },
    async del(key: string) {
      store.delete(key);
    },
  };
};

export const createRedisCache = (url: string): CacheClient => {
  const client = new Redis(url, {
    retryStrategy: () => null, // disable infinite retries in tests
  });
  client.on("error", (error) => {
    console.warn("[cache] redis error", error?.message);
  });

  return {
    async get<T>(key: string) {
      const raw = await client.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch (error) {
        console.error("Failed to parse redis cache entry", error);
        return null;
      }
    },
    async set<T>(key: string, value: T, ttlSeconds?: number) {
      const payload = JSON.stringify(value);
      if (ttlSeconds !== undefined) {
        await client.set(key, payload, "EX", ttlSeconds);
      } else {
        await client.set(key, payload);
      }
    },
    async del(key: string) {
      await client.del(key);
    },
  };
};

export const createCacheFromEnv = (): CacheClient => {
  const isTest = process.env.NODE_ENV === "test";
  if (process.env.REDIS_URL && !isTest) {
    return createRedisCache(process.env.REDIS_URL);
  }
  return createInMemoryCache();
};

export const cache = createCacheFromEnv();
