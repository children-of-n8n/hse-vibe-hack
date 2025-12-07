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
        "API для задач: аутентификация, пользователи, задачи, приоритизация, друзья, crazy-задачи и фотоотчёты.",
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
        name: "Planner",
        description:
          "События, задачи, привычки, генерации, друзья, фотоотчёты и фид.",
      },
    ],
    servers: [
      {
        url: "http://localhost:3000",
        description: "Локальная среда разработки",
      },
    ],
  },
  references: fromTypes("./src/index.ts"),
});
