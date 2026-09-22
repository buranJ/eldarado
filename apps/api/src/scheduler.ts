import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { readSyncSettings, writeSyncSettings } from './lib/sync-settings.js';
import { startCollection } from './pipeline/sync-runner.js';

export interface SyncScheduler {
  status(): { autoSyncEnabled: boolean; nextRunAt: string | null };
  setEnabled(enabled: boolean): Promise<{ autoSyncEnabled: boolean; nextRunAt: string | null }>;
  destroy(): Promise<void>;
}

const schedulerStatus = (task: ScheduledTask, enabled: boolean) => ({
  autoSyncEnabled: enabled,
  nextRunAt: enabled ? (task.getNextRun()?.toISOString() ?? null) : null,
});

/** Daily sweep at 08:00 local time. Automatic collection is disabled by default. */
export const startScheduler = async (log: (message: string) => void): Promise<SyncScheduler> => {
  let enabled = (await readSyncSettings()).autoSyncEnabled;
  const task = cron.createTask('0 8 * * *', async () => {
    log('Плановый сбор: старт');
    try {
      const pending = startCollection({ pruneMissing: true });
      if (!pending) {
        log('Плановый сбор: пропущен — другой сбор уже выполняется');
        return;
      }
      const run = await pending;
      log(
        `Плановый сбор: готово — увидено ${run.seen}, новых ${run.created}, ` +
          `прошло предфильтр ${run.passed}, удалено ${run.disappeared}`,
      );
    } catch (error) {
      log(`Плановый сбор: ошибка — ${error instanceof Error ? error.message : error}`);
    }
  });

  if (enabled) await task.start();

  return {
    status: () => schedulerStatus(task, enabled),
    setEnabled: async (nextEnabled) => {
      if (nextEnabled === enabled) return schedulerStatus(task, enabled);
      await writeSyncSettings({ autoSyncEnabled: nextEnabled });
      enabled = nextEnabled;
      if (enabled) await task.start();
      else await task.stop();
      log(`Автоматический сбор ${enabled ? 'включён' : 'выключен'}`);
      return schedulerStatus(task, enabled);
    },
    destroy: async () => {
      await task.destroy();
    },
  };
};
