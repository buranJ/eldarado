import { analyse } from '../analysis/run.js';
import { MODEL } from '../analysis/extract.js';
import { prisma } from '../lib/db.js';

const arg = (name: string): string | undefined => {
  const entry = process.argv.find((value) => value.startsWith(`--${name}=`));
  return entry?.split('=')[1];
};

const limit = Number(arg('limit') ?? 25);
const concurrency = Number(arg('concurrency') ?? 6);
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

const main = async (): Promise<void> => {
  console.log(
    `AI-анализ · Clash Royale · модель ${MODEL} · до ${limit} объявлений` +
      `${force ? ' · принудительно' : ''}${dryRun ? ' · без вызовов модели' : ''}`,
  );

  const report = await analyse({
    limit,
    concurrency,
    force,
    dryRun,
    onProgress: (done, total) => {
      process.stdout.write(`\r  обработано ${done}/${total}`);
    },
  });
  process.stdout.write('\r');

  console.table({
    'кандидатов': report.candidates,
    'проанализировано': report.analysed,
    'пропущено (без изменений)': report.skipped,
    'ошибок': report.failed,
    'токенов на вход': report.inputTokens,
    'прочитано из кеша': report.cachedTokens,
    'записано в кеш': report.cacheWriteTokens,
    'токенов на выход': report.outputTokens,
    'стоимость, $': report.costUsd.toFixed(4),
    'в среднем за лот, $': report.analysed ? (report.costUsd / report.analysed).toFixed(5) : '0',
    'длительность, с': (report.durationMs / 1000).toFixed(1),
  });

  for (const error of report.errors) console.error('  ошибка:', error);
  await prisma.$disconnect();
};

main().catch(async (error) => {
  console.error('\nАнализ упал:', error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
