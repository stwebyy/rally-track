/**
 * Games API Client Hook
 *
 * 型安全なAPIクライアントを使用してゲームデータを取得するReact Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import type { GetGamesResponse } from '@/schemas/api';

export type UseGamesOptions = {
  matchType: 'external' | 'internal';
  matchId: string;
  autoFetch?: boolean;
};

export type UseGamesResult = {
  data: GetGamesResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useGames = ({
  matchType,
  matchId,
  autoFetch = true
}: UseGamesOptions): UseGamesResult => {
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
};
