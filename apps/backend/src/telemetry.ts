import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const parseHeaders = (value?: string) => {
  if (!value) {
    return undefined;
  }

  return Object.fromEntries(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [key, ...rest] = entry.split("=");
        return [key.trim(), rest.join("=").trim()];
      }),
  );
};

const otlpHeaders = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

const traceExporter = otlpEndpoint
  ? new OTLPTraceExporter({
      url: `${otlpEndpoint.replace(/\/$/, "")}/v1/traces`,
      headers: otlpHeaders,
    })
  : undefined;

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]:
    process.env.OTEL_SERVICE_NAME ?? "hse-vibe-backend",
  [SemanticResourceAttributes.SERVICE_VERSION]:
    process.env.npm_package_version ?? "unknown",
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
    process.env.NODE_ENV ?? "development",
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [new HttpInstrumentation(), new PgInstrumentation()],
});

let started = false;

export const initTelemetry = async () => {
  if (!traceExporter) {
    console.warn(
      "OTEL_EXPORTER_OTLP_ENDPOINT is not set; tracing is disabled.",
    );
    return;
  }

  if (started) {
    return;
  }

  try {
    await sdk.start();
    started = true;
  } catch (error) {
    console.error("Failed to start OpenTelemetry SDK", error);
  }
};

export const shutdownTelemetry = async () => {
  if (!started) {
    return;
  }

  try {
    await sdk.shutdown();
  } catch (error) {
    console.error("Failed to shut down OpenTelemetry SDK", error);
  }
};
