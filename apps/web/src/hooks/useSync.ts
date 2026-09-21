import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import type { SyncStatus } from '@/api/client';
import type { CollectionRun } from '@gamestock/domain';

const POLL_MS = 15_000;

/** Live collection status from the API, polled while the app is open. */
export const useSync = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await api.syncStatus();
      if (mounted.current) {
        setStatus(next);
        setError(null);
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Polling an HTTP endpoint is exactly the external-system case effects exist for.
    // eslint-disable-next-line react/set-state-in-effect
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [load]);

  const run = useCallback(
    async (
      gameId: string,
    ): Promise<{ ok: true; run: CollectionRun } | { ok: false; message: string }> => {
      setTriggering(true);
      try {
        const completed = await api.runSync(gameId);
        await load();
        return { ok: true, run: completed };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(message);
        return { ok: false, message };
      } finally {
        setTriggering(false);
      }
    },
    [load],
  );

  return { status, error, triggering, run, reload: load };
};
