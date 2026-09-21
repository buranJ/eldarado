import { collect } from '../pipeline/collect.js';
import { prisma } from '../lib/db.js';

const dryRun = process.argv.includes('--dry-run');

const main = async (): Promise<void> => {
  console.log(`Сбор FunPay · Clash Royale${dryRun ? ' (без записи в БД)' : ''}`);
  const run = await collect({ dryRun });
  console.table({
    'увидено на странице': run.seen,
    'новых': run.created,
    'обновлено': run.updated,
    'без изменений': run.unchanged,
    'прошло предфильтр': run.passed,
    'отсеяно': run.rejected,
    'исчезло с площадки': run.disappeared,
    'длительность, мс': run.durationMs ?? 0,
  });
  await prisma.$disconnect();
};

main().catch(async (error) => {
  console.error('Сбор упал:', error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
