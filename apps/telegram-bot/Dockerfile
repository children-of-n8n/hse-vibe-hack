# Telegram bot (Bun + grammy) — compiled binary runtime
FROM oven/bun:1 AS deps
WORKDIR /app

# Cache shared workspace dependencies
COPY bun.lock package.json ./
COPY apps/telegram-bot/package.json apps/telegram-bot/
RUN bun install --ignore-scripts

FROM oven/bun:1 AS build
WORKDIR /app

# Only bring telegram bot sources into the build stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json
COPY apps/telegram-bot ./apps/telegram-bot

WORKDIR /app/apps/telegram-bot
# Type-check TS sources
RUN bun run tsc
# Produce self-contained binary (Bun runtime bundled)
RUN bun build ./src/index.ts --compile --outfile server

FROM gcr.io/distroless/base-debian12 AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Binary only; env vars are provided at runtime
COPY --from=build /app/apps/telegram-bot/server ./server

EXPOSE 4001
CMD ["/app/server"]
