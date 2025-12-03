import { Elysia, StatusMap, t } from "elysia";

import { authModel } from "../../shared/model";

export const authLogoutController = new Elysia({
  name: "auth-logout-controller",
  prefix: "/logout",
})
  .use([authModel])
  .post(
    "",
    async ({ set, cookie }) => {
      cookie.auth.remove();
      set.status = "No Content";
    },
    {
      cookie: "AuthCookie",
      detail: {
        summary: "Logout current user",
        description: "Clear authentication cookie",
      },
      response: {
        [StatusMap["No Content"]]: t.Void({
          description: "Logout success",
        }),
      },
    },
  );
