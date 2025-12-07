import { Elysia, StatusMap, t } from "elysia";

import type { FriendRepository } from "@acme/backend/domain/friends/friend.repository";
import type { UserRepository } from "@acme/backend/domain/users/user.repository";
import { createAdventureService } from "@acme/backend/services/adventure.service";
import type { AdventureStore } from "@acme/backend/services/adventure.store";

import type {
  Adventure,
  AdventureWithMedia,
} from "./contracts/adventure.schemas";
import {
  adventureContracts,
  adventureParticipantSchema,
  adventurePhotoSchema,
  adventurePhotoUploadResponseSchema,
  adventureReactionSchema,
  adventureSchema,
  adventureWithMediaSchema,
} from "./contracts/adventure.schemas";
import { createCurrentUserMacro } from "./macros/current-user";

export const createAdventureController = (deps: {
  users: UserRepository;
  store?: AdventureStore;
  friends?: FriendRepository;
}) => {
  const service = createAdventureService({
    users: deps.users,
    store: deps.store,
    friends: deps.friends,
  });
  const enrichWithMedia = async (
    adventures: Adventure[],
    viewerId?: string,
  ): Promise<AdventureWithMedia[]> =>
    Promise.all(
      adventures.map(async (adventure) => {
        const [photos, reactions] = await Promise.all([
          service.listPhotosWithReactions(adventure.id, viewerId),
          service.listReactions(adventure.id),
        ]);
        return {
          ...adventure,
          photos: photos ?? [],
          reactions: reactions ?? [],
        };
      }),
    );
  const exampleAdventure: AdventureWithMedia = {
    id: "11111111-1111-1111-1111-111111111111",
    creatorId: "22222222-2222-2222-2222-222222222222",
    title: "Ночное приключение",
    description:
      "Идея: Ночное приключение. Компания: alice, bob. Будет весело и запомнится.",
    status: "upcoming",
    summary:
      'Они завершили "Ночное приключение": alice, bob. Итог: прогулка по набережной...',
    shareToken: "ADV-example",
    participants: [
      { id: "22222222-2222-2222-2222-222222222222", username: "alice" },
      { id: "33333333-3333-3333-3333-333333333333", username: "bob" },
    ],
    creator: { id: "22222222-2222-2222-2222-222222222222", username: "alice" },
    startsAt: new Date("2024-01-02T18:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    photos: [
      {
        id: "44444444-4444-4444-4444-444444444444",
        adventureId: "11111111-1111-1111-1111-111111111111",
        url: "https://example.com/photo.jpg",
        caption: "Мы у набережной",
        uploader: {
          id: "22222222-2222-2222-2222-222222222222",
          username: "alice",
        },
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
    reactions: [
      {
        id: "55555555-5555-5555-5555-555555555555",
        adventureId: "11111111-1111-1111-1111-111111111111",
        userId: "33333333-3333-3333-3333-333333333333",
        emoji: "🔥",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ],
  };
  const reactionsResponseSchema = t.Object({
    reactions: t.Array(adventureReactionSchema),
  });

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
            adventures: await enrichWithMedia(
              await service.listByStatus(currentUser.id, "upcoming"),
              currentUser.id,
            ),
          }),
          {
            response: {
              [StatusMap.OK]: t.Object(
                {
                  adventures: t.Array(adventureWithMediaSchema),
                },
                { examples: [{ adventures: [exampleAdventure] }] },
              ),
            },
            detail: {
              summary: "List upcoming adventures",
              description: "Предстоящие приключения с фото и реакциями.",
            },
          },
        )
        .get(
          "/completed",
          async ({ currentUser }) => ({
            adventures: await enrichWithMedia(
              await service.listByStatus(currentUser.id, "completed"),
              currentUser.id,
            ),
          }),
          {
            response: {
              [StatusMap.OK]: t.Object(
                {
                  adventures: t.Array(adventureWithMediaSchema),
                },
                { examples: [{ adventures: [exampleAdventure] }] },
              ),
            },
            detail: {
              summary: "List completed adventures",
              description: "Завершённые приключения с фото и реакциями.",
            },
          },
        )
        .get(
          "/:id",
          async ({ params, set, currentUser }) => {
            const adventure = await service.getById(params.id);
            if (!adventure) {
              set.status = "Not Found";
              return;
            }
            const full = (
              await enrichWithMedia([adventure], currentUser.id)
            )[0];
            return { adventure: full };
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object(
                { adventure: adventureWithMediaSchema },
                { examples: [{ adventure: exampleAdventure }] },
              ),
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
          async ({ currentUser, params, set }) => {
            const completed = await service.completeAdventure(
              params.id,
              currentUser.id,
            );
            if (!completed) {
              set.status = "Forbidden";
              return;
            }
            return completed;
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: adventureSchema,
              [StatusMap.Forbidden]: t.Void(),
            },
            detail: {
              summary: "Complete adventure",
              description:
                "Помечает приключение завершённым (только владелец).",
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
        .get(
          "/friends",
          async ({ currentUser }) => {
            return { friends: await service.listFriends(currentUser.id) };
          },
          {
            response: {
              [StatusMap.OK]: t.Object({
                friends: t.Array(adventureParticipantSchema),
              }),
            },
            detail: {
              summary: "List friends",
              description: "Друзья пользователя (для выбора участников).",
            },
          },
        )
        .post(
          "/:id/photos",
          async ({ currentUser, params, body, set }) => {
            const { file, caption, photoUrl, contentType } = body as {
              file?: File;
              caption?: string;
              photoUrl?: string;
              contentType?: string;
            };
            const photo = await service.uploadPhoto(
              params.id,
              currentUser.id,
              caption,
              photoUrl,
              contentType,
              file,
            );
            if (!photo) {
              set.status = "Forbidden";
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
            response: {
              [StatusMap.Created]: adventurePhotoSchema,
              [StatusMap.Forbidden]: t.Void(),
            },
            detail: {
              summary: "Upload photo",
              description: "Прикрепить фото к приключению (участники).",
            },
          },
        )
        .post(
          "/:id/photos/sign",
          async ({ params, body, currentUser, set }) => {
            const signed = await service.signPhotoUpload(
              params.id,
              currentUser.id,
              (body as { filename: string }).filename,
            );
            if (!signed) {
              set.status = "Forbidden";
              return;
            }
            return signed;
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: "AdventurePhotoUploadRequest",
            response: {
              [StatusMap.OK]: adventurePhotoUploadResponseSchema,
              [StatusMap.Forbidden]: t.Void(),
            },
            detail: {
              summary: "Get signed photo upload URL",
              description:
                "Возвращает signed URL для загрузки в S3-подобное хранилище " +
                "(только участники).",
            },
          },
        )
        .get(
          "/:id/photos",
          async ({ params, set, currentUser }) => {
            const photos = await service.listPhotosWithReactions(
              params.id,
              currentUser.id,
            );
            if (photos === null) {
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
        .get(
          "/:id/photos/:photoId/signed",
          async ({ currentUser, params, set }) => {
            const signed = await service.signPhotoView(
              params.id,
              params.photoId,
              currentUser.id,
            );
            if (!signed) {
              set.status = "Not Found";
              return;
            }
            return signed;
          },
          {
            params: t.Object({
              id: t.String({ format: "uuid" }),
              photoId: t.String({ format: "uuid" }),
            }),
            response: {
              [StatusMap.OK]: t.Object({
                url: t.String({ format: "uri" }),
                expiresIn: t.Integer({ minimum: 1 }),
                key: t.String(),
              }),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Get signed URL to view photo",
              description:
                "Возвращает временную ссылку на просмотр фото (для участников приключения).",
            },
          },
        )
        .post(
          "/:id/reactions",
          async ({ currentUser, params, body, set }) => {
            const reaction = await service.addReaction(
              params.id,
              currentUser.id,
              (body as { emoji: string }).emoji,
            );
            if (!reaction) {
              set.status = "Not Found";
              return;
            }
            const reactions = await service.listReactions(params.id);
            set.status = "Created";
            return { reactions: reactions ?? [] };
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: "AdventureReactionInput",
            response: {
              [StatusMap.Created]: reactionsResponseSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Add reaction to adventure",
              description: "Поставить эмодзи на приключение.",
            },
          },
        )
        .delete(
          "/:id/reactions/:emoji",
          async ({ currentUser, params, set }) => {
            const removed = await service.removeReaction(
              params.id,
              currentUser.id,
              params.emoji,
            );
            set.status = removed ? "No Content" : "Not Found";
          },
          {
            params: t.Object({
              id: t.String({ format: "uuid" }),
              emoji: t.String({ minLength: 1, maxLength: 8 }),
            }),
            response: {
              [StatusMap["No Content"]]: t.Void(),
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "Remove reaction from adventure",
              description: "Удалить свою реакцию.",
            },
          },
        )
        .get(
          "/:id/reactions",
          async ({ params, set }) => {
            const reactions = await service.listReactions(params.id);
            if (!reactions) {
              set.status = "Not Found";
              return;
            }
            return { reactions };
          },
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: reactionsResponseSchema,
              [StatusMap["Not Found"]]: t.Void(),
            },
            detail: {
              summary: "List reactions for adventure",
              description: "Реакции на приключение.",
            },
          },
        ),
    );
};
