import { Elysia, StatusMap, t } from "elysia";

import type { UserRepository } from "@acme/backend/domain/users/user.repository";
import { jwt } from "@acme/backend/http/plugins/jwt";

import {
  AuthConflictError,
  AuthUnauthorizedError,
  createAuthService,
} from "../services/auth.service";
import { authContracts } from "./contracts/auth.schemas";
import { createCurrentUserMacro } from "./macros/current-user";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 30 * 86400,
  path: "/",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
} as const;

export const createAuthController = (deps: { users: UserRepository }) => {
  const service = createAuthService(deps.users);

  return new Elysia({
    name: "auth-controller",
    prefix: "/auth",
    tags: ["Auth"],
  })
    .use([jwt, authContracts, createCurrentUserMacro(deps.users)])
    .post(
      "/register",
      async ({ set, jwt, body, cookie, status }) => {
        try {
          const user = await service.register(body);
          const token = await jwt.sign({ sub: user.id });

          cookie.auth.set({ ...AUTH_COOKIE_OPTIONS, value: token });
          set.status = "No Content";
        } catch (error) {
          if (error instanceof AuthConflictError) {
            return status("Conflict", error as unknown);
          }
          return status("Bad Request", error);
        }
      },
      {
        body: "AuthRegisterBody",
        cookie: "AuthCookieOptional",
        detail: {
          summary: "Register a new user",
          description:
            "Creates a new user account and sets authentication cookie",
          security: [],
        },
        response: {
          [StatusMap["No Content"]]: t.Void({
            description: "Register success",
          }),
          [StatusMap.Conflict]: t.Unknown({
            description: "User already exists",
          }),
          [StatusMap["Bad Request"]]: t.Unknown({
            description: "Unknown error",
          }),
        },
      },
    )
    .post(
      "/login",
      async ({ set, jwt, body, cookie, status }) => {
        try {
          const user = await service.login(body);
          const token = await jwt.sign({ sub: user.id });

          cookie.auth.set({ ...AUTH_COOKIE_OPTIONS, value: token });
          set.status = "No Content";
        } catch (error) {
          if (error instanceof AuthUnauthorizedError) {
            return status("Unauthorized", error as never);
          }
          return status("Bad Request", error);
        }
      },
      {
        body: "AuthLoginBody",
        cookie: "AuthCookieOptional",
        detail: {
          summary: "Login user",
          description: "Authenticate user and set authentication cookie",
          security: [],
        },
        response: {
          [StatusMap["No Content"]]: t.Void({
            description: "Login success",
          }),
          [StatusMap.Unauthorized]: t.Unknown({
            description: "Invalid username or password",
          }),
          [StatusMap["Bad Request"]]: t.Unknown({
            description: "Unknown error",
          }),
        },
      },
    )
    .guard({ currentUser: true }, (app) =>
      app.post(
        "/logout",
        async ({ set, cookie }) => {
          cookie.auth.remove();
          set.status = "No Content";
        },
        {
          cookie: "AuthCookieOptional",
          detail: {
            summary: "Logout current user",
            description: "Clear authentication cookie",
          },
          response: {
            [StatusMap["No Content"]]: t.Void({
              description: "Logout success",
            }),
            [StatusMap.Unauthorized]: t.Void({
              description: "Missing or invalid auth cookie",
            }),
          },
        },
      ),
    );
};
