'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  IconButton,
  InputLabel,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  VideoFile as VideoFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/molescules/PageLayout';
import { UploadProgressUI } from '@/components';

import { YouTubeDirectUploader } from '@/lib/youtubeDirectUploader';
import {
  VideoMetadata,
  UploadProgress,
  SessionStatusResponse,
} from '@/types/youtube-upload';
import {
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

interface VideoUploadFormData {
  video: File | null;
  title: string;
  description: string;
  matchType: 'match' | 'harataku' | undefined;
  matchResultId: number | undefined;
  gameResultId: number | undefined;
}

const VideoUploadPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // フォーム状態
  const [formData, setFormData] = useState<VideoUploadFormData>({
    video: null,
    title: '',
    description: '',
    matchType: undefined,
    matchResultId: undefined,
    gameResultId: undefined,
  });

  // アップロード状態
  const [currentUpload, setCurrentUpload] = useState<{
    session: SessionStatusResponse | null;
    progress: UploadProgress | null;
    uploader: YouTubeDirectUploader | null;
  }>({
    session: null,
    progress: null,
    uploader: null
  });

  // UI状態
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

    // Chrome拡張機能などのエラーを無視するためのグローバルエラーハンドラー
    const originalError = console.error;
    const originalLog = console.log;

    const filterError = (message: unknown, ...args: unknown[]) => {
      const msgStr = String(message);

      // Chrome拡張機能関連のエラーを無視
      if (msgStr.includes('chrome-extension://') ||
          msgStr.includes('frame_ant.js') ||
          (msgStr.includes('Failed to fetch') && args.some(arg => String(arg).includes('chrome-extension')))) {
        return;
      }

      // アップロード完了時の特定のエラーログを情報レベルに変更
      if (msgStr.includes('Failed to parse completion response') ||
          msgStr.includes('Response status: 200') ||
          msgStr.includes('Response headers: {}')) {
        console.info('Upload completion info:', message, ...args);
        return;
      }

      originalError(message, ...args);
    };

    console.error = filterError;

    // クリーンアップ
    return () => {
      console.error = originalError;
      console.log = originalLog;
    };
  }, []);

  // 認証チェック - クライアント側のみで実行
  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/signin');
    }
  }, [mounted, user, authLoading, router]);

  // マッチデータ読み込み - クライアント側のみで実行
  useEffect(() => {
    if (mounted && user) {
      fetchMatches();
    }
  }, [mounted, user]);

  // マッチ選択時にゲームデータを読み込み
  useEffect(() => {
    if (formData.matchType && formData.matchResultId) {
      const apiType = formData.matchType === 'match' ? 'external' : 'internal';
      fetchGames(apiType, formData.matchResultId);
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
    const files = event.target.files;

    // 複数ファイルが選択された場合のチェック
    if (files && files.length > 1) {
      setVideoError('一度に選択できる動画ファイルは1つだけです');
      return;
    }

    const file = files?.[0];
    if (file) {
      // ファイルサイズチェック（5GB）
      const maxSize = 5 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        setVideoError('ファイルサイズが5GBを超えています');
        return;
      }

      // ファイル形式チェック
      const supportedFormats = [
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/quicktime',
        'video/wmv',
        'video/flv',
        'video/webm',
        'video/mkv',
        'video/m4v',
      ];

      const fileName = file.name.toLowerCase();
      const supportedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
      const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));

      if (!supportedFormats.includes(file.type) && !hasValidExtension) {
        setVideoError(`サポートされていない動画形式です: ${file.name}`);
        return;
      }

      setFormData(prev => ({ ...prev, video: file }));
      setVideoError('');
      setError('');
    }
  };

  const handleRemoveVideo = () => {
    setFormData(prev => ({ ...prev, video: null }));
    setVideoError('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

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

    try {
      // アップロードメタデータ作成
      const metadata: VideoMetadata = {
        title: formData.title,
        description: formData.description,
        tags: ['rally-track', 'table-tennis', 'ping-pong'],
        categoryId: YOUTUBE_CATEGORIES.SPORTS,
        privacy: 'unlisted',
        matchType: formData.matchType,
        gameResultId: formData.gameResultId?.toString()
      };

      // YouTube直接アップローダーを作成
      const uploader = new YouTubeDirectUploader((progress) => {
        setCurrentUpload(prev => ({
          ...prev,
          progress
        }));
      });

      // アップロード開始
      setCurrentUpload(prev => ({
        ...prev,
        uploader
      }));

      const youtubeVideoId = await uploader.startUpload(formData.video, metadata);

      // CORSエラー回復の場合の特別なメッセージ
      if (youtubeVideoId === 'upload_completed_cors_error' || youtubeVideoId === 'upload_completed_cors_recovery') {
        setSuccess(`アップロードが完了しました！\n（※技術的な理由によりVideo IDを取得できませんでしたが、アップロードは成功しています）`);
      } else {
        setSuccess(`アップロードが完了しました！YouTube Video ID: ${youtubeVideoId}`);
      }

      // フォームをリセット
      setFormData({
        video: null,
        title: '',
        description: '',
        matchType: undefined,
        matchResultId: undefined,
        gameResultId: undefined,
      });

      setCurrentUpload({
        session: null,
        progress: null,
        uploader: null
      });

      // 動画一覧ページへ遷移
      setTimeout(() => {
        router.push('/youtube/videos');
      }, 3000);

    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'アップロードエラーが発生しました';

      // YouTube APIクォータ超過エラーの場合
      if (errorMessage.includes('本日のYouTube APIクォータを超過しています')) {
        setError('本日のアップロード上限に達しました。\n明日以降に再度お試しください。');
        setCurrentUpload(prev => ({
          ...prev,
          uploader: null
        }));
        return;
      }

      // 特定のエラータイプに応じて適切なメッセージを表示
      if (errorMessage.includes('アップロードは完了しましたが、動画IDの取得に失敗しました')) {
        // アップロード成功だが ID取得失敗のケース
        setSuccess('⚠️ アップロードは完了しました！\n' +
                  'ただし、技術的な理由により動画IDの取得に失敗しました。\n' +
                  'YouTubeの管理画面（YouTube Studio）でアップロードされた動画を確認してください。');

        // フォームをリセット（成功扱い）
        setFormData({
          video: null,
          title: '',
          description: '',
          matchType: undefined,
          matchResultId: undefined,
          gameResultId: undefined,
        });

        setTimeout(() => {
          router.push('/youtube/videos');
        }, 5000);

        return; // エラーとして扱わない
      }

      // CORSエラーの場合、より分かりやすいメッセージに変更
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
        errorMessage = 'ネットワーク接続エラーが発生しました。\n' +
                     'ブラウザ拡張機能による干渉の可能性があります。\n' +
                     '再度お試しいただくか、別のブラウザをご利用ください。';
      }

      setError(errorMessage);
      setCurrentUpload(prev => ({
        ...prev,
        uploader: null
      }));
    }
  };

  // アップロードキャンセル
  const handleCancelUpload = () => {
    if (currentUpload.uploader) {
      currentUpload.uploader.abort();
      setCurrentUpload({
        session: null,
        progress: null,
        uploader: null
      });
    }
  };

  // サーバーサイドレンダリング時はプレースホルダーを表示
  if (!mounted) {
    return (
      <PageLayout>
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
          <Typography variant="h4" gutterBottom>
            動画アップロード
          </Typography>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="60vh"
            sx={{
              background: 'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              読み込み中...
            </Typography>
          </Box>
        </Box>
      </PageLayout>
    );
  }

  // 認証読み込み中はローディング表示
  if (authLoading) {
    return (
      <PageLayout>
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <Typography>読み込み中...</Typography>
          </Box>
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

        {/* 現在のアップロード進行状況 - クライアントマウント後のみ表示 */}
        {mounted && currentUpload.uploader && (
          <Box mb={3}>
            <UploadProgressUI
              session={currentUpload.session || undefined}
              progress={currentUpload.progress || undefined}
              onCancel={handleCancelUpload}
              showGuidance={true}
            />
          </Box>
        )}

        {/* エラー・成功メッセージ - クライアントマウント後のみ表示 */}
        {mounted && (
          <>
            {/* 一般エラー */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Box component="div" sx={{ whiteSpace: 'pre-line' }}>
                  {error}
                </Box>
              </Alert>
            )}

            {/* 成功メッセージ */}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
          </>
        )}

        {/* メインコンテンツ - マウント後のみ表示 */}
        {mounted && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Alert severity="warning" sx={{ mb: 1 }}>
                <ul>
                  <li>動画選択後、しばらくそのままで待機する必要があるので注意してください</li>
                  <li>アップロード中はブラウザを閉じないでください</li>
                </ul>
            </Alert>
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
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 120,
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
                    multiple={false}
                    onChange={handleVideoSelect}
                    disabled={!!currentUpload.uploader}
                    style={{ display: 'none' }}
                  />
                  <CloudUploadIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="subtitle1" color="text.secondary">
                    動画ファイルを選択またはドラッグ&ドロップ
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    MP4, MOV, AVI形式に対応
                  </Typography>
                </Box>
              ) : (
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <VideoFileIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="subtitle1">
                            {formData.video.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(formData.video.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        onClick={handleRemoveVideo}
                        color="error"
                        disabled={!!currentUpload.uploader}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {videoError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {videoError}
                </Alert>
              )}
            </Box>

            {/* 基本情報 */}
            <Box mb={3}>
              <TextField
                fullWidth
                label="タイトル *"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                disabled={!!currentUpload.uploader}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="説明 *"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={!!currentUpload.uploader}
              />
            </Box>

            {/* 試合情報（任意） */}
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                試合情報（任意）
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                動画を特定の試合と関連付けることができます
              </Typography>

              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend">試合タイプ</FormLabel>
                <RadioGroup
                  value={formData.matchType || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setFormData(prev => ({
                        ...prev,
                        matchType: undefined,
                        matchResultId: undefined,
                        gameResultId: undefined,
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        matchType: value as 'match' | 'harataku',
                        matchResultId: undefined,
                        gameResultId: undefined,
                      }));
                    }
                  }}
                >
                  <FormControlLabel
                    value=""
                    control={<Radio />}
                    label="試合と関連付けない"
                    disabled={!!currentUpload.uploader}
                  />
                  <FormControlLabel
                    value="match"
                    control={<Radio />}
                    label="外部試合"
                    disabled={!!currentUpload.uploader}
                  />
                  <FormControlLabel
                    value="harataku"
                    control={<Radio />}
                    label="部内試合"
                    disabled={!!currentUpload.uploader}
                  />
                </RadioGroup>
              </FormControl>

              {formData.matchType && (
                <Box>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>試合選択</InputLabel>
                    <Select
                      value={formData.matchResultId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, matchResultId: Number(e.target.value) }))}
                      disabled={loadingMatches || !!currentUpload.uploader}
                    >
                      {formData.matchType === 'match'
                        ? matchResults.map((match) => (
                            <MenuItem key={match.id} value={match.id}>
                              {match.player_team_name} vs {match.opponent_team_name} - Match {match.id}
                            </MenuItem>
                          ))
                        : haratakuResults.map((match) => (
                            <MenuItem key={match.id} value={match.id}>
                              {match.created_at.split('T')[0]} - Match {match.id}
                            </MenuItem>
                          ))}
                    </Select>
                  </FormControl>

                  {formData.matchResultId && (
                    <FormControl fullWidth>
                      <InputLabel>ゲーム選択</InputLabel>
                      <Select
                        value={formData.gameResultId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, gameResultId: Number(e.target.value) }))}
                        disabled={loadingGames || !!currentUpload.uploader}
                      >
                        {formData.matchType === 'match'
                          ? matchGames.map((game) => (
                              <MenuItem key={game.id} value={game.id}>
                                Game {game.id} - Set {game.team_sets}:{game.opponent_sets}
                              </MenuItem>
                            ))
                          : haratakuGames.map((game) => (
                              <MenuItem key={game.id} value={game.id}>
                                {game.player.name} vs {game.opponent.name} ({game.player_game_set}-{game.opponent_game_set})
                              </MenuItem>
                            ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              )}
            </Box>

            {/* アップロードボタン */}
            <Box textAlign="center" mt={3}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<CloudUploadIcon />}
                disabled={!!currentUpload.uploader || !formData.video || !formData.title || !formData.description}
                sx={{ minWidth: 200 }}
              >
                {currentUpload.uploader ? 'アップロード中...' : '動画をアップロード'}
              </Button>
            </Box>
          </form>
          </Paper>
        )}

        {/* ガイダンス */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            📱 アップロード時の注意
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            <li>充電十分な状態で開始してください</li>
            <li>安定したWiFi接続を使用してください</li>
            <li>ブラウザを閉じたり、他のアプリを使用するとアップロードが一時停止します</li>
            <li>アップロード中は画面をロックしないでください</li>
            <li>アップロード途中で中断した場合、画面上部の未完了のアップロードをチェックボタンを押下して再開してください</li>
          </ul>
        </Alert>

        {/* プライバシー注意書き */}
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            アップロードされた動画は限定公開設定でYouTubeに投稿されます。
            リンクを知っている人のみ視聴できます。
          </Typography>
        </Alert>
      </Box>
    </PageLayout>
  );
};

export default VideoUploadPage;
