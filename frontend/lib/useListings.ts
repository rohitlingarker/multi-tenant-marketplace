'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useIdentity } from './identity';
import type { ApiError, ApiResult } from './types';

/**
 * Loads a list for the current identity. Clears the list on every user/tenant switch
 * so one tenant's data never lingers on screen, then refetches.
 */
export function useListings<T>(fetcher: () => Promise<ApiResult<T[]>>) {
  const { ready, version } = useIdentity();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    const res = await fetcherRef.current();
    if (id !== requestId.current) return; // a newer request superseded this one
    if (res.ok) {
      setItems(res.data);
      setError(null);
    } else {
      setItems([]);
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setItems([]);
    refetch();
  }, [ready, version, refetch]);

  return { items, loading, error, refetch };
}
