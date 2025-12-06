# @acme/backend

## Database quickstart
- Postgres only. Set `DATABASE_URL` to your instance.
- Apply migrations: `bun run --filter @acme/backend migrate` (auto-runs on startup when `AUTO_MIGRATE=true`).
- Generate migrations manually: `bun x drizzle-kit generate --config ./drizzle.config.ts`. (Run in `apps/backend`.)
