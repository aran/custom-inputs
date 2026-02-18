/**
 * Structured client-side logger.
 * In production: only warn/error emit.
 * In development: all levels emit.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isProd =
  typeof window !== "undefined" &&
  window.location?.hostname !== "localhost";

export function clientLog(
  level: LogLevel,
  component: string,
  event: string,
  data?: Record<string, unknown>
): void {
  if (isProd && (level === "debug" || level === "info")) return;

  const method =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;

  method(`[${component}] ${event}`, data ?? "");
}
