import { access, mkdir, statfs } from 'node:fs/promises';
import { constants } from 'node:fs';
import { prisma } from './db.js';
import { SOURCE_IMAGE_DIR } from './source-images.js';

export interface HealthReport {
  ok: boolean;
  database: { ok: boolean; latencyMs: number };
  storage: {
    ok: boolean;
    freeBytes: number | null;
    usedPercent: number | null;
  };
}

export const healthReport = async (): Promise<HealthReport> => {
  const databaseStartedAt = Date.now();
  let databaseOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch {
    databaseOk = false;
  }

  let storageOk = false;
  let freeBytes: number | null = null;
  let usedPercent: number | null = null;
  try {
    await mkdir(SOURCE_IMAGE_DIR, { recursive: true });
    await access(SOURCE_IMAGE_DIR, constants.R_OK | constants.W_OK);
    const statistics = await statfs(SOURCE_IMAGE_DIR);
    const totalBytes = Number(statistics.blocks) * Number(statistics.bsize);
    freeBytes = Number(statistics.bavail) * Number(statistics.bsize);
    usedPercent = totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 1_000) / 10 : null;
    storageOk = freeBytes > 256 * 1024 * 1024;
  } catch {
    storageOk = false;
  }

  return {
    ok: databaseOk && storageOk,
    database: { ok: databaseOk, latencyMs: Date.now() - databaseStartedAt },
    storage: { ok: storageOk, freeBytes, usedPercent },
  };
};
