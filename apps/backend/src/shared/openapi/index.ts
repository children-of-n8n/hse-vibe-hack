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
    },
  },
  references: fromTypes("./src/index.ts"),
});
