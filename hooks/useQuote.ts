/**
 * ✅ Custom Hook: useQuote
 * Consolidates quote fetching, caching, and state management
 * Reduces code duplication across pages/components
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Quote } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseQuoteOptions {
  quoteId?: string;
  autoRefresh?: number; // milliseconds
}

interface UseQuoteState {
  quote: Quote | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useQuote({ quoteId, autoRefresh }: UseQuoteOptions = {}): UseQuoteState {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!quoteId) return;

    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (err) throw err;
      setQuote(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quote';
      setError(message);
      logger.error('useQuote: Fetch failed', err instanceof Error ? err : new Error(message), { quoteId });
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();

    // Auto-refresh if specified
    if (autoRefresh) {
      const interval = setInterval(fetchQuote, autoRefresh);
      return () => clearInterval(interval);
    }
  }, [fetchQuote, autoRefresh]);

  return { quote, isLoading, error, refetch: fetchQuote };
}
