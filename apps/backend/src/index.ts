import { Elysia, InvertedStatusMap, redirect } from "elysia";

import { createAuthController } from "@acme/backend/controllers/auth.controller";
import { createUserController } from "@acme/backend/controllers/user.controller";
import { runMigrationsIfNeeded } from "@acme/backend/db/migrate-on-start";
import { PostgresUserRepository } from "@acme/backend/domain/users/user.postgres-repository";
import { cors } from "@acme/backend/http/plugins/cors";
import { openapi } from "@acme/backend/http/plugins/openapi";

await runMigrationsIfNeeded();

const userRepository = new PostgresUserRepository();

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
  .use([
    cors,
    openapi,
    createAuthController({ users: userRepository }),
    createUserController({ users: userRepository }),
  ])
  .get("/health", () => "OK")
  .get("", redirect("/docs"))
  .listen(process.env?.PORT ?? 3000);

console.log(`Listening at ${app.server?.url}`);
