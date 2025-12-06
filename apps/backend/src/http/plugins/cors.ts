import { cors as createElysiaCors } from "@elysiajs/cors";

const defaultOrigins = [
  "http://localhost:8000",
  "http://localhost:5173",
  "https://hsevibehack.hacks.intezya.ru",
];

const origins = (process.env.CORS_ORIGINS ?? defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const cors = createElysiaCors({
  origin: origins,
  credentials: true,
});
