'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { createClient } from '@/utils/supabase/client';
import { MatchResult, GameResult } from '@/types/club';
import PageLayout from '@/components/molescules/PageLayout';

export default function MatchResultDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null);
  const [gameResults, setGameResults] = React.useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const supabase = createClient();

  const loadData = React.useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // 試合結果の取得
      const { data: matchData, error: matchError } = await supabase
        .from('harataku_match_results')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (matchError) {
        throw matchError;
      }

      setMatchResult(matchData);

      // ゲーム結果の取得（プレイヤー情報も含む）
      const { data: gameData, error: gameError } = await supabase
        .from('harataku_game_results')
        .select(`
          *,
          player:harataku_members!player_id(*),
          opponent:harataku_members!opponent_id(*),
          harataku_game_movies (
            game_movies (
              id,
              title,
              url,
              created_at
            )
          )
        `)
        .eq('harataku_match_result_id', parseInt(id))
        .order('id');

      if (gameError) {
        throw gameError;
      }

      setGameResults(gameData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [id, supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = () => {
    router.push('/club');
  };

  const handleEdit = () => {
    router.push(`/club/edit/${id}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('harataku_match_results')
        .delete()
        .eq('id', parseInt(id));

      if (error) {
        throw error;
      }

      router.push('/club');
    } catch (error) {
      console.error('Error deleting match result:', error);
      alert('削除に失敗しました');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="部内試合結果詳細">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Typography>読み込み中...</Typography>
        </Box>
      </PageLayout>
    );
  }

  if (error || !matchResult) {
    return (
      <PageLayout title="部内試合結果詳細">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || '試合結果が見つかりません'}
        </Alert>
        <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
          一覧に戻る
        </Button>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="部内試合結果詳細">
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
          一覧に戻る
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleEdit}
            startIcon={<EditIcon />}
          >
            編集
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            startIcon={<DeleteIcon />}
          >
            削除
          </Button>
        </Stack>
      </Box>

      {/* 試合情報 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="試合情報"
          avatar={<EventIcon />}
        />
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon color="action" />
              <Typography variant="body1">
                <strong>日付:</strong> {matchResult.date.split('T')[0]}
              </Typography>
            </Box>
            {matchResult.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon color="action" />
                <Typography variant="body1">
                  <strong>場所:</strong> {matchResult.location}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ゲーム結果 */}
      <Card>
        <CardHeader
          title={`ゲーム結果 (${gameResults.length}件)`}
        />
        <CardContent>
          {gameResults.length === 0 ? (
            <Typography color="text.secondary">
              ゲーム結果がありません
            </Typography>
          ) : (
            <Stack spacing={3}>
              {gameResults.map((game, index) => (
                <Card key={game.id || index} variant="outlined">
                  <CardContent>
                    {/* 中央: スコアと結果 */}
                    <Box sx={{ textAlign: 'center' }}>
                      {/* プレイヤー名表示 - 固定レイアウト */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1,
                        gap: 1
                      }}>
                        <Typography
                          variant="h6"
                          sx={{
                            flex: '1 1 0',
                            textAlign: 'right',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: { xs: '120px', sm: '200px' }
                          }}
                        >
                          {game.player?.name || `プレイヤーID: ${game.player_id}`}
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            flexShrink: 0,
                            fontWeight: 'bold',
                            px: 1
                          }}
                        >
                          vs
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{
                            flex: '1 1 0',
                            textAlign: 'left',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: { xs: '120px', sm: '200px' }
                          }}
                        >
                          {game.opponent?.name || `プレイヤーID: ${game.opponent_id}`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={game.player_game_set}
                          color={game.player_game_set > game.opponent_game_set ? 'success' : 'default'}
                          sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                        <Typography variant="h6">-</Typography>
                        <Chip
                          label={game.opponent_game_set}
                          color={game.opponent_game_set > game.player_game_set ? 'error' : 'default'}
                          sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                      </Box>
                    </Box>

                    {/* 動画がある場合 */}
                    {game.harataku_game_movies && game.harataku_game_movies.length > 0 && (
                      <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
                          📹 関連動画 ({game.harataku_game_movies.length}件)
                        </Typography>
                        <Stack spacing={1}>
                          {game.harataku_game_movies.map((movieItem, movieIndex) => (
                            <Box key={movieIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ flex: 1, fontSize: '0.875rem' }}>
                                {movieItem.game_movies.title}
                              </Typography>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => window.open(movieItem.game_movies.url, '_blank')}
                                sx={{
                                  fontSize: '0.75rem',
                                  minWidth: 'auto',
                                  px: 1.5,
                                  py: 0.5
                                }}
                              >
                                YouTubeで見る
                              </Button>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>部内試合結果を削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この部内試合結果を削除しますか？この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={deleting}
          >
            {deleting ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};
