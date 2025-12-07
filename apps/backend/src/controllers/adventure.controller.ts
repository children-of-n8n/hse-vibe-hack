import { Elysia, StatusMap, t } from "elysia";

import type { UserRepository } from "@acme/backend/domain/users/user.repository";
import { createAdventureService } from "@acme/backend/services/adventure.service";

import {
  adventureContracts,
  adventureParticipantSchema,
  adventurePhotoSchema,
  adventurePhotoUploadResponseSchema,
  adventureReactionSchema,
  adventureSchema,
} from "./contracts/adventure.schemas";
import { createCurrentUserMacro } from "./macros/current-user";

export const createAdventureController = (deps: { users: UserRepository }) => {
  const service = createAdventureService(deps);

  return new Elysia({
    name: "adventure-controller",
    prefix: "/adventures",
    tags: ["Adventures"],
  })
    .use([adventureContracts, createCurrentUserMacro(deps.users)])
    .guard({ currentUser: true }, (app) =>
      app
        .post(
          "",
          async ({ currentUser, body, set }) => {
            set.status = "Created";
            return service.createAdventure(currentUser.id, body);
          },
          {
            body: "AdventureCreate",
            response: { [StatusMap.Created]: "Adventure" },
            detail: {
              summary: "Create adventure",
              description:
                "Создаёт приключение, генерирует share-token и базовое AI-описание.",
            },
          },
        )
        .get(
          "/upcoming",
          async ({ currentUser }) => ({
            adventures: await service.listByStatus(currentUser.id, "upcoming"),
          }),
          {
            response: {
              [StatusMap.OK]: t.Object({
                adventures: t.Array(adventureSchema),
              }),
            },
            detail: {
              summary: "List upcoming adventures",
              description: "Предстоящие приключения.",
            },
          },
        )
        .get(
          "/completed",
          async ({ currentUser }) => ({
            adventures: await service.listByStatus(currentUser.id, "completed"),
          }),
          {
            response: {
              [StatusMap.OK]: t.Object({
                adventures: t.Array(adventureSchema),
              }),
            },
            detail: {
              summary: "List completed adventures",
              description: "Завершённые приключения.",
            },
          },
        )
        .get(
          "/:id",
          async ({ params, set }) => {
            const adventure = await service.getById(params.id);
            if (!adventure) {
              set.status = "Not Found";
              return;
            }
            return { adventure };
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({ adventure: adventureSchema }),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Get adventure",
              description: "Детали приключения.",
            },
          },
        )
        .put(
          "/:id",
          async ({ params, body, set }) => {
            const updated = await service.updateAdventure(params.id, body);
            if (!updated) {
              set.status = "Not Found";
              return;
            }
            return updated;
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: "AdventureUpdate",
            response: {
              [StatusMap.OK]: adventureSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Update adventure",
              description: "Изменение названия или описания.",
            },
          },
        )
        .post(
          "/:id/complete",
          async ({ params, set }) => {
            const completed = await service.completeAdventure(params.id);
            if (!completed) {
              set.status = "Not Found";
              return;
            }
            return completed;
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: adventureSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Complete adventure",
              description: "Помечает приключение завершённым.",
            },
          },
        )
        .post(
          "/join/:token",
          async ({ currentUser, params, set }) => {
            const joined = await service.joinByToken(
              currentUser.id,
              params.token,
            );
            if (!joined) {
              set.status = "Not Found";
              return;
            }
            return joined;
          },
          {
            params: t.Object({ token: t.String({ minLength: 6 }) }),
            response: {
              [StatusMap.OK]: adventureSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Join by token",
              description: "Присоединение по ссылке без логина друзей.",
            },
          },
        )
        .get(
          "/:id/share-token",
          async ({ params, set }) => {
            const token = await service.getShareToken(params.id);
            if (!token) {
              set.status = "Not Found";
              return;
            }
            return token;
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: "AdventureShare",
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Get share token",
              description: "Возвращает токен-приглашение.",
            },
          },
        )
        .get(
          "/:id/participants",
          async ({ params, set }) => {
            const participants = await service.listParticipants(params.id);
            if (!participants) {
              set.status = "Not Found";
              return;
            }
            return { participants };
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                participants: t.Array(adventureParticipantSchema),
              }),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "List participants",
              description: "Список участников.",
            },
          },
        )
        .post(
          "/:id/participants",
          async ({ params, body, set }) => {
            const participants = await service.addParticipant(
              params.id,
              (body as { friendId: string }).friendId,
            );
            if (!participants) {
              set.status = "Not Found";
              return;
            }
            return { participants };
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: t.Object({ friendId: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                participants: t.Array(adventureParticipantSchema),
              }),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Add participant",
              description: "Добавление друга в приключение.",
            },
          },
        )
        .post(
          "/:id/photos",
          async ({ currentUser, params, body, set }) => {
            const photo = await service.uploadPhoto(
              params.id,
              currentUser.id,
              (body as { caption?: string }).caption,
              (body as { photoUrl?: string }).photoUrl,
              (body as { contentType?: string }).contentType,
            );
            if (!photo) {
              set.status = "Not Found";
              return;
            }
            set.status = "Created";
            return photo;
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: t.Union([
              t.Object({
                file: t.File({ description: "Фото или картинка" }),
                caption: t.Optional(t.String({ maxLength: 160 })),
              }),
              t.Object({
                photoUrl: t.Optional(t.String({ format: "uri" })),
                caption: t.Optional(t.String({ maxLength: 160 })),
              }),
              t.Object({
                photoUrl: t.String({ format: "uri" }),
                caption: t.Optional(t.String({ maxLength: 160 })),
                contentType: t.Optional(t.String({ maxLength: 128 })),
              }),
            ]),
            response: { [StatusMap.Created]: adventurePhotoSchema },
            detail: {
              summary: "Upload photo",
              description: "Прикрепить фото к приключению (или указать URL).",
            },
          },
        )
        .post(
          "/:id/photos/sign",
          async ({ params, body, set }) => {
            const signed = await service.signPhotoUpload(
              params.id,
              (body as { filename: string }).filename,
            );
            if (!signed) {
              set.status = "Not Found";
              return;
            }
            return signed;
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: "AdventurePhotoUploadRequest",
            response: {
              [StatusMap.OK]: adventurePhotoUploadResponseSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Get signed photo upload URL",
              description:
                "Возвращает signed URL для загрузки в S3-подобное хранилище.",
            },
          },
        )
        .get(
          "/:id/photos",
          async ({ params, set }) => {
            const photos = await service.listPhotos(params.id);
            if (!photos) {
              set.status = "Not Found";
              return;
            }
            return { photos };
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                photos: t.Array(adventurePhotoSchema),
              }),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "List photos",
              description: "Получить фото приключения.",
            },
          },
        )
        .delete(
          "/:id/photos/:photoId",
          async ({ params, set }) => {
            const deleted = await service.deletePhoto(
              params.id,
              params.photoId,
            );
            set.status = deleted ? "No Content" : "Not Found";
          },
          {
            params: t.Object({
              id: t.String({ format: "uuid" }),
              photoId: t.String({ format: "uuid" }),
            }),
            response: {
              [StatusMap["No Content"]]: t.Void(),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Delete photo",
              description: "Удалить фото.",
            },
          },
        )
        .post(
          "/photos/:photoId/reactions",
          async ({ currentUser, params, body, set }) => {
            const reaction = await service.addReaction(
              params.photoId,
              currentUser.id,
              (body as { emoji: string }).emoji,
            );
            if (!reaction) {
              set.status = "Not Found";
              return;
            }
            set.status = "Created";
            return reaction;
          },
          {
            params: t.Object({ photoId: t.String({ format: "uuid" }) }),
            body: "AdventureReactionInput",
            response: {
              [StatusMap.Created]: adventureReactionSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Add reaction",
              description: "Поставить эмодзи на фото.",
            },
          },
        )
        .delete(
          "/photos/:photoId/reactions/:emoji",
          async ({ currentUser, params, set }) => {
            const removed = await service.removeReaction(
              params.photoId,
              currentUser.id,
              params.emoji,
            );
            set.status = removed ? "No Content" : "Not Found";
          },
          {
            params: t.Object({
              photoId: t.String({ format: "uuid" }),
              emoji: t.String({ minLength: 1, maxLength: 8 }),
            }),
            response: {
              [StatusMap["No Content"]]: t.Void(),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Remove reaction",
              description: "Удалить свою реакцию.",
            },
          },
        )
        .get(
          "/photos/:photoId/reactions",
          async ({ params, set }) => {
            const reactions = await service.listReactions(params.photoId);
            if (!reactions) {
              set.status = "Not Found";
              return;
            }
            return { reactions };
          },
          {
            params: t.Object({ photoId: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                reactions: t.Array(adventureReactionSchema),
              }),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "List reactions for photo",
              description: "Реакции на фото.",
            },
          },
        ),
    );
};
