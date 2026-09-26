import * as Sentry from '@sentry/node';
import { env } from './lib/env.js';

Sentry.init({
  dsn: env.sentryDsn ?? undefined,
  environment: env.sentryEnvironment,
  enabled: Boolean(env.sentryDsn),
  tracesSampleRate: 0.05,
});

export { Sentry };
