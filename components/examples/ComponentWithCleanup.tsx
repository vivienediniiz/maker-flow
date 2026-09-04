'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ✅ Example: Component with Proper Cleanup
 * Demonstrates best practices for preventing memory leaks
 */

interface ComponentWithCleanupProps {
  userId: string;
}

export function ComponentWithCleanup({ userId }: ComponentWithCleanupProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    let abortController: AbortController | null = null;
    let timerHandle: NodeJS.Timeout | null = null;
    let subscriptionId: any = null;

    const fetchData = async () => {
      try {
        // ✅ Use AbortController for fetch cleanup
        abortController = new AbortController();
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/user/${userId}`, {
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const result = await response.json();

        // ✅ Only update state if component is still mounted
        if (isMountedRef.current) {
          setData(result);
        }
      } catch (err) {
        // Don't log abort errors (they're expected on unmount)
        if (err instanceof Error && err.name !== 'AbortError') {
          if (isMountedRef.current) {
            setError(err.message);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    // Fetch on mount
    fetchData();

    // ✅ Setup interval (example)
    timerHandle = setInterval(() => {
      if (isMountedRef.current) {
        console.log('Interval running:', userId);
      }
    }, 5000);

    // ✅ Setup listener (example)
    const handleResize = () => {
      if (isMountedRef.current) {
        console.log('Window resized');
      }
    };
    window.addEventListener('resize', handleResize);

    // ✅ CLEANUP function (called on unmount or dep change)
    return () => {
      // Abort pending fetch
      if (abortController) {
        abortController.abort();
      }

      // Clear timer
      if (timerHandle) {
        clearInterval(timerHandle);
      }

      // Remove listener
      window.removeEventListener('resize', handleResize);

      // Mark component as unmounted
      isMountedRef.current = false;
    };
  }, [userId]); // Re-run if userId changes

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return <div>{JSON.stringify(data)}</div>;
}
