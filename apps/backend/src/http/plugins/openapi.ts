import fs from "node:fs";
import path from "node:path";

import { openapi as createElysiaOpenapi, fromTypes } from "@elysiajs/openapi";

import { name, version } from "package.json";

export const openapi = createElysiaOpenapi({
  path: "/docs",
  scalar: {
    default: false,
    defaultOpenAllTags: true,
    documentDownloadType: "both",
    expandAllModelSections: false,
    expandAllResponses: false,
    hideClientButton: true,
    hideDarkModeToggle: false,
    hideModels: false,
    hideSearch: false,
    hideTestRequestButton: false,
    isEditable: false,
    isLoading: false,
    layout: "modern",
    operationTitleSource: "summary",
    orderRequiredPropertiesFirst: true,
    orderSchemaPropertiesBy: "alpha",
    persistAuth: true,
    showDeveloperTools: "localhost",
    showOperationId: false,
    showSidebar: true,
    showToolbar: "localhost",
    telemetry: false,
    theme: "default",
    withDefaultFonts: true,
  },
  documentation: {
    info: {
      title: name,
      version: version,
      description:
        "API для аутентификации, пользователей и приключений с фото/реакциями.",
    },
    tags: [
      {
        name: "Auth",
        description: "Регистрация, логин, логаут и авторизационные куки.",
      },
      {
        name: "Users",
        description: "Информация о текущем пользователе.",
      },
      {
        name: "Adventures",
        description:
          "Приключения, приглашения по токену, фото и реакции. Моки для фронтенда.",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth",
          description: "Auth cookie issued by /auth/login или /auth/register",
        },
      },
    },
    security: [{ cookieAuth: [] }],
    servers: (() => {
      const base =
        process.env.APP_BASE_URL ??
        process.env.BACKEND_BASE_URL ??
        "http://localhost:3000";
      return [
        {
          url: base,
          description: "Текущий backend (APP_BASE_URL/BACKEND_BASE_URL)",
        },
        {
          url: "http://localhost:3000",
          description: "Локальная разработка",
        },
        {
          url: "https://backend.hsevibehack.hacks.intezya.ru",
          description: "Внешний backend",
        },
      ];
    })(),
  },
  // Resolve source entry regardless of cwd (works in monorepo and docker)
  references: (() => {
    const candidates = [
      path.resolve("src/index.ts"),
      path.resolve(process.cwd(), "src/index.ts"),
      path.resolve(process.cwd(), "apps/backend/src/index.ts"),
      path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "../index.ts",
      ),
    ];

    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
      console.warn("[openapi] Could not resolve src/index.ts for OpenAPI");
      return undefined;
    }

    return fromTypes(found);
  })(),
});
