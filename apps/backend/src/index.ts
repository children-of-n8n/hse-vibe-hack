import { Elysia, InvertedStatusMap, redirect } from "elysia";

import { authController } from "@acme/backend/modules/auth";
import { usersController } from "@acme/backend/modules/users";
import { cors } from "@acme/backend/shared/cors";
import { openapi } from "@acme/backend/shared/openapi";

export const app = new Elysia()
  .onAfterResponse(({ set, request, route }) => {
    console.info(
      `${request.method} ${route} ${set.status} ${InvertedStatusMap[set.status as unknown as keyof typeof InvertedStatusMap]}`,
    );
  })
  .onError(({ code, error }) => {
    if (code === "UNKNOWN") {
      console.error(error);
    }
  })
  .use([cors, openapi, authController, usersController])
  .get("", redirect("/docs"))
  .listen(process.env.PORT ?? 3000);

console.log(`Listening at ${app.server!.url}`);
