/**
 * Movies API Client Hook
 *
 * 型安全なAPIクライアントを使用して映画データを取得するReact Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import type { GetMoviesResponse } from '@/schemas/api';

export type UseMoviesOptions = {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
};

export type UseMoviesResult = {
  data: GetMoviesResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useMovies = (options: UseMoviesOptions = {}): UseMoviesResult => {
  const { page = 1, limit = 10, search, autoFetch = true } = options;
  const [data, setData] = useState<GetMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.movies.list({
        page,
        limit,
        search,
      });

      setData(response);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`API Error: ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    if (autoFetch) {
      fetchMovies();
    }
  }, [fetchMovies, autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchMovies,
  };
};
