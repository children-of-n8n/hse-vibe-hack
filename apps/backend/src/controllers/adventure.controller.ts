import { Elysia, StatusMap, t } from "elysia";

import type { UserRepository } from "@acme/backend/domain/users/user.repository";

import {
  adventureContracts,
  adventureParticipantSchema,
  adventurePhotoSchema,
  adventureReactionSchema,
  adventureSchema,
} from "./contracts/adventure.schemas";
import { createCurrentUserMacro } from "./macros/current-user";

const now = () => new Date();

const mockParticipants = (currentUserId: string) => [
  {
    id: currentUserId,
    username: "you",
    avatarUrl: "https://placehold.co/64x64?text=You",
  },
  {
    id: crypto.randomUUID(),
    username: "masha",
    avatarUrl: "https://placehold.co/64x64?text=M",
  },
  {
    id: crypto.randomUUID(),
    username: "peter",
    avatarUrl: "https://placehold.co/64x64?text=P",
  },
];

const mockAdventure = (currentUserId: string) => {
  const createdAt = now();
  return {
    id: crypto.randomUUID(),
    title: "Ночное приключение за соком",
    description:
      "Собрались в 23:00 и пошли за яблочным соком через весь город ради мемов.",
    status: "upcoming" as const,
    shareToken: "SHARE-APPLE-123",
    participants: mockParticipants(currentUserId),
    createdAt,
    updatedAt: createdAt,
  };
};

const mockPhoto = (adventureId: string, uploaderId: string) => ({
  id: crypto.randomUUID(),
  adventureId,
  url: "https://placehold.co/600x800?text=Photo",
  uploader: mockParticipants(uploaderId)[0],
  caption: "Дошли до магазина, победа!",
  createdAt: now(),
});

const mockReaction = (photoId: string, userId: string) => ({
  id: crypto.randomUUID(),
  photoId,
  userId,
  emoji: "🔥",
  createdAt: now(),
});

