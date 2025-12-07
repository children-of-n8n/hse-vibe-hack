import { Elysia, StatusMap, t } from "elysia";

import type { UserRepository } from "@acme/backend/domain/users/user.repository";
import { createPlannerService } from "@acme/backend/services/planner.service";

import type {
  PlannerCrazyTaskRequest,
  PlannerCrazyTaskStatus,
  PlannerFriendInviteAccept,
  PlannerPhotoReportInput,
  PlannerPrioritizeRequest,
} from "./contracts/planner.schemas";
import {
  plannerContracts,
  plannerFeedResponseSchema,
  plannerPhotoReportSchema,
  plannerPrioritizeResponseSchema,
  plannerRandomTaskResponseSchema,
  plannerTodoSchema,
} from "./contracts/planner.schemas";
import { createCurrentUserMacro } from "./macros/current-user";

export const createPlannerController = (deps: { users: UserRepository }) => {
  const planner = createPlannerService();

  return new Elysia({
    name: "planner-controller",
    prefix: "/planner",
    tags: ["Planner"],
  })
    .use([plannerContracts, createCurrentUserMacro(deps.users)])
    .guard({ currentUser: true }, (app) =>
      app
        .get("/todos", ({ currentUser }) => planner.listTodos(currentUser.id), {
          response: { [StatusMap.OK]: t.Array(plannerTodoSchema) },
          detail: {
            summary: "List todos",
            description: "Список задач без календаря",
          },
        })
        .post(
          "/todos",
          ({ currentUser, body }) => planner.createTodo(currentUser.id, body),
          {
            body: "PlannerTodoInput",
            response: { [StatusMap.Created]: plannerTodoSchema },
            detail: {
              summary: "Create todo",
              description: "Создание задачи",
            },
          },
        )
        .patch(
          "/todos/:id",
          async ({ currentUser, params, body, set }) => {
            const updated = await planner.updateTodo(
              currentUser.id,
              params.id,
              body,
            );

            if (!updated) {
              set.status = "Not Found";
              return;
            }

            return updated;
          },
          {
            params: "PlannerIdParams",
            body: "PlannerTodoUpdateBody",
            response: {
              [StatusMap.OK]: plannerTodoSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Update todo",
              description: "Частичное обновление задачи",
            },
          },
        )
        .delete(
          "/todos/:id",
          async ({ currentUser, params, set }) => {
            const deleted = await planner.deleteTodo(currentUser.id, params.id);
            set.status = deleted ? "No Content" : "Not Found";
          },
          {
            params: "PlannerIdParams",
            response: {
              [StatusMap["No Content"]]: t.Void(),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Delete todo",
              description: "Удаление задачи",
            },
          },
        )
        .post(
          "/random-tasks",
          ({ currentUser, body }) =>
            planner.generateRandomTasks(currentUser.id, body),
          {
            body: "PlannerRandomTaskRequest",
            response: { [StatusMap.OK]: plannerRandomTaskResponseSchema },
            detail: {
              summary: "Generate fun tasks",
              description: "Лёгкие рандомные задачи",
            },
          },
        )
        .post(
          "/prioritize",
          ({ currentUser, body }) =>
            planner.prioritizeTasks(
              currentUser.id,
              body as PlannerPrioritizeRequest,
            ),
          {
            body: "PlannerPrioritizeRequest",
            response: { [StatusMap.OK]: plannerPrioritizeResponseSchema },
            detail: {
              summary: "Prioritize tasks",
              description: "LLM-подобная сортировка задач",
            },
          },
        )
        .post(
          "/friends/invite",
          ({ currentUser, set }) => {
            set.status = "Created";
            return planner.createFriendInvite(currentUser.id);
          },
          {
            response: { [StatusMap.Created]: "PlannerFriendInvite" },
            detail: {
              summary: "Create invite link",
              description: "Генерация ссылки-приглашения",
            },
          },
        )
        .post(
          "/friends/accept",
          async ({ currentUser, body, set }) => {
            const friend = await planner.acceptFriendInvite(
              currentUser.id,
              (body as PlannerFriendInviteAccept).code,
            );

            if (!friend) {
              set.status = "Not Found";
              return;
            }

            return friend;
          },
          {
            body: "PlannerFriendInviteAccept",
            response: {
              [StatusMap.OK]: "PlannerFriend",
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Accept invite",
              description: "Привязка друга по коду",
            },
          },
        )
        .get(
          "/friends",
          async ({ currentUser }) => ({
            friends: await planner.listFriends(currentUser.id),
          }),
          {
            response: { [StatusMap.OK]: "PlannerFriendListResponse" },
            detail: {
              summary: "List friends",
              description: "Друзья, добавленные по инвайту",
            },
          },
        )
        .post(
          "/crazy-task",
          ({ currentUser, body }) =>
            planner.generateCrazyTask(
              currentUser.id,
              body as PlannerCrazyTaskRequest,
            ),
          {
            body: "PlannerCrazyTaskRequest",
            response: { [StatusMap.OK]: "PlannerCrazyTaskResponse" },
            detail: {
              summary: "Generate crazy task",
              description: "Дерзкая задача с XP наградой",
            },
          },
        )
        .patch(
          "/crazy-task/:id/status",
          async ({ currentUser, params, body, set }) => {
            const updated = await planner.updateCrazyTaskStatus(
              currentUser.id,
              params.id,
              (body as PlannerCrazyTaskStatus).status,
            );

            if (!updated) {
              set.status = "Not Found";
              return;
            }

            return updated;
          },
          {
            params: "PlannerIdParams",
            body: "PlannerCrazyTaskStatus",
            response: {
              [StatusMap.OK]: "PlannerCrazyTask",
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Update crazy task status",
              description: "Отметить прогресс по crazy-задаче",
            },
          },
        )
        .post(
          "/reports",
          ({ currentUser, body, set }) => {
            set.status = "Created";
            return planner.addPhotoReport(
              currentUser.id,
              body as PlannerPhotoReportInput,
            );
          },
          {
            body: "PlannerPhotoReportInput",
            response: { [StatusMap.Created]: plannerPhotoReportSchema },
            detail: {
              summary: "Attach photo report",
              description: "Фотоотчёт по задаче",
            },
          },
        )
        .get("/feed", ({ currentUser }) => planner.getFeed(currentUser.id), {
          response: { [StatusMap.OK]: plannerFeedResponseSchema },
          detail: {
            summary: "Friends feed",
            description: "Фотоотчёты свои и друзей",
          },
        }),
    );
};
