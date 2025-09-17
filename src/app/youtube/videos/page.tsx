'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  VideoLibrary as VideoLibraryIcon,
  CloudUpload as CloudUploadIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/molescules/PageLayout';

interface SimpleVideo {
  id: string;
  title: string;
  youtube_url: string;
  created_at: string;
  match_date: string;
  match_type: 'external' | 'internal' | 'standalone';
}

const VideosPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [videos, setVideos] = useState<SimpleVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // Hydration対策
  useEffect(() => {
    setMounted(true);
  }, []);

  // 認証チェック
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin');
    }
  }, [user, authLoading, router]);

  // 動画一覧を取得
  useEffect(() => {
    if (user && mounted) {
      fetchVideos();
    }
  }, [user, mounted]);

  const fetchVideos = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/youtube/videos');

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `サーバーエラー (${response.status})`);
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          throw new Error(`サーバーエラー (${response.status}): ${errorText.substring(0, 100)}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response:', responseText);
        throw new Error('サーバーから正しいJSONレスポンスが返されませんでした');
      }

      const data = await response.json();
      console.log('Fetched videos:', data);

      setVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '動画一覧の取得に失敗しました');
      console.error('Videos fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openYouTubeVideo = (url: string) => {
    window.open(url, '_blank');
  };

  const handleUploadRedirect = useCallback(async () => {
    try {
      // 少し待機してからルーティング（ブラウザ拡張機能との競合を回避）
      await new Promise(resolve => setTimeout(resolve, 100));
      router.push('/youtube/upload');
    } catch (error) {
      console.error('Navigation error:', error);
      // フォールバック: 直接URLで遷移
      window.location.href = '/youtube/upload';
    }
  }, [router]);

  if (authLoading || !mounted) {
    return (
      <PageLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <LinearProgress sx={{ width: '50%' }} />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          mb={3}
          gap={{ xs: 2, sm: 0 }}
        >
          <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            動画一覧
          </Typography>
          <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleUploadRedirect}
              fullWidth
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 1.5, sm: 1 }
              }}
            >
              新規アップロード
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={{ xs: 3, sm: 4 }}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        ) : videos.length === 0 ? (
          <Paper sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
            <VideoLibraryIcon sx={{
              fontSize: { xs: 48, sm: 64 },
              color: 'text.secondary',
              mb: 2
            }} />
            <Typography
              variant="h6"
              color="text.secondary"
              gutterBottom
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              動画がありません
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              mb={3}
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              YouTube に動画をアップロードしてみましょう
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleUploadRedirect}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 1.5, sm: 1 },
                px: { xs: 3, sm: 2 }
              }}
            >
              動画をアップロード
            </Button>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 1, sm: 2 } }}>
            <List>
              {videos.map((video, index) => (
                <React.Fragment key={video.id}>
                  <ListItem
                    sx={{
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 2, sm: 0 },
                      py: { xs: 2, sm: 1 }
                    }}
                  >
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      flex: 1,
                      width: { xs: '100%', sm: 'auto' }
                    }}>
                      <ListItemIcon sx={{ minWidth: { xs: 40, sm: 56 } }}>
                        <VideoLibraryIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={video.title}
                        secondary={
                          <>
                            {video.match_type === 'external'
                              ? '部外試合'
                              : video.match_type === 'internal'
                                ? '部内試合'
                                : '一般動画'
                            }
                            <br />
                            {new Date(video.match_date).toLocaleString('ja-JP')}
                          </>
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            lineHeight: 1.4
                          },
                          '& .MuiListItemText-secondary': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }
                        }}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      onClick={() => openYouTubeVideo(video.youtube_url)}
                      sx={{
                        minWidth: { xs: '100%', sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        px: { xs: 2, sm: 1.5 },
                        py: { xs: 1, sm: 0.5 }
                      }}
                    >
                      YouTube で見る
                    </Button>
                  </ListItem>
                  {index < videos.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </PageLayout>
  );
};

export default VideosPage;
