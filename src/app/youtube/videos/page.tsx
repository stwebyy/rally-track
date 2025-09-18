'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Pagination,
  Fab,
} from '@mui/material';
import {
  VideoLibrary as VideoLibraryIcon,
  CloudUpload as CloudUploadIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/molescules/PageLayout';
import VideoThumbnailCard from '@/components/molescules/VideoThumbnailCard';
import { useVideoSync } from '@/hooks/api/useVideoSync';

type SimpleVideo = {
  id: string;
  title: string;
  youtube_url: string;
  created_at: string;
  match_date: string;
  match_type: 'external' | 'internal' | 'standalone';
  videoId?: string;
  videoIdStatus?: string;
  sessionId?: string;
}

const VideosPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { syncVideo, isSyncing } = useVideoSync();

  const [videos, setVideos] = useState<SimpleVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchVideos = useCallback(async () => {
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
  }, []);

  // 同期処理のハンドラ
  const handleSync = useCallback(async (sessionId: string) => {
    const result = await syncVideo(sessionId);
    if (result.success) {
      // 成功時は動画一覧を再取得
      await fetchVideos();
    } else {
      // エラー表示（実際のアプリでは適切な通知システムを使用）
      setError(result.error || '同期に失敗しました');
      setTimeout(() => setError(''), 5000);
    }
  }, [syncVideo, fetchVideos]);

  // ページネーション用のデータ計算
  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return videos.slice(startIndex, startIndex + itemsPerPage);
  }, [videos, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(videos.length / itemsPerPage);

  // ページ変更ハンドラ
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    // ページ変更時にトップにスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  }, [user, mounted, fetchVideos]);

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
          <Box>
            {/* 動画グリッド */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: { xs: 2, sm: 3 },
                mb: 3
              }}
            >
              {paginatedVideos.map((video) => (
                <Box key={video.id} sx={{ position: 'relative' }}>
                  <VideoThumbnailCard
                    title={video.title}
                    youtubeUrl={video.youtube_url}
                    matchDate={video.match_date}
                    matchType={video.match_type}
                    videoId={video.videoId}
                    videoIdStatus={video.videoIdStatus as 'completed' | 'placeholder' | 'manual' | 'failed'}
                    sessionId={video.sessionId}
                    onSync={handleSync}
                    syncInProgress={video.sessionId ? isSyncing(video.sessionId) : false}
                  />
                  {/* 編集ボタンをカードの右上に配置 */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1
                    }}
                  >
                    <Fab
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/youtube/edit/${video.id.replace(/^(external_|internal_|standalone_)/, '')}`);
                      }}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 1)',
                        },
                        boxShadow: 2
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </Fab>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* ページネーション */}
            {videos.length > itemsPerPage && (
              <>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mt: 3,
                  mb: 2
                }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    size="small"
                    color="primary"
                    showFirstButton
                    showLastButton
                    sx={{
                      '& .MuiPagination-ul': {
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                  />
                </Box>

                {/* 件数表示 */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    mb: 1
                  }}
                >
                  {videos.length}件中 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, videos.length)}件を表示
                </Typography>
              </>
            )}
          </Box>
        )}
      </Box>
    </PageLayout>
  );
};

export default VideosPage;
