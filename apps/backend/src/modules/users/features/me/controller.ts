import { Elysia, StatusMap } from "elysia";

import { usersModel } from "../../shared/model";
import { currentUser } from "./macros/current-user";

export const usersMeController = new Elysia({
  name: "users-me-controller",
  prefix: "/me",
})
  .use([usersModel, currentUser])
  .guard({
    currentUser: true,
  })
  .get("", async ({ currentUser }) => currentUser, {
    response: {
      [StatusMap.OK]: "UserResponse",
    },
    detail: {
      summary: "Get current user",
      description: "Get authenticated user's information",
    },
  });
