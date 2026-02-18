import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,

    beforeSend(event) {
      // Scrub Anthropic API keys from error messages
      const scrub = (s: string) =>
        s.replace(/sk-ant-[a-zA-Z0-9_-]+/g, "[REDACTED]");

      if (event.message) {
        event.message = scrub(event.message);
      }
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = scrub(ex.value);
        }
      }
      return event;
    },
  });
}
