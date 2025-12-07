import { Elysia } from "elysia";
import client from "prom-client";

const serviceName = process.env.OTEL_SERVICE_NAME ?? "hse-vibe-backend";

const registry = new client.Registry();
registry.setDefaultLabels({ service: serviceName });
client.collectDefaultMetrics({ register: registry });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

registry.registerMetric(httpRequestDuration);
registry.registerMetric(httpRequestsTotal);

export const metrics = new Elysia({ name: "metrics" })
  .derive(() => ({ requestStart: performance.now() }))
  .onAfterHandle(({ request, route, set, requestStart }) => {
    const statusCode = (set.status ?? 200).toString();
    const durationSeconds = (performance.now() - requestStart) / 1000;
    const routeLabel = route ?? new URL(request.url).pathname;

    if (routeLabel === "/metrics") {
      return;
    }

    const labels = {
      method: request.method,
      route: routeLabel,
      status_code: statusCode,
    };

    httpRequestsTotal.labels(labels).inc();
    httpRequestDuration.labels(labels).observe(durationSeconds);
  })
  .get("/metrics", async () => {
    const body = await registry.metrics();
    return new Response(body, {
      headers: { "content-type": registry.contentType },
    });
  });
