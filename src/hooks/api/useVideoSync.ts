import { useState, useCallback } from 'react';

export interface VideoSyncResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

export function useVideoSync() {
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  const syncVideo = useCallback(async (sessionId: string): Promise<VideoSyncResult> => {
    // 重複チェック
    if (syncingIds.includes(sessionId)) {
      return { success: false, error: 'Sync already in progress' };
    }

    setSyncingIds(prev => [...prev, sessionId]);

    try {
      const response = await fetch('/api/youtube/syncVideoId', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          videoId: result.videoId
        };
      } else {
        return {
          success: false,
          error: result.error || 'Sync failed'
        };
      }
    } catch (error) {
      console.error('Video sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    } finally {
      setSyncingIds(prev => prev.filter(id => id !== sessionId));
    }
  }, [syncingIds]);

  const isSyncing = useCallback((sessionId: string): boolean => {
    return syncingIds.includes(sessionId);
  }, [syncingIds]);

  return {
    syncVideo,
    isSyncing,
    syncingIds
  };
}
