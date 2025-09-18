import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Skeleton,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Alert
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { getYouTubeThumbnailFromUrl } from '@/utils/youtube';
import type { VideoIdStatus } from '@/types/youtube-upload';

interface VideoThumbnailCardProps {
  title: string;
  youtubeUrl: string;
  matchDate: string;
  matchType: 'external' | 'internal' | 'standalone';
  videoId?: string;
  videoIdStatus?: VideoIdStatus;
  sessionId?: string;
  onSync?: (sessionId: string) => void;
  syncInProgress?: boolean;
}

const VideoThumbnailCard: React.FC<VideoThumbnailCardProps> = ({
  title,
  youtubeUrl,
  matchDate,
  matchType,
  videoId,
  videoIdStatus,
  sessionId,
  onSync,
  syncInProgress = false
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // プレースホルダーかどうかを判定
  const isPlaceholder = videoId?.startsWith('placeholder_') || videoIdStatus === 'placeholder';

  // サムネイル画像のURLを取得（プレースホルダーの場合は汎用画像）
  const thumbnailUrl = isPlaceholder
    ? '/api/placeholder.jpg' // プレースホルダー用の画像
    : getYouTubeThumbnailFromUrl(youtubeUrl, 'hqdefault');

  // 試合タイプのラベルを取得
  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'external': return '部外試合';
      case 'internal': return '部内試合';
      case 'standalone': return '一般動画';
      default: return '動画';
    }
  };

  // YouTubeを開く（プレースホルダーの場合は無効）
  const handleClick = () => {
    if (!isPlaceholder) {
      window.open(youtubeUrl, '_blank');
    }
  };

  // 同期ボタンのクリック処理
  const handleSyncClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessionId && onSync && !syncInProgress) {
      onSync(sessionId);
    }
  };

  // 画像読み込み完了
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // 画像読み込みエラー
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': !isPlaceholder ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        } : {},
        opacity: isPlaceholder ? 0.8 : 1
      }}
    >
      {isPlaceholder ? (
        // プレースホルダー動画の表示（CardActionAreaなし）
        <>
          {/* サムネイル画像部分 */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%', // 16:9 アスペクト比
              backgroundColor: theme.palette.grey[300],
              overflow: 'hidden'
            }}
          >
            {/* プレースホルダー表示 */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.palette.grey[300],
                color: theme.palette.text.secondary
              }}
            >
              <HourglassEmptyIcon sx={{ fontSize: isMobile ? 48 : 64 }} />
            </Box>
          </Box>

          {/* コンテンツ部分 */}
          <CardContent
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              p: isMobile ? 2 : 3
            }}
          >
            {/* タイトル */}
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 500,
                lineHeight: 1.4,
                mb: 1,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minHeight: isMobile ? '2.8em' : '3.08em' // 2行分の最小高さを確保
              }}
            >
              {title}
            </Typography>

            {/* メタデータ */}
            <Box sx={{ mt: 'auto' }}>
              {/* プレースホルダーの場合は高さ維持のための空のスペース */}
              {!isPlaceholder && (
              <Box sx={{
                height: isMobile ? '2.5rem' : '3rem', // ラベルと日時分の高さを確保
                mb: 1
              }}>
                {/* プレースホルダーでない場合のみラベルと日時を表示 */}
                {!isPlaceholder && (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        mb: 0.5
                      }}
                    >
                      {getMatchTypeLabel(matchType)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                      }}
                    >
                      {new Date(matchDate).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </>
                )}
              </Box>

              )}
              {/* プレースホルダー状態表示と同期ボタン */}
              <Alert
                severity="warning"
                sx={{
                  mb: 1.5,
                  fontSize: '0.75rem',
                  '& .MuiAlert-message': {
                    fontSize: '0.75rem'
                  }
                }}
              >
                YouTube側が処理中なので時間を置いてから同期ボタンを押してください。
              </Alert>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap'
                }}
              >
                <Chip
                  label="未同期"
                  color="warning"
                  size="small"
                  icon={<HourglassEmptyIcon />}
                  sx={{ fontSize: '0.75rem' }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSyncClick}
                  startIcon={<SyncIcon />}
                  disabled={syncInProgress}
                  sx={{
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    px: 1.5
                  }}
                >
                  {syncInProgress ? '同期中...' : '同期'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </>
      ) : (
        // 通常動画の表示（CardActionArea使用）
        <CardActionArea
          onClick={handleClick}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch'
          }}
        >
          {/* サムネイル画像部分 */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%', // 16:9 アスペクト比
              backgroundColor: theme.palette.grey[200],
              overflow: 'hidden'
            }}
          >
            {imageLoading && (
              <Skeleton
                variant="rectangular"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}
              />
            )}

            {thumbnailUrl && !imageError ? (
              <CardMedia
                component="img"
                image={thumbnailUrl}
                alt={title}
                onLoad={handleImageLoad}
                onError={handleImageError}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: imageLoading ? 'none' : 'block'
                }}
              />
            ) : (
              !imageLoading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.palette.grey[300],
                    color: theme.palette.text.secondary
                  }}
                >
                  <Typography variant="body2">
                    サムネイルを読み込めません
                  </Typography>
                </Box>
              )
            )}

            {/* 再生ボタンオーバーレイ */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                opacity: 0,
                transition: 'opacity 0.3s ease-in-out',
                '&:hover': {
                  opacity: 1
                }
              }}
            >
              <PlayArrowIcon
                sx={{
                  fontSize: isMobile ? 48 : 64,
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '50%',
                  padding: 1
                }}
              />
            </Box>
          </Box>

          {/* コンテンツ部分 */}
          <CardContent
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              p: isMobile ? 2 : 3
            }}
          >
            {/* タイトル */}
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: 500,
                lineHeight: 1.4,
                mb: 1,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minHeight: isMobile ? '2.8em' : '3.08em' // 2行分の最小高さを確保
              }}
            >
              {title}
            </Typography>

            {/* メタデータ */}
            <Box sx={{ mt: 'auto' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  mb: 0.5
                }}
              >
                {getMatchTypeLabel(matchType)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }}
              >
                {new Date(matchDate).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      )}
    </Card>
  );
};

export default VideoThumbnailCard;
