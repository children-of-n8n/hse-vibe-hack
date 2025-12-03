import { Elysia } from "elysia";

import { authModel } from "@acme/backend/modules/auth";
import { jwt } from "@acme/backend/shared/jwt";

import { getUserById } from "../../../shared/service";

export const currentUser = new Elysia({ name: "users-me-current-user-macro" })
  .use([jwt, authModel])
  .macro("currentUser", {
    cookie: "AuthCookie",
    resolve: async ({ jwt, cookie, status }) => {
      const payload = await jwt.verify(cookie.auth.value);

      if (!payload || !payload.sub) {
        return status("Unauthorized");
      }

      const currentUser = await getUserById(payload.sub);

      if (!currentUser) {
        return status("Unauthorized");
      }

      return { currentUser };
    },
  });
