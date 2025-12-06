# Backend (Elysia + Bun) — compiled binary runtime
FROM oven/bun:1 AS deps
WORKDIR /app

# Cache shared workspace dependencies
COPY bun.lock package.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:1 AS build
WORKDIR /app

# Only bring backend sources into the build stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
# Type-check TS sources
RUN bun run tsc
# Produce self-contained binary (Bun runtime bundled)
RUN bun build ./src/index.ts --compile --outfile server

FROM gcr.io/distroless/base-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Binary + migrations only; no Bun or source tree needed
COPY --from=build /app/apps/backend/server ./server
COPY --from=build /app/apps/backend/src/db/migrations ./src/db/migrations
COPY --from=build /app/apps/backend/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000
CMD ["/app/server"]
