/**
 * Games API Client Hook
 *
 * 型安全なAPIクライアントを使用してゲームデータを取得するReact Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import type { GetGamesResponse, GetMoviesResponse } from '@/schemas/api';

interface UseGamesOptions {
  matchType: 'external' | 'internal';
  matchId: string;
  autoFetch?: boolean;
}

interface UseGamesResult {
  data: GetGamesResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGames({
  matchType,
  matchId,
  autoFetch = true
}: UseGamesOptions): UseGamesResult {
  const [data, setData] = useState<GetGamesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    if (!matchType || !matchId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching games with type-safe API client:', { matchType, matchId });

      // 型安全なAPIクライアントを使用
      const response = await api.games.list({
        type: matchType,
        matchId: matchId,
      });

      console.log('Type-safe API response:', response);
      setData(response);
    } catch (err) {
      console.error('Failed to fetch games:', err);

      if (err instanceof ApiError) {
        setError(`API Error: ${err.message} (Status: ${err.details.status})`);
      } else if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [matchType, matchId]);

  useEffect(() => {
    if (autoFetch) {
      fetchGames();
    }
  }, [fetchGames, autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchGames,
  };
}

/**
 * Movies API Client Hook
 */
interface UseMoviesOptions {
  page?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

export function useMovies(options: UseMoviesOptions = {}) {
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
}
