import Fastify from 'fastify';
import cors from '@fastify/cors';
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

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

await app.register(cors, { origin: env.appOrigin, credentials: true });

app.decorateRequest('user', null);
app.addHook('onRequest', async (request, reply) => {
  request.user = await sessionUser(request);
  const publicPath =
    request.url === '/api/health' ||
    request.url === '/api/auth/login' ||
    request.url === '/api/auth/register';
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

app.get('/api/health', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, aiConfigured: env.anthropicApiKey !== null };
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
registerSyncRoutes(app, scheduler);
registerAnalysisRoutes(app);
registerDecisionRoutes(app);
registerInventoryRoutes(app);
registerOverviewRoutes(app);
registerDestinationRoutes(app);

const shutdown = async (): Promise<void> => {
  await scheduler.destroy();
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.port, host: env.host });
