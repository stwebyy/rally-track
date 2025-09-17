'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  InputLabel,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  VideoFile as VideoFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/molescules/PageLayout';
import {
  VideoUploadWithGame,
  MatchResult,
  MatchGame,
  HaratakuMatchResult,
  YOUTUBE_CATEGORIES,
} from '@/types/youtube';

// Games APIから返される実際のデータ型
type GamePlayerInfo = {
  name: string;
};

type InternalGameData = {
  id: string;
  player: GamePlayerInfo;
  opponent: GamePlayerInfo;
  player_game_set: number;
  opponent_game_set: number;
  harataku_match_result_id: string;
  created_at: string;
  updated_at: string;
  player_id: string;
  opponent_id: string;
};

const VideoUploadPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // フォーム状態
  const [formData, setFormData] = useState<VideoUploadWithGame>({
    video: null,
    title: '',
    description: '',
    thumbnail: undefined,
    matchType: undefined,
    matchResultId: undefined,
    gameResultId: undefined,
  });

  // UI状態
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [videoError, setVideoError] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // マッチデータ
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [haratakuResults, setHaratakuResults] = useState<HaratakuMatchResult[]>([]);
  const [matchGames, setMatchGames] = useState<MatchGame[]>([]);
  const [haratakuGames, setHaratakuGames] = useState<InternalGameData[]>([]);

  // ローディング状態
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);

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

  // マッチデータを読み込み
  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  // マッチ選択時にゲームデータを読み込み
  useEffect(() => {
    if (formData.matchType && formData.matchResultId) {
      fetchGames(formData.matchType, formData.matchResultId);
    } else {
      setMatchGames([]);
      setHaratakuGames([]);
      setFormData(prev => ({ ...prev, gameResultId: undefined }));
    }
  }, [formData.matchType, formData.matchResultId]);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const response = await fetch('/api/matches');
      if (!response.ok) throw new Error('Failed to fetch matches');

      const data = await response.json();
      setMatchResults(data.data.matchResults);
      setHaratakuResults(data.data.haratakuResults);
    } catch {
      setError('マッチデータの取得に失敗しました');
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchGames = async (type: 'external' | 'internal', matchId: number) => {
    setLoadingGames(true);
    try {
      const response = await fetch(`/api/games?type=${type}&matchId=${matchId}`);
      if (!response.ok) throw new Error('Failed to fetch games');

      const data = await response.json();

      if (type === 'external') {
        setMatchGames(data.data);
        setHaratakuGames([]);
      } else {
        setHaratakuGames(data.data);
        setMatchGames([]);
      }
    } catch {
      setError('ゲームデータの取得に失敗しました');
    } finally {
      setLoadingGames(false);
    }
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // ファイルサイズチェック（5GB）
      const maxSize = 5 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        setVideoError('ファイルサイズが5GBを超えています');
        return;
      }

      // ファイル形式チェック（より包括的なMIMEタイプリスト）
      const supportedFormats = [
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/quicktime', // MOVファイルの一般的なMIMEタイプ
        'video/wmv',
        'video/flv',
        'video/webm',
        'video/mkv',
        'video/m4v',
        'video/x-msvideo', // AVIファイルの別のMIMEタイプ
        'video/x-ms-wmv', // WMVファイルの別のMIMEタイプ
        '', // 一部のシステムでMIMEタイプが取得できない場合
      ];

      // ファイル拡張子による追加チェック
      const fileName = file.name.toLowerCase();
      const supportedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
      const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));

      if (!supportedFormats.includes(file.type) && !hasValidExtension) {
        setVideoError(`サポートされていない動画形式です (ファイル形式: ${file.type || '不明'}, ファイル名: ${file.name})`);
        return;
      }

      setFormData(prev => ({ ...prev, video: file }));
      setVideoError('');
    }
  };

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, thumbnail: file }));
    }
  };

  const removeVideo = () => {
    setFormData(prev => ({ ...prev, video: null }));
    setVideoError('');
  };

  const removeThumbnail = () => {
    setFormData(prev => ({ ...prev, thumbnail: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setVideoError('');

    // バリデーション
    if (!formData.video) {
      setVideoError('動画ファイルを選択してください');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('タイトルと説明文を入力してください');
      return;
    }

    // 試合情報は任意項目（matchResultId と gameResultId の両方が設定されているか、両方とも未設定である必要がある）
    if ((formData.matchResultId && !formData.gameResultId) || (!formData.matchResultId && formData.gameResultId)) {
      setError('試合を選択した場合は、ゲームも選択してください');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('video', formData.video);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('categoryId', YOUTUBE_CATEGORIES.SPORTS);

      // 試合情報が選択されている場合のみ追加
      if (formData.matchType && formData.matchResultId && formData.gameResultId) {
        uploadFormData.append('matchType', formData.matchType);
        uploadFormData.append('matchResultId', formData.matchResultId.toString());
        uploadFormData.append('gameResultId', formData.gameResultId.toString());
      }

      if (formData.thumbnail) {
        uploadFormData.append('thumbnail', formData.thumbnail);
      }

      const response = await fetch('/api/youtube/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const responseText = await response.text();

        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || 'アップロードに失敗しました');
        } catch {
          // JSONパースに失敗した場合、HTMLエラーページが返されている可能性
          throw new Error(`サーバーエラー (${response.status}): ${responseText.substring(0, 200)}...`);
        }
      }

      await response.json();

      setSuccess('動画のアップロードを開始しました。処理完了まで時間がかかる場合があります。');

      // フォームをリセット
      setFormData({
        video: null,
        title: '',
        description: '',
        thumbnail: undefined,
        matchType: undefined,
        matchResultId: undefined,
        gameResultId: undefined,
      });

      // 動画一覧ページへ遷移
      setTimeout(() => {
        router.push('/youtube/videos');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードエラーが発生しました');
    } finally {
      setUploading(false);
    }
  };

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
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        動画アップロード
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* 動画ファイル選択 */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              動画ファイル
            </Typography>

            {!formData.video ? (
              <Box
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 200,
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                component="label"
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  style={{ display: 'none' }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <CloudUploadIcon
                    sx={{
                      fontSize: 64,
                      color: 'text.secondary',
                      opacity: 0.7,
                    }}
                  />
                  <Box textAlign="center">
                    <Typography variant="body1" color="text.primary" fontWeight="medium" gutterBottom>
                      動画ファイルを選択またはドラッグ&ドロップ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      対応形式: MP4, AVI, MOV (QuickTime), WMV, FLV, WebM, MKV, M4V (最大5GB)
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <VideoFileIcon sx={{ color: 'primary.contrastText' }} />
                      </Box>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {formData.video.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {Math.round(formData.video.size / 1024 / 1024)} MB
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      onClick={removeVideo}
                      color="error"
                      sx={{
                        '&:hover': {
                          backgroundColor: 'error.light',
                          color: 'error.contrastText',
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 動画ファイル選択のエラーメッセージ */}
            {videoError && (
              <Box mt={2}>
                <Alert severity="error">{videoError}</Alert>
              </Box>
            )}
          </Box>

          {/* タイトル */}
          <Box mb={3}>
            <TextField
              fullWidth
              label="タイトル"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              disabled={uploading}
            />
          </Box>

          {/* 説明文 */}
          <Box mb={3}>
            <TextField
              fullWidth
              label="説明文"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              disabled={uploading}
            />
          </Box>

          {/* サムネイル */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              サムネイル（オプション）
            </Typography>

            {!formData.thumbnail ? (
              <Box
                sx={{
                  border: '1px dashed #ccc',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 100,
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                component="label"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  style={{ display: 'none' }}
                />
                <Typography variant="body2" color="text.secondary">
                  📷 カスタムサムネイルを選択
                </Typography>
              </Box>
            ) : (
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        🖼️
                      </Typography>
                      <Typography variant="body2">
                        {formData.thumbnail.name}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={removeThumbnail}
                      color="error"
                      size="small"
                      sx={{
                        '&:hover': {
                          backgroundColor: 'error.light',
                          color: 'error.contrastText',
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* 試合タイプ選択 */}
          <Box mb={3}>
            <FormControl>
              <FormLabel>試合情報</FormLabel>
              <RadioGroup
                row
                value={formData.matchType || 'none'}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'none') {
                    setFormData(prev => ({
                      ...prev,
                      matchType: undefined,
                      matchResultId: undefined,
                      gameResultId: undefined,
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      matchType: value as 'external' | 'internal',
                      matchResultId: undefined,
                      gameResultId: undefined,
                    }));
                  }
                }}
              >
                <FormControlLabel value="none" control={<Radio />} label="試合情報なし" />
                <FormControlLabel value="external" control={<Radio />} label="対外試合" />
                <FormControlLabel value="internal" control={<Radio />} label="部内試合" />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* 試合選択 - 試合タイプが選択された場合のみ表示 */}
          {formData.matchType && (
            <Box mb={3}>
              <FormControl fullWidth>
                <InputLabel>試合を選択</InputLabel>
                <Select
                  value={formData.matchResultId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, matchResultId: Number(e.target.value) }))}
                  label="試合を選択"
                  disabled={loadingMatches || uploading}
                >
                  {formData.matchType === 'external'
                    ? matchResults.map((match) => (
                        <MenuItem key={match.id} value={match.id}>
                          {match.player_team_name} vs {match.opponent_team_name}
                          {match.game_no && ` (第${match.game_no}試合)`}
                        </MenuItem>
                      ))
                    : haratakuResults.map((match) => (
                        <MenuItem key={match.id} value={match.id}>
                          {new Date(match.date).toLocaleDateString('ja-JP')}
                          {match.location && ` - ${match.location}`}
                        </MenuItem>
                      ))
                  }
                </Select>
              </FormControl>
            </Box>
          )}

          {/* ゲーム選択 */}
          {formData.matchResultId && (
            <Box mb={3}>
              <FormControl fullWidth>
                <InputLabel>ゲームを選択</InputLabel>
                <Select
                  value={formData.gameResultId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, gameResultId: Number(e.target.value) }))}
                  label="ゲームを選択"
                  disabled={loadingGames || uploading}
                >
                  {formData.matchType === 'external'
                    ? matchGames.map((game) => (
                        <MenuItem key={game.id} value={game.id}>
                          {game.is_doubles ? 'ダブルス' : 'シングルス'}
                          {game.game_no && ` - 第${game.game_no}ゲーム`}
                          {` (${game.team_sets}-${game.opponent_sets})`}
                        </MenuItem>
                      ))
                    : haratakuGames.map((game) => (
                        <MenuItem key={game.id} value={game.id}>
                          {game.player?.name || '不明'} vs {game.opponent?.name || '不明'}
                          {` (${game.player_game_set}-${game.opponent_game_set})`}
                        </MenuItem>
                      ))
                  }
                </Select>
              </FormControl>
            </Box>
          )}

          {/* エラー・成功メッセージ */}
          {error && (
            <Box mb={2}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          {success && (
            <Box mb={2}>
              <Alert severity="success">{success}</Alert>
            </Box>
          )}

          {/* アップロード進捗 */}
          {uploading && (
            <Box mb={2}>
              <LinearProgress variant="indeterminate" />
              <Typography variant="body2" color="text.secondary" align="center" mt={1}>
                アップロード中...
              </Typography>
            </Box>
          )}

          {/* 送信ボタン */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={uploading || !formData.video || !formData.title || !formData.description}
            sx={{ mt: 2 }}
          >
            {uploading ? 'アップロード中...' : '動画をアップロード'}
          </Button>
        </form>

        {/* プライバシー注意書き */}
        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="body2" color="text.secondary">
            <strong>プライバシー設定:</strong> すべての動画は限定公開でアップロードされます。
            URLを知っている人のみが視聴可能です。
          </Typography>
        </Box>
      </Paper>
    </Box>
    </PageLayout>
  );
};

export default VideoUploadPage;
