import { Elysia, StatusMap, t } from "elysia";

import type {
  User,
  UserRepository,
} from "@acme/backend/domain/users/user.repository";
import { createPlannerService } from "@acme/backend/services/planner.service";

import {
  plannerContracts,
  plannerEventSchema,
  plannerHabitSchema,
  plannerPlanPageResponseSchema,
  plannerProfileSchema,
  plannerRandomTaskResponseSchema,
  plannerTodoSchema,
} from "./contracts/planner.schemas";
import type {
  PlannerEventInput,
  PlannerEventUpdate,
  PlannerHabitInput,
  PlannerHabitUpdate,
  PlannerIdParams,
  PlannerProfileUpdate,
  PlannerRangeQuery,
  PlannerRandomTaskRequest,
  PlannerTodoInput,
  PlannerTodoUpdate,
} from "./contracts/planner.schemas";
import { createCurrentUserMacro } from "./macros/current-user";

type StatusKey = keyof typeof StatusMap;
type Authed<T> = { currentUser: User } & T;
type RangeCtx = Authed<{ query: PlannerRangeQuery }>;
type BodyCtx<T> = Authed<{ body: T }>;
type ParamsCtx<T = object> = Authed<{ params: PlannerIdParams }> & T;
type SetCtx = { set: any };
type ParamsBodySetCtx<T> = ParamsCtx<{ body: T }> & SetCtx;

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
          ({ currentUser, query }: RangeCtx) =>
            planner.getOverview(currentUser.id, query),
          {
            query: "PlannerRangeQuery",
            response: { [StatusMap.OK]: "PlannerOverviewResponse" },
            detail: {
              summary: "Get events, todos, habits",
              description:
                "Returns planner data for the requested time window",
            },
          },
        )
        .get(
          "/events",
          ({ currentUser, query }: RangeCtx) =>
            planner.listEvents(currentUser.id, query),
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
          ({ currentUser, body }: BodyCtx<PlannerEventInput>) =>
            planner.createEvent(currentUser.id, body),
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
          async ({ currentUser, params, body, set }: ParamsBodySetCtx<PlannerEventUpdate>) => {
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
          async ({ currentUser, params, set }: ParamsCtx<SetCtx>) => {
            const deleted = await planner.deleteEvent(currentUser.id, params.id);
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
          ({ currentUser, query }: RangeCtx) =>
            planner.listTodos(currentUser.id, query),
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
          ({ currentUser, body }: BodyCtx<PlannerTodoInput>) =>
            planner.createTodo(currentUser.id, body),
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
          async ({ currentUser, params, body, set }: ParamsBodySetCtx<PlannerTodoUpdate>) => {
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
          async ({ currentUser, params, set }: ParamsCtx<SetCtx>) => {
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
          ({ currentUser }: Authed<object>) => planner.listHabits(currentUser.id),
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
          ({ currentUser, body }: BodyCtx<PlannerHabitInput>) =>
            planner.createHabit(currentUser.id, body),
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
          async ({ currentUser, params, body, set }: ParamsBodySetCtx<PlannerHabitUpdate>) => {
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
          async ({ currentUser, params, set }: ParamsCtx<SetCtx>) => {
            const deleted = await planner.deleteHabit(currentUser.id, params.id);
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
          ({ currentUser, query }: RangeCtx) =>
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
          ({ currentUser }: Authed<object>) => planner.getProfile(currentUser.id),
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
          ({ currentUser, body }: BodyCtx<PlannerProfileUpdate>) =>
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
          async ({ currentUser, query, set }: RangeCtx & SetCtx) => {
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
          ({ currentUser, body }: BodyCtx<PlannerRandomTaskRequest>) =>
            planner.generateRandomTasks(currentUser.id, body),
          {
            body: "PlannerRandomTaskRequest",
            response: { [StatusMap.OK]: plannerRandomTaskResponseSchema },
            detail: {
              summary: "Generate fun tasks",
              description: "Lightweight AI-like planner suggestions",
            },
          },
        ),
    );
};
