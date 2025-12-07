# @acme/backend

## Database quickstart
- Postgres only. Set `DATABASE_URL` to your instance.
- Apply migrations: `bun run --filter @acme/backend migrate` (auto-runs on startup when `AUTO_MIGRATE=true`).
- Generate migrations manually: `bun x drizzle-kit generate --config ./drizzle.config.ts`. (Run in `apps/backend`.)

## Observability
- Metrics: exposed at `/metrics` in Prometheus format.
- Tracing: enable by setting `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. `http://otel-collector:4318`) and optional `OTEL_EXPORTER_OTLP_HEADERS`; service name overrides via `OTEL_SERVICE_NAME`.
