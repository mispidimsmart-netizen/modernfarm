import * as Sentry from "@sentry/react";

const DSN = "https://b6f3d510f46f1a28d1f006bcece29267@o4511375757017088.ingest.us.sentry.io/4511375772090368";

const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const isProd = import.meta.env.PROD && !isPreviewHost;

export function initSentry() {
  // Only enable in real production deployments — skip Lovable preview & local dev
  if (!isProd) return;

  Sentry.init({
    dsn: DSN,
    environment: window.location.hostname,
    release: `farmeye@${import.meta.env.VITE_APP_VERSION || "unknown"}`,

    // Performance — minimal sampling (cost control on free tier)
    tracesSampleRate: 0.1,

    // PII scrub — never send default IP, headers, cookies
    sendDefaultPii: false,

    // Reduce noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      "AbortError",
      // Browser extensions
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
    ],

    beforeSend(event) {
      // Strip emails, phone numbers from messages
      if (event.message) {
        event.message = scrubPII(event.message);
      }
      if (event.exception?.values) {
        event.exception.values.forEach((v) => {
          if (v.value) v.value = scrubPII(v.value);
        });
      }
      // Drop user email/IP if somehow captured
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

function scrubPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(\+?88)?01[3-9]\d{8}/g, "[phone]");
}

/** Set farm/user context after auth (no PII) */
export function setSentryContext(opts: {
  userId?: string;
  farmId?: string;
  role?: string;
}) {
  if (!isProd) return;
  Sentry.setUser(opts.userId ? { id: opts.userId } : null);
  Sentry.setTag("farm_id", opts.farmId ?? "none");
  Sentry.setTag("role", opts.role ?? "unknown");
}

/** Manually capture a Supabase mutation failure with context */
export function captureSupabaseError(
  error: unknown,
  context: { operation: string; table?: string; farmId?: string }
) {
  if (!isProd) {
    console.error("[supabase]", context.operation, error);
    return;
  }
  Sentry.withScope((scope) => {
    scope.setTag("source", "supabase");
    scope.setTag("operation", context.operation);
    if (context.table) scope.setTag("table", context.table);
    if (context.farmId) scope.setTag("farm_id", context.farmId);
    Sentry.captureException(error);
  });
}

/** Track ESP32 command timeout pattern (call when ack rate <90%) */
export function captureEsp32AckIssue(stats: {
  ackRate: number;
  totalCommands: number;
  farmId?: string;
}) {
  if (!isProd) return;
  Sentry.withScope((scope) => {
    scope.setTag("source", "esp32");
    scope.setLevel("warning");
    scope.setContext("ack_stats", stats);
    Sentry.captureMessage(
      `ESP32 ack rate degraded: ${(stats.ackRate * 100).toFixed(0)}%`
    );
  });
}

export { Sentry };
