import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import type { SyncStatus } from '@/api/client';

const POLL_MS = 15_000;

/** Live collection status from the API, polled while the app is open. */
export const useSync = (gameId: string) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [updatingAutoSync, setUpdatingAutoSync] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const next = await api.syncStatus(gameId);
      if (mounted.current) {
        setStatus(next);
        setError(null);
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [gameId]);

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
    async (gameId: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      setTriggering(true);
      try {
        await api.runSync(gameId);
        await load();
        return { ok: true };
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

  const setAutoSync = useCallback(
    async (enabled: boolean): Promise<{ ok: true } | { ok: false; message: string }> => {
      setUpdatingAutoSync(true);
      try {
        const schedule = await api.setAutoSync(enabled);
        setStatus((current) =>
          current
            ? { ...current, ...schedule }
            : { running: false, lastRun: null, ...schedule },
        );
        setError(null);
        return { ok: true };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(message);
        return { ok: false, message };
      } finally {
        setUpdatingAutoSync(false);
      }
    },
    [],
  );

  return { status, error, triggering, updatingAutoSync, run, setAutoSync, reload: load };
};
