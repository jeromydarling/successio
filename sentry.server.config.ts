import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  initialScope: {
    tags: { app_slug: 'successio', federation_phase: 'pre-launch', tier: 'server' },
  },
});
