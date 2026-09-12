import * as Sentry from "@sentry/react";

const DSN = "https://b6f3d510f46f1a28d1f006bcece29267@o4511375757017088.ingest.us.sentry.io/4511375772090368";

const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
const isLovablePreview =
  hostname.includes("id-preview--") || hostname.includes("lovableproject.com");
const isLovablePublished = hostname.endsWith(".lovable.app");
// Custom domain (farmeye.pro.bd, modernfarm.pro.bd) = real production
const isCustomDomain = !isLocalHost && !isLovablePreview && !isLovablePublished && hostname !== "";

/**
 * Sentry environment label — used to group/filter issues in the dashboard.
 */
function resolveEnvironment(): "development" | "preview" | "staging" | "production" {
  if (isLocalHost) return "development";
  if (isLovablePreview) return "preview";
  if (isLovablePublished) return "staging"; // *.lovable.app — pre-prod
  if (isCustomDomain) return "production";   // farmeye.pro.bd, modernfarm.pro.bd
  return "development";
}

const SENTRY_ENV = resolveEnvironment();
const RELEASE = `farmeye@${__APP_VERSION__}+${__BUILD_ID__}`;

// Force-enable Sentry via ?sentry=on (persists in sessionStorage for the tab)
function isForcedOn() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("sentry") === "on") {
      sessionStorage.setItem("sentry_force_on", "1");
    }
    return sessionStorage.getItem("sentry_force_on") === "1";
  } catch {
    return false;
  }
}

// Auto-enable on staging + production. Skip dev/preview unless forced.
const autoEnabled = SENTRY_ENV === "production" || SENTRY_ENV === "staging";
const isProd = (import.meta.env.PROD && autoEnabled) || isForcedOn();

export const sentryEnabled = () => isProd;
export const sentryEnvironment = () => SENTRY_ENV;
export const sentryRelease = () => RELEASE;

export function initSentry() {
  if (!isProd) return;

  Sentry.init({
    dsn: DSN,
    environment: SENTRY_ENV,
    release: RELEASE,

    // Lighter sampling on production to control quota
    tracesSampleRate: SENTRY_ENV === "production" ? 0.05 : 0.2,

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
