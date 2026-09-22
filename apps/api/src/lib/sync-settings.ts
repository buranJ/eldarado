import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SETTINGS_PATH = fileURLToPath(
  new URL('../../storage/sync-settings.json', import.meta.url),
);

interface SyncSettings {
  autoSyncEnabled: boolean;
}

const DEFAULT_SETTINGS: SyncSettings = { autoSyncEnabled: false };

export const readSyncSettings = async (): Promise<SyncSettings> => {
  try {
    const parsed = JSON.parse(await readFile(SETTINGS_PATH, 'utf8')) as Partial<SyncSettings>;
    return { autoSyncEnabled: parsed.autoSyncEnabled === true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return DEFAULT_SETTINGS;
    throw error;
  }
};

export const writeSyncSettings = async (settings: SyncSettings): Promise<void> => {
  await mkdir(dirname(SETTINGS_PATH), { recursive: true });
  const temporaryPath = `${SETTINGS_PATH}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, SETTINGS_PATH);
};