export const createAdventureController = (deps: { users: UserRepository }) =>
  new Elysia({
    name: "adventure-controller",
    prefix: "/adventures",
    tags: ["Adventures"],
  })
    .use([adventureContracts, createCurrentUserMacro(deps.users)])
    .guard({ currentUser: true }, (app) =>
      app
        .post(
          "",
          ({ currentUser, body, set }) => {
            set.status = "Created";
            const adventure = mockAdventure(currentUser.id);
            return {
              ...adventure,
              title: body.title,
            };
          },
          {
            body: "AdventureCreate",
            response: { [StatusMap.Created]: "Adventure" },
            detail: {
              summary: "Create adventure",
              description:
                "Генерирует share token и AI-описание (mocked response).",
            },
          },
        )
        .get(
          "/upcoming",
          ({ currentUser }) => ({
            adventures: [mockAdventure(currentUser.id)],
          }),
          {
            response: {
              [StatusMap.OK]: t.Object({
                adventures: t.Array(adventureSchema),
              }),
            },
            detail: {
              summary: "List upcoming adventures",
              description: "Предстоящие приключения (mock).",
            },
          },
        )
        .get(
          "/completed",
          ({ currentUser }) => ({
            adventures: [
              {
                ...mockAdventure(currentUser.id),
                status: "completed" as const,
              },
            ],
          }),
          {
            response: {
              [StatusMap.OK]: t.Object({
                adventures: t.Array(adventureSchema),
              }),
            },
            detail: {
              summary: "List completed adventures",
              description: "Завершённые приключения (mock).",
            },
          },
        )
        .get(
          "/:id",
          ({ currentUser, params }) => ({
            adventure: { ...mockAdventure(currentUser.id), id: params.id },
          }),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({ adventure: adventureSchema }),
            },
            detail: {
              summary: "Get adventure",
              description: "Детали приключения (mock).",
            },
          },
        )
        .put(
          "/:id",
          ({ currentUser, params, body }) => ({
            ...mockAdventure(currentUser.id),
            id: params.id,
            ...body,
            updatedAt: now(),
          }),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: "AdventureUpdate",
            response: { [StatusMap.OK]: adventureSchema },
            detail: {
              summary: "Update adventure",
              description: "Изменение названия или описания (mock).",
            },
          },
        )
        .post(
          "/:id/complete",
          ({ currentUser, params }) => ({
            ...mockAdventure(currentUser.id),
            id: params.id,
            status: "completed" as const,
            updatedAt: now(),
          }),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: { [StatusMap.OK]: adventureSchema },
            detail: {
              summary: "Complete adventure",
              description: "Помечает приключение завершённым (mock).",
            },
          },
        )
        .post(
          "/join/:token",
          ({ currentUser, params }) => ({
            ...mockAdventure(currentUser.id),
            shareToken: params.token,
          }),
          {
            params: t.Object({ token: t.String({ minLength: 6 }) }),
            response: { [StatusMap.OK]: adventureSchema },
            detail: {
              summary: "Join by token",
              description: "Присоединение по ссылке без логина друзей (mock).",
            },
          },
        )
        .get(
          "/:id/share-token",
          ({ currentUser, params }) => ({
            token: mockAdventure(currentUser.id).shareToken,
            url: `https://example.com/join/${params.id}`,
          }),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: { [StatusMap.OK]: "AdventureShare" },
            detail: {
              summary: "Get share token",
              description: "Возвращает токен-приглашение (mock).",
            },
          },
        )
        .get(
          "/:id/participants",
          ({ currentUser }) => ({
            participants: mockParticipants(currentUser.id),
          }),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                participants: t.Array(adventureParticipantSchema),
              }),
            },
            detail: {
              summary: "List participants",
              description: "Список участников (mock).",
            },
          },
        )
        .post(
          "/:id/participants",
          ({ currentUser, body }) => ({
            participants: [
              ...mockParticipants(currentUser.id),
              {
                id: (body as { friendId: string }).friendId,
                username: "new-friend",
                avatarUrl: "https://placehold.co/64x64?text=New",
              },
            ],
          }),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: t.Object({ friendId: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                participants: t.Array(adventureParticipantSchema),
              }),
            },
            detail: {
              summary: "Add participant",
              description: "Добавление друга в приключение (mock).",
            },
          },
        )
        .post(
          "/:id/photos",
          ({ currentUser, params }) => mockPhoto(params.id, currentUser.id),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            body: t.Object({
              file: t.File({ description: "Фото или картинка" }),
              caption: t.Optional(t.String({ maxLength: 160 })),
            }),
            response: { [StatusMap.Created]: adventurePhotoSchema },
            detail: {
              summary: "Upload photo",
              description: "Прикрепить фото к приключению (mock).",
            },
          },
        )
        .get(
          "/:id/photos",
          ({ currentUser, params }) => ({
            photos: [mockPhoto(params.id, currentUser.id)],
          }),
          {
            params: t.Object({ id: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                photos: t.Array(adventurePhotoSchema),
              }),
            },
            detail: {
              summary: "List photos",
              description: "Получить фото приключения (mock).",
            },
          },
        )
        .delete(
          "/:id/photos/:photoId",
          ({ set }) => {
            set.status = "No Content";
          },
          {
            params: t.Object({
              id: t.String({ format: "uuid" }),
              photoId: t.String({ format: "uuid" }),
            }),
            response: { [StatusMap["No Content"]]: t.Void() },
            detail: {
              summary: "Delete photo",
              description: "Удалить фото (mock).",
            },
          },
        )
        .post(
          "/photos/:photoId/reactions",
          ({ currentUser, params, body, set }) => {
            set.status = "Created";
            return mockReaction(params.photoId, currentUser.id);
          },
          {
            params: t.Object({ photoId: t.String({ format: "uuid" }) }),
            body: "AdventureReactionInput",
            response: { [StatusMap.Created]: adventureReactionSchema },
            detail: {
              summary: "Add reaction",
              description: "Поставить эмодзи на фото (mock).",
            },
          },
        )
        .delete(
          "/photos/:photoId/reactions/:emoji",
          ({ set }) => {
            set.status = "No Content";
          },
          {
            params: t.Object({
              photoId: t.String({ format: "uuid" }),
              emoji: t.String({ minLength: 1, maxLength: 8 }),
            }),
            response: { [StatusMap["No Content"]]: t.Void() },
            detail: {
              summary: "Remove reaction",
              description: "Удалить свою реакцию (mock).",
            },
          },
        )
        .get(
          "/photos/:photoId/reactions",
          ({ currentUser, params }) => ({
            reactions: [mockReaction(params.photoId, currentUser.id)],
          }),
          {
            params: t.Object({ photoId: t.String({ format: "uuid" }) }),
            response: {
              [StatusMap.OK]: t.Object({
                reactions: t.Array(adventureReactionSchema),
              }),
            },
            detail: {
              summary: "List reactions for photo",
              description: "Реакции на фото (mock).",
            },
          },
        ),
    );
