import { useEffect, useState } from 'react';

/**
 * Ticking clock for relative countdowns, so components never read `Date.now()`
 * during render and stale labels refresh on their own.
 */
export const useNow = (intervalMs = 60_000): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
};
