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

const app = Fastify({ logger: { transport: { target: 'pino-pretty' } } });

await app.register(cors, { origin: true });

app.get('/api/health', async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, aiConfigured: env.anthropicApiKey !== null };
});

registerListingRoutes(app);
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

await app.listen({ port: env.port, host: '127.0.0.1' });
