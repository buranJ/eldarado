import { useEffect, useState } from 'react';

/**
 * Mock data resolves synchronously; this keeps the loading states of the UI
 * exercised until a real data layer is wired in.
 */
export const useSimulatedLoading = (deps: unknown[] = [], delay = 420): boolean => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);

  return loading;
};
