import './instrumentation.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './lib/env.js';
import { prisma } from './lib/db.js';
import { registerListingRoutes } from './routes/listings.js';
import { registerSyncRoutes } from './routes/sync.js';
import { registerAnalysisRoutes } from './routes/analysis.js';
import { registerDecisionRoutes } from './routes/decisions.js';
import { registerInventoryRoutes } from './routes/inventory.js';
import { registerOverviewRoutes } from './routes/overview.js';
import { registerDestinationRoutes } from './routes/destinations.js';
import { startScheduler } from './scheduler.js';
import { sessionUser } from './auth/session.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerIntegrationRoutes } from './routes/integrations.js';
import './auth/types.js';
import { startCollectionWorker } from './pipeline/sync-runner.js';
import { healthReport } from './lib/health.js';
import { reportOperationalError } from './lib/error-monitor.js';
import { Sentry } from './instrumentation.js';
import { mailConfigured } from './lib/mailer.js';
import { registerOperationsRoutes } from './routes/operations.js';

const app = Fastify({
  logger: { transport: { target: 'pino-pretty' } },
  trustProxy: env.production,
  bodyLimit: 16 * 1024 * 1024,
});

await app.register(cors, { origin: env.appOrigin, credentials: true });
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://*.ingest.sentry.io'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
});
await app.register(rateLimit, {
  global: false,
  max: 100,
  timeWindow: '1 minute',
});

app.decorateRequest('user', null);
app.addHook('onRequest', async (request, reply) => {
  request.user = await sessionUser(request);
  const publicPath =
    request.url === '/api/health' ||
    request.url === '/api/auth/login' ||
    request.url === '/api/auth/register' ||
    request.url === '/api/auth/forgot-password' ||
    request.url === '/api/auth/reset-password';
  if (!publicPath && !request.user) {
    return reply.code(401).send({ error: 'Требуется вход в профиль' });
  }
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    request.headers.origin &&
    request.headers.origin !== env.appOrigin
  ) {
    return reply.code(403).send({ error: 'Источник запроса не разрешён' });
  }
});

app.get('/api/health', async (_request, reply) => {
  const report = await healthReport();
  if (!report.ok) reply.code(503);
  return {
    ...report,
    aiConfigured: env.anthropicApiKey !== null,
    passwordRecoveryConfigured: mailConfigured(),
    errorTrackingConfigured: env.sentryDsn !== null,
  };
});

app.addHook('onError', async (request, _reply, error) => {
  request.log.error(
    { err: error, method: request.method, url: request.url },
    'Необработанная ошибка запроса',
  );
  reportOperationalError({ method: request.method, url: request.url, message: error.message });
  Sentry.captureException(error, {
    tags: { method: request.method, route: request.routeOptions.url ?? request.url },
  });
});

registerAuthRoutes(app);
registerIntegrationRoutes(app);
registerListingRoutes(app);
await prisma.collectionRun.updateMany({
  where: { status: 'running' },
  data: {
    status: 'failed',
    error: 'Сбор был прерван перезапуском сервера',
    finishedAt: new Date(),
  },
});
const scheduler = await startScheduler((message) => app.log.info(message));
const collectionWorker = await startCollectionWorker((message) => app.log.info(message));
registerSyncRoutes(app, scheduler);
registerAnalysisRoutes(app);
registerDecisionRoutes(app);
registerInventoryRoutes(app);
registerOverviewRoutes(app);
registerDestinationRoutes(app);
registerOperationsRoutes(app);

const shutdown = async (): Promise<void> => {
  await scheduler.destroy();
  await collectionWorker.stop();
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.port, host: env.host });
