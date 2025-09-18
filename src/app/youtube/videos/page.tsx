'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Pagination,
} from '@mui/material';
import {
  VideoLibrary as VideoLibraryIcon,
  CloudUpload as CloudUploadIcon,
  OpenInNew as OpenInNewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/molescules/PageLayout';

type SimpleVideo = {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
              {paginatedVideos.map((video, index) => (
                <React.Fragment key={video.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'row',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 1, sm: 0 },
                      pt: { xs: 2, sm: 1 },
                      pb: { xs: 0, sm: 1 }
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
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxHeight: { xs: '4.2em', sm: '4.2em' }
                          },
                          '& .MuiListItemText-secondary': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }
                        }}
                      />
                    </Box>
                    <Box sx={{
                      display: 'flex',
                      gap: { xs: 0.5, sm: 1 },
                      flexDirection: { xs: 'column', sm: 'row' },
                      flexShrink: 0,
                      ml: { xs: 0, sm: 0 },
                      minWidth: { xs: '90px', sm: 'auto' },
                      maxWidth: { xs: '90px', sm: 'none' }
                    }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => router.push(`/youtube/edit/${video.id.replace(/^(external_|internal_|standalone_)/, '')}`)}
                        sx={{
                          fontSize: { xs: '0.625rem', sm: '0.875rem' },
                          px: { xs: 0.5, sm: 1.5 },
                          py: { xs: 0.25, sm: 0.5 },
                          minWidth: { xs: 'auto', sm: 'unset' },
                          '& .MuiButton-startIcon': {
                            marginRight: { xs: '4px', sm: '8px' },
                            marginLeft: { xs: 0, sm: '-4px' }
                          }
                        }}
                      >
                        編集
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => openYouTubeVideo(video.youtube_url)}
                        sx={{
                          fontSize: { xs: '0.625rem', sm: '0.875rem' },
                          px: { xs: 0.5, sm: 1.5 },
                          py: { xs: 0.25, sm: 0.5 },
                          minWidth: { xs: 'auto', sm: 'unset' },
                          '& .MuiButton-startIcon': {
                            marginRight: { xs: '4px', sm: '8px' },
                            marginLeft: { xs: 0, sm: '-4px' }
                          }
                        }}
                      >
                        YouTube
                      </Button>
                    </Box>
                  </ListItem>
                  {index < paginatedVideos.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

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
          </Paper>
        )}
      </Box>
    </PageLayout>
  );
};

export default VideosPage;
