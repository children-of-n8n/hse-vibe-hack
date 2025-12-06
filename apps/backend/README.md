# @acme/backend

## Database quickstart
- Postgres only. Set `DATABASE_URL` to your instance.
- Apply migrations: `bun run --filter @acme/backend migrate` (auto-runs on startup when `AUTO_MIGRATE=true`).
- Autogeneration is on by default (`AUTO_GENERATE_MIGRATIONS=true`) and writes to `src/db/migrations`.
