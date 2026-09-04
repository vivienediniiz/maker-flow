/**
 * ✅ Common Cleanup Patterns for React Components
 * Prevents memory leaks from event listeners, timers, subscriptions
 *
 * PATTERN 1: Event Listeners
 * useEffect(() => {
 *   const handler = (e) => { ... };
 *   window.addEventListener('resize', handler);
 *   return () => window.removeEventListener('resize', handler); // CLEANUP
 * }, []);
 *
 * PATTERN 2: Timers
 * useEffect(() => {
 *   const timer = setTimeout(() => { ... }, 1000);
 *   return () => clearTimeout(timer); // CLEANUP
 * }, []);
 *
 * PATTERN 3: Intervals
 * useEffect(() => {
 *   const interval = setInterval(() => { ... }, 1000);
 *   return () => clearInterval(interval); // CLEANUP
 * }, []);
 *
 * PATTERN 4: Subscriptions (Supabase, etc)
 * useEffect(() => {
 *   const subscription = supabase
 *     .from('table')
 *     .on('*', (payload) => { ... })
 *     .subscribe();
 *   return () => {
 *     subscription.unsubscribe(); // CLEANUP
 *   };
 * }, []);
 *
 * PATTERN 5: Abort Controller (Fetch)
 * useEffect(() => {
 *   const controller = new AbortController();
 *   fetch('/api/data', { signal: controller.signal })
 *     .then(r => r.json())
 *     .then(data => { ... });
 *   return () => controller.abort(); // CLEANUP
 * }, []);
 *
 * PATTERN 6: Multiple Cleanup
 * useEffect(() => {
 *   const handler = () => { ... };
 *   const timer = setTimeout(() => { ... }, 1000);
 *
 *   window.addEventListener('scroll', handler);
 *   return () => {
 *     window.removeEventListener('scroll', handler);
 *     clearTimeout(timer);
 *   };
 * }, []);
 */

/**
 * ✅ Utility: useAsync with cleanup
 * Handles fetch + cleanup automatically
 */
import { useEffect, useRef, useState } from 'react';

interface UseAsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = []
): UseAsyncState<T> {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    (async () => {
      try {
        setState({ status: 'pending', data: null, error: null });
        const data = await fn(controller.signal);
        if (isMounted) {
          setState({ status: 'success', data, error: null });
        }
      } catch (err) {
        if (isMounted && err !== controller.signal) {
          setState({
            status: 'error',
            data: null,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      }
    })();

    return () => {
      isMounted = false;
      controller.abort(); // CLEANUP
    };
  }, deps);

  return state;
}

/**
 * ✅ Utility: useEventListener with cleanup
 */
export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (this: Window, ev: WindowEventMap[K]) => any,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler); // CLEANUP
  }, deps);
}

/**
 * ✅ Utility: useInterval with cleanup
 */
export function useInterval(callback: () => void, delayMs: number | null) {
  useEffect(() => {
    if (delayMs === null) return;

    const interval = setInterval(callback, delayMs);
    return () => clearInterval(interval); // CLEANUP
  }, [callback, delayMs]);
}

/**
 * ✅ Utility: useTimeout with cleanup
 */
export function useTimeout(callback: () => void, delayMs: number | null) {
  useEffect(() => {
    if (delayMs === null) return;

    const timeout = setTimeout(callback, delayMs);
    return () => clearTimeout(timeout); // CLEANUP
  }, [callback, delayMs]);
}

/**
 * ✅ Utility: Cleanup for multiple effects
 */
export function useCleanup(...cleanupFns: Array<() => void>) {
  return () => {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    });
  };
}
