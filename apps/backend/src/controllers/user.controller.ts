import { Elysia, StatusMap } from "elysia";

import type {
  User,
  UserRepository,
} from "@acme/backend/domain/users/user.repository";

import { userContracts } from "./contracts/user.schemas";
import { createCurrentUserMacro } from "./macros/current-user";

export const toUserResponse = (user: User) => ({
  id: user.id,
  username: user.username,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const createUserController = (deps: { users: UserRepository }) =>
  new Elysia({
    name: "users-controller",
    prefix: "/users",
    tags: ["Users"],
  })
    .use([userContracts, createCurrentUserMacro(deps.users)])
    .guard({
      currentUser: true,
    })
    .get("/me", async ({ currentUser }) => toUserResponse(currentUser), {
      response: {
        [StatusMap.OK]: "UserResponse",
      },
      detail: {
        summary: "Get current user",
        description: "Get authenticated user's information",
      },
    });
