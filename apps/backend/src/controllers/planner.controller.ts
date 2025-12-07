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
  plannerEventSchema,
  plannerFeedResponseSchema,
  plannerHabitSchema,
  plannerPhotoReportSchema,
  plannerPlanPageResponseSchema,
  plannerPrioritizeResponseSchema,
  plannerProfileSchema,
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
        .get(
          "/overview",
          ({ currentUser, query }) =>
            planner.getOverview(currentUser.id, query),
          {
            query: "PlannerRangeQuery",
            response: { [StatusMap.OK]: "PlannerOverviewResponse" },
            detail: {
              summary: "Get events, todos, habits",
              description: "Returns planner data for the requested time window",
            },
          },
        )
        .get(
          "/events",
          ({ currentUser, query }) => planner.listEvents(currentUser.id, query),
          {
            query: "PlannerRangeQuery",
            response: { [StatusMap.OK]: t.Array(plannerEventSchema) },
            detail: {
              summary: "List events",
              description: "All events intersecting with the range",
            },
          },
        )
        .post(
          "/events",
          ({ currentUser, body }) => planner.createEvent(currentUser.id, body),
          {
            body: "PlannerEventInput",
            response: { [StatusMap.Created]: plannerEventSchema },
            detail: {
              summary: "Create event",
              description: "Create repeating or single events",
            },
          },
        )
        .patch(
          "/events/:id",
          async ({ currentUser, params, body, set }) => {
            const updated = await planner.updateEvent(
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
            body: "PlannerEventUpdateBody",
            response: {
              [StatusMap.OK]: plannerEventSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Update event",
              description: "Partial event update",
            },
          },
        )
        .delete(
          "/events/:id",
          async ({ currentUser, params, set }) => {
            const deleted = await planner.deleteEvent(
              currentUser.id,
              params.id,
            );
            set.status = deleted ? "No Content" : "Not Found";
          },
          {
            params: "PlannerIdParams",
            response: {
              [StatusMap["No Content"]]: t.Void(),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Delete event",
              description: "Remove event by id",
            },
          },
        )
        .get(
          "/todos",
          ({ currentUser, query }) => planner.listTodos(currentUser.id, query),
          {
            query: "PlannerRangeQuery",
            response: { [StatusMap.OK]: t.Array(plannerTodoSchema) },
            detail: {
              summary: "List todos",
              description: "Tasks with due dates and repeats",
            },
          },
        )
        .post(
          "/todos",
          ({ currentUser, body }) => planner.createTodo(currentUser.id, body),
          {
            body: "PlannerTodoInput",
            response: { [StatusMap.Created]: plannerTodoSchema },
            detail: {
              summary: "Create todo",
              description: "Create a reminder-like task",
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
              description: "Partial todo update",
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
              description: "Remove todo by id",
            },
          },
        )
        .get(
          "/habits",
          ({ currentUser }) => planner.listHabits(currentUser.id),
          {
            response: { [StatusMap.OK]: t.Array(plannerHabitSchema) },
            detail: {
              summary: "List habits",
              description: "Habit definitions tied to tasks and events",
            },
          },
        )
        .post(
          "/habits",
          ({ currentUser, body }) => planner.createHabit(currentUser.id, body),
          {
            body: "PlannerHabitInput",
            response: { [StatusMap.Created]: plannerHabitSchema },
            detail: {
              summary: "Create habit",
              description: "Start tracking a habit",
            },
          },
        )
        .patch(
          "/habits/:id",
          async ({ currentUser, params, body, set }) => {
            const updated = await planner.updateHabit(
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
            body: "PlannerHabitUpdateBody",
            response: {
              [StatusMap.OK]: plannerHabitSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Update habit",
              description: "Partial habit update",
            },
          },
        )
        .delete(
          "/habits/:id",
          async ({ currentUser, params, set }) => {
            const deleted = await planner.deleteHabit(
              currentUser.id,
              params.id,
            );
            set.status = deleted ? "No Content" : "Not Found";
          },
          {
            params: "PlannerIdParams",
            response: {
              [StatusMap["No Content"]]: t.Void(),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Delete habit",
              description: "Remove habit by id",
            },
          },
        )
        .get(
          "/plans",
          ({ currentUser, query }) =>
            planner.getPlanPage(currentUser.id, query),
          {
            query: "PlannerRangeQuery",
            response: { [StatusMap.OK]: plannerPlanPageResponseSchema },
            detail: {
              summary: "Plan page items",
              description: "Aggregated plan view for a period",
            },
          },
        )
        .get(
          "/profile",
          ({ currentUser }) => planner.getProfile(currentUser.id),
          {
            response: { [StatusMap.OK]: plannerProfileSchema },
            detail: {
              summary: "Profile planner settings",
              description:
                "Onboarding state, defaults for reminders, calendar export",
            },
          },
        )
        .patch(
          "/profile",
          ({ currentUser, body }) =>
            planner.updateProfile(currentUser.id, body),
          {
            body: "PlannerProfileUpdateBody",
            response: { [StatusMap.OK]: plannerProfileSchema },
            detail: {
              summary: "Update planner settings",
              description: "Partial profile update",
            },
          },
        )
        .get(
          "/export/ics",
          async ({ currentUser, query, set }) => {
            const payload = await planner.exportCalendar(currentUser.id, query);
            set.headers ??= {};
            set.headers["Content-Type"] = "text/calendar";
            return payload;
          },
          {
            query: "PlannerRangeQuery",
            response: { [StatusMap.OK]: "PlannerCalendarExport" },
            detail: {
              summary: "Export calendar",
              description: "Get ICS payload for current planner items",
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
              description: "Lightweight AI-like planner suggestions",
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
              summary: "LLM prioritization stub",
              description: "Orders tasks with LLM-style scores",
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
              description: "Generate shareable friend invite code",
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
              description: "Attach friend by invite code",
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
              description: "Friends added via invites",
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
              description: "LLM-inspired dare with XP reward",
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
              description: "Mark crazy task progress",
            },
          },
        )
        .post(
          "/reports",
          ({ currentUser, body }) =>
            planner.addPhotoReport(
              currentUser.id,
              body as PlannerPhotoReportInput,
            ),
          {
            body: "PlannerPhotoReportInput",
            response: { [StatusMap.Created]: plannerPhotoReportSchema },
            detail: {
              summary: "Attach photo report",
              description: "Upload link + caption for task",
            },
          },
        )
        .get("/feed", ({ currentUser }) => planner.getFeed(currentUser.id), {
          response: { [StatusMap.OK]: plannerFeedResponseSchema },
          detail: {
            summary: "Friends feed",
            description: "Photo reports from friends and self",
          },
        }),
    );
};
