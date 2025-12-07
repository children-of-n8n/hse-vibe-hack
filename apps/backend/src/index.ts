import { Elysia, InvertedStatusMap, redirect } from "elysia";

import { createAdventureController } from "@acme/backend/controllers/adventure.controller";
import { createAuthController } from "@acme/backend/controllers/auth.controller";
import { createUserController } from "@acme/backend/controllers/user.controller";
import { runMigrationsIfNeeded } from "@acme/backend/db/migrate-on-start";
import { PostgresFriendRepository } from "@acme/backend/domain/friends/friend.postgres-repository";
import { PostgresUserRepository } from "@acme/backend/domain/users/user.postgres-repository";
import { cors } from "@acme/backend/http/plugins/cors";
import { metrics } from "@acme/backend/http/plugins/metrics";
import { openapi } from "@acme/backend/http/plugins/openapi";
import { createPostgresAdventureStore } from "@acme/backend/services/adventure.store.postgres";
import { initTelemetry, shutdownTelemetry } from "@acme/backend/telemetry";

await runMigrationsIfNeeded();
await initTelemetry();

const userRepository = new PostgresUserRepository();
const adventureStore = createPostgresAdventureStore();
const friendRepository = new PostgresFriendRepository();

export const app = new Elysia()
  .onAfterResponse(({ set, request, route }) => {
    console.info(
      `${request.method} ${route} ${set.status} ${
        InvertedStatusMap[
          set.status as unknown as keyof typeof InvertedStatusMap
        ]
      }`,
    );
  })
  .onError(({ code, error }) => {
    if (code === "UNKNOWN") {
      console.error(error);
    }
  })
  .use([cors])
  .use([
    createAuthController({ users: userRepository }),
    createAdventureController({
      users: userRepository,
      store: adventureStore,
      friends: friendRepository,
    }),
    createUserController({ users: userRepository }),
  ])
  .use(metrics)
  .use(openapi)
  .get("/health", () => "OK")
  .get("", redirect("/docs"))
  .listen(process.env?.PORT ?? 3000);

console.log(`Listening at ${app.server?.url}`);

const stop = async () => {
  await shutdownTelemetry();
  await app.server?.stop();
};

process.on("SIGTERM", stop);
process.on("SIGINT", stop);
