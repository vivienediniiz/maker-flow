/**
 * ✅ Custom Hook: useAsync (simplified data fetching)
 * Generic hook for async data fetching with loading/error states
 * Replaces repetitive useState + useEffect patterns
 */

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UseAsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: { onSuccess?: (data: T) => void; onError?: (error: Error) => void } = {}
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await asyncFn();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      setError(errObj.message);
      logger.error('useAsync failed', errObj);
      options.onError?.(errObj);
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, deps);

  return { data, isLoading, error, refetch: execute };
}
