import { collect } from '../pipeline/collect.js';
import { prisma } from '../lib/db.js';

const dryRun = process.argv.includes('--dry-run');
const valueOf = (name: string): string | undefined =>
  process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const gameId = valueOf('game') ?? 'clash-royale';
const limitValue = valueOf('limit');
const maxListings = limitValue ? Number.parseInt(limitValue, 10) : undefined;

const main = async (): Promise<void> => {
  console.log(`Сбор FunPay · ${gameId}${dryRun ? ' (без записи в БД)' : ''}`);
  const run = await collect({
    dryRun,
    gameId,
    maxListings:
      maxListings !== undefined && Number.isInteger(maxListings) && maxListings > 0
        ? maxListings
        : undefined,
  });
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
