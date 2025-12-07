import { treaty } from "@elysiajs/eden";

import type { app } from "@acme/backend";

const baseUrl = import.meta?.env?.VITE_API_BASE_URL ?? "http://localhost:3000";

export const api = treaty<typeof app>(baseUrl, {
  fetch: { credentials: "include" },
});
