import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  LinearProgress,
  Box,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { SessionStatusResponse } from '@/types/youtube-upload';

interface UploadResumeDialogProps {
  open: boolean;
  sessions: SessionStatusResponse[];
  onClose: () => void;
  onResume: (sessionId: string, fileName: string) => void;
  onDelete: (sessionId: string) => void;
  isLoading?: boolean;
}

export function UploadResumeDialog({
  open,
  sessions,
  onClose,
  onResume,
  onDelete,
  isLoading = false
}: UploadResumeDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // サーバーサイドレンダリング時はレンダリングしない
  if (!mounted) {
    return <Dialog open={open} onClose={onClose}><DialogContent><Typography>読み込み中...</Typography></DialogContent></Dialog>;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    return `${diffDays}日前`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <CloudUploadIcon color="primary" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getStatusChip = (session: SessionStatusResponse) => {
    if (session.isExpired) {
      return <Chip label="期限切れ" color="error" size="small" />;
    }

    switch (session.status) {
      case 'uploading':
        return <Chip label="アップロード中" color="primary" size="small" />;
      case 'pending':
        return <Chip label="待機中" color="warning" size="small" />;
      default:
        return <Chip label="不明" color="default" size="small" />;
    }
  };

  if (sessions.length === 0 && open) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>📤 未完了のアップロード</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            再開可能なアップロードはありません。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          📤 未完了のアップロード ({sessions.length}件)
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          以下のアップロードが中断されています。続きから再開できます。
        </Alert>

        <List>
          {sessions.map((session, index) => (
            <React.Fragment key={session.sessionId}>
              {index > 0 && <Divider />}

              <ListItem>
                <Box display="flex" alignItems="center" mr={2}>
                  {getStatusIcon(session.status)}
                </Box>

                <Box flexGrow={1} minWidth={0}>
                  {/* ファイル名とステータス */}
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="subtitle1" component="div">
                      {session.fileName}
                    </Typography>
                    {getStatusChip(session)}
                  </Box>

                  {/* サイズと更新時間 */}
                  <Typography variant="body2" color="text.secondary" component="div">
                    {formatFileSize(session.uploadedBytes)} / {formatFileSize(session.fileSize)}
                    {' '}• 最終更新: {formatTimeAgo(session.updatedAt)}
                  </Typography>

                  {/* プログレスバー */}
                  <Box mt={1} mb={0.5}>
                    <LinearProgress
                      variant="determinate"
                      value={session.progress}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {/* 進捗パーセンテージ */}
                  <Typography variant="caption" color="text.secondary" component="div">
                    {session.progress}% 完了
                  </Typography>
                </Box>

                <ListItemSecondaryAction>
                  <Box display="flex" gap={1}>
                    {!session.isExpired && ['pending', 'uploading'].includes(session.status) && (
                      <IconButton
                        color="primary"
                        onClick={() => onResume(session.sessionId, session.fileName)}
                        disabled={isLoading}
                        title="再開"
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    )}

                    <IconButton
                      color="error"
                      onClick={() => onDelete(session.sessionId)}
                      disabled={isLoading}
                      title="削除"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>💡 再開のコツ:</strong>
          </Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>再開時は同じファイルを再度選択する必要があります</li>
            <li>WiFi接続が安定していることを確認してください</li>
            <li>バッテリー残量に余裕があることを確認してください</li>
            <li>期限切れのセッションは新しく開始してください</li>
          </ul>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
