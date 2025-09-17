import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Alert,
  AlertTitle,
  Button,
  Chip,
  IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { UploadProgress, SessionStatusResponse } from '@/types/youtube-upload';

interface UploadProgressUIProps {
  session?: SessionStatusResponse;
  progress?: UploadProgress;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  showGuidance?: boolean;
}

export function UploadProgressUI({
  session,
  progress,
  onPause,
  onResume,
  onCancel,
  showGuidance = true
}: UploadProgressUIProps) {
  const [isBackground, setIsBackground] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydration対策
  useEffect(() => {
    setMounted(true);
  }, []);

  // バックグラウンド検知
  useEffect(() => {
    if (!mounted) return;

    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      setIsBackground(hidden);

      // アップロード中でバックグラウンドに移行した場合の警告
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, mounted]);

  // 離脱警告
  useEffect(() => {
    if (!mounted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session && ['uploading', 'processing'].includes(session.status)) {
        e.preventDefault();
        e.returnValue = '動画アップロード中です。ページを離れますか？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session, mounted]);

  // サーバーサイドレンダリング時は何もレンダリングしない
  if (!mounted) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return '--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    if (!session) return <CloudUploadIcon />;

    switch (session.status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
      case 'expired':
        return <ErrorIcon color="error" />;
      case 'uploading':
        return <CloudUploadIcon color="primary" />;
      case 'processing':
        return <CloudUploadIcon color="warning" />;
      default:
        return <CloudUploadIcon />;
    }
  };

  const getStatusChip = () => {
    if (!session) return null;

    switch (session.status) {
      case 'completed':
        return <Chip label="完了" color="success" size="small" />;
      case 'failed':
        return <Chip label="失敗" color="error" size="small" />;
      case 'expired':
        return <Chip label="期限切れ" color="error" size="small" />;
      case 'uploading':
        return <Chip label="アップロード中" color="primary" size="small" />;
      case 'processing':
        return <Chip label="処理中" color="warning" size="small" />;
      case 'pending':
        return <Chip label="待機中" color="default" size="small" />;
      default:
        return null;
    }
  };

  const currentProgress = progress?.percentage || session?.progress || 0;
  const uploadedBytes = progress?.uploadedBytes || session?.uploadedBytes || 0;
  const totalBytes = progress?.totalBytes || session?.fileSize || 0;
  const fileName = session?.fileName || 'アップロード中';

  return (
    <Card>
      <CardContent>
        {/* バックグラウンド警告 */}
        {isBackground && session && ['uploading', 'processing'].includes(session.status) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>📱 他のアプリを使用中です</AlertTitle>
            アップロードを継続するには、このタブに戻ってください。
            バックグラウンドではアップロードが一時停止される場合があります。
          </Alert>
        )}

        {/* アップロード停滞警告 */}
        {progress?.isStalled && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle><WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />アップロードが停滞中</AlertTitle>
            ネットワーク接続を確認してください。しばらく待ってから再開してください。
          </Alert>
        )}

        {/* ファイル情報とステータス */}
        <Box display="flex" alignItems="center" mb={2}>
          {getStatusIcon()}
          <Box ml={1} flex={1}>
            <Typography variant="h6" component="div">
              {fileName}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {getStatusChip()}
              {session?.youtubeVideoId && (
                <Chip label="YouTube ID取得済み" color="info" size="small" />
              )}
            </Box>
          </Box>
        </Box>

        {/* 進行状況バー */}
        <Box mb={2}>
          <LinearProgress
            variant="determinate"
            value={currentProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }}
          />
        </Box>

        {/* 詳細情報 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body2" color="text.secondary">
            {formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)} ({Math.round(currentProgress)}%)
          </Typography>

          {progress && (
            <Typography variant="body2" color="text.secondary">
              {formatSpeed(progress.speed)} • 残り {formatTime(progress.eta)}
            </Typography>
          )}
        </Box>

        {/* コントロールボタン */}
        {session && ['uploading', 'processing'].includes(session.status) && (
          <Box display="flex" gap={1} mb={2}>
            {onPause && (
              <IconButton size="small" onClick={onPause} title="一時停止">
                <PauseIcon />
              </IconButton>
            )}
            {onResume && (
              <IconButton size="small" onClick={onResume} title="再開">
                <PlayArrowIcon />
              </IconButton>
            )}
            {onCancel && (
              <Button size="small" color="error" onClick={onCancel}>
                キャンセル
              </Button>
            )}
          </Box>
        )}

        {/* ガイダンス */}
        {showGuidance && session && ['uploading', 'processing'].includes(session.status) && (
          <Alert severity="info">
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              💡 <strong>アップロードを継続するために:</strong>
            </Typography>
            <ul style={{ margin: '4px 0 0 16px', fontSize: '0.75rem' }}>
              <li>このタブを開いたままにしてください</li>
              <li>他のアプリを使用するとアップロードが一時停止します</li>
              <li>WiFi接続を維持してください</li>
              <li>端末の電源を切らないでください</li>
            </ul>
          </Alert>
        )}

        {/* 完了メッセージ */}
        {session?.status === 'completed' && session.youtubeVideoId && (
          <Alert severity="success">
            <AlertTitle>🎉 アップロード完了!</AlertTitle>
            動画が正常にYouTubeにアップロードされました。
            <br />
            Video ID: <code>{session.youtubeVideoId}</code>
          </Alert>
        )}

        {/* エラーメッセージ */}
        {(session?.status === 'failed' || session?.status === 'expired') && (
          <Alert severity="error">
            <AlertTitle>❌ アップロードエラー</AlertTitle>
            {session.errorMessage || 'アップロードに失敗しました。'}
            <br />
            <Typography variant="body2" sx={{ mt: 1 }}>
              しばらく待ってから再度お試しください。
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
