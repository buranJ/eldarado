import cron from 'node-cron';
import { collect } from './pipeline/collect.js';

/** Daily sweep at 08:00 local time, matching what the UI promises. */
export const startScheduler = (log: (message: string) => void): void => {
  cron.schedule('0 8 * * *', async () => {
    log('Плановый сбор: старт');
    try {
      const run = await collect();
      log(
        `Плановый сбор: готово — увидено ${run.seen}, новых ${run.created}, ` +
          `прошло предфильтр ${run.passed}, исчезло ${run.disappeared}`,
      );
    } catch (error) {
      log(`Плановый сбор: ошибка — ${error instanceof Error ? error.message : error}`);
    }
  });
};
