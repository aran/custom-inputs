/**
 * Structured server-side JSON logger.
 * Zero dependencies — outputs JSON to stdout/stderr for Vercel Function Logs.
 */

type LogLevel = "info" | "warn" | "error";

export function log(
  level: LogLevel,
  event: string,
  data?: Record<string, unknown>
): void {
  const method =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;

  method(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...data,
    })
  );
}
