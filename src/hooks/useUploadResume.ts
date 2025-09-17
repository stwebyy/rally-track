import { useState, useEffect, useCallback } from 'react';
import {
  PendingSessionsResponse,
  SessionStatusResponse,
  LocalUploadState
} from '@/types/youtube-upload';

interface UseUploadResumeOptions {
  onSessionFound?: (sessions: SessionStatusResponse[]) => void;
  autoCheck?: boolean;
  checkInterval?: number;
}

interface UseUploadResumeReturn {
  pendingSessions: SessionStatusResponse[];
  isLoading: boolean;
  error: string | null;
  checkPendingSessions: () => Promise<void>;
  clearSession: (sessionId: string) => Promise<void>;
  hasResumableSessions: boolean;
}

export function useUploadResume(options: UseUploadResumeOptions = {}): UseUploadResumeReturn {
  const { onSessionFound, autoCheck = true, checkInterval = 10000 } = options; // 10秒に変更

  const [pendingSessions, setPendingSessions] = useState<SessionStatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * サーバーから未完了セッションを取得
   */
  const fetchPendingSessions = useCallback(async (): Promise<SessionStatusResponse[]> => {
    try {
      const response = await fetch('/api/youtube/upload/pending');
      if (!response.ok) {
        throw new Error('Failed to fetch pending sessions');
      }

      const data: PendingSessionsResponse = await response.json();
      return data.sessions.filter(session => session.canResume);
    } catch (err) {
      console.error('Failed to fetch pending sessions:', err);
      return [];
    }
  }, []);

  /**
   * ローカルストレージから未完了セッションを取得
   */
  const getLocalUploadStates = useCallback((): LocalUploadState[] => {
    const states: LocalUploadState[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('upload_state_')) {
          const stateStr = localStorage.getItem(key);
          if (stateStr) {
            const state = JSON.parse(stateStr) as LocalUploadState;
            // 24時間以内のものだけ有効とする
            if (Date.now() - state.lastUpdate < 24 * 60 * 60 * 1000) {
              states.push(state);
            } else {
              // 古い状態は削除
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to get local upload states:', err);
    }

    return states;
  }, []);

  /**
   * 未完了セッションをチェック
   */
  const checkPendingSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // サーバーとローカルの両方から取得
      const [serverSessions, localStates] = await Promise.all([
        fetchPendingSessions(),
        Promise.resolve(getLocalUploadStates())
      ]);

      // ローカル状態をセッション形式に変換（近似値）
      const localSessions: SessionStatusResponse[] = localStates.map(state => ({
        sessionId: state.sessionId,
        fileName: state.fileName,
        fileSize: state.totalBytes,
        uploadedBytes: state.uploadedBytes,
        progress: Math.round((state.uploadedBytes / state.totalBytes) * 100),
        status: 'uploading',
        youtubeVideoId: null,
        youtubeUploadUrl: state.uploadUrl,
        metadata: { title: state.fileName, description: '' },
        errorMessage: null,
        expiresAt: new Date(state.lastUpdate + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(state.lastUpdate).toISOString(),
        updatedAt: new Date(state.lastUpdate).toISOString(),
        isExpired: false,
        canResume: true
      }));

      // 重複を除去してマージ
      const allSessions = [...serverSessions];
      localSessions.forEach(localSession => {
        if (!allSessions.find(s => s.sessionId === localSession.sessionId)) {
          allSessions.push(localSession);
        }
      });

      // 再開可能なセッションのみフィルタ
      const resumableSessions = allSessions.filter(session =>
        !session.isExpired &&
        ['pending', 'uploading'].includes(session.status) &&
        session.uploadedBytes > 0 // 何らかの進行があるもの
      );

      setPendingSessions(resumableSessions);

      if (resumableSessions.length > 0 && onSessionFound) {
        onSessionFound(resumableSessions);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Check pending sessions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPendingSessions, getLocalUploadStates, onSessionFound]);

  /**
   * セッションをクリア（サーバー + ローカル）
   */
  const clearSession = useCallback(async (sessionId: string) => {
    try {
      // ローカルストレージからクリア
      localStorage.removeItem(`upload_state_${sessionId}`);

      // 状態から削除
      setPendingSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  }, []);

  /**
   * ページの可視性変更を監視
   */
  useEffect(() => {
    if (!autoCheck) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // ブラウザに復帰時、中断されたアップロードをチェック
        setTimeout(checkPendingSessions, 1000); // 少し遅延させる
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoCheck, checkPendingSessions]);

  /**
   * 定期チェック - 動的間隔（checkInterval = 0で無効化）
   */
  useEffect(() => {
    if (!autoCheck || checkInterval <= 0) return;

    // アクティブなセッションがある場合は短い間隔、ない場合は長い間隔
    const dynamicInterval = pendingSessions.length > 0 ? checkInterval : checkInterval * 2;
    const interval = setInterval(checkPendingSessions, dynamicInterval);

    return () => clearInterval(interval);
  }, [autoCheck, checkInterval, checkPendingSessions, pendingSessions.length]);

  /**
   * 初期チェック - autoCheckがfalseの場合は実行しない
   */
  useEffect(() => {
    if (!autoCheck) return;

    // 初回チェックを少し遅延させて、不必要なリクエストを避ける
    const timeoutId = setTimeout(() => {
      checkPendingSessions();
    }, 2000); // 2秒後に実行

    return () => clearTimeout(timeoutId);
  }, [autoCheck, checkPendingSessions]);

  const hasResumableSessions = pendingSessions.length > 0;

  return {
    pendingSessions,
    isLoading,
    error,
    checkPendingSessions,
    clearSession,
    hasResumableSessions
  };
}
