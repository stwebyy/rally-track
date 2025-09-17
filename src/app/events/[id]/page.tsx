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
import PageLayout from '@/components/molescules/PageLayout';
import { Event, MatchGame, MatchResult, GameMovie, HaratakuMember } from '@/types/database';

type MatchGameWithDetails = MatchGame & {
  player?: HaratakuMember;
  player_2?: HaratakuMember;
  match_game_movies?: {
    game_movies: GameMovie;
  }[];
}

type MatchResultWithGames = MatchResult & {
  match_games: MatchGameWithDetails[];
}

type EventWithMatchResults = Event & {
  match_results: MatchResultWithGames[];
}

export default function EventDetail() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = React.useState<EventWithMatchResults | null>(null);
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const supabase = createClient();

  // イベントデータを取得する関数
  const loadEventData = React.useCallback(async () => {
    if (!eventId) return;

    setIsDataLoading(true);
    setError(null);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          match_results (
            *,
            match_games (
              *,
              player:harataku_members!player_name_id(*),
              player_2:harataku_members!player_name_2_id(*),
              match_game_movies (
                game_movies (
                  id,
                  title,
                  url,
                  created_at
                )
              )
            )
          )
        `)
        .eq('id', parseInt(eventId))
        .single();

      if (eventError) {
        throw eventError;
      }

      setEvent(eventData);
    } catch (error) {
      console.error('Error loading event data:', error);
      setError((error as Error).message);
    } finally {
      setIsDataLoading(false);
    }
  }, [supabase, eventId]);

  React.useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId, loadEventData]);

  const handleBack = () => {
    router.push('/events');
  };

  const handleEdit = () => {
    router.push(`/events/edit/${eventId}`);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        throw error;
      }

      router.push('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('削除に失敗しました');
    }
    setDeleteDialogOpen(false);
  };

  if (isDataLoading) {
    return (
      <PageLayout title="詳細表示">
        <Typography>データを読み込み中...</Typography>
      </PageLayout>
    );
  }

  if (error || !event) {
    return (
      <PageLayout title="エラー">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'イベントが見つかりません'}
        </Alert>
        <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
          一覧に戻る
        </Button>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={event.name}>

        {/* Header with actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
          >
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

        {/* Event Information Card */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={event.name}
            subheader={`ID: ${event.id}`}
            avatar={<EventIcon color="primary" />}
          />
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon color="action" />
                <Typography variant="body1">
                  <strong>開催日:</strong> {new Date(event.date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </Typography>
              </Box>
              {event.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon color="action" />
                  <Typography variant="body1">
                    <strong>開催場所:</strong> {event.location}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                作成日: {new Date(event.created_at).toLocaleString('ja-JP')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                更新日: {new Date(event.updated_at).toLocaleString('ja-JP')}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Match Results */}
        <Card>
          <CardHeader
            title="部外試合結果"
            subheader={`${event.match_results?.length || 0}件の試合`}
          />
          <CardContent>
            {event.match_results && event.match_results.length > 0 ? (
              <Stack spacing={3}>
                {event.match_results.map((matchResult) => (
                  <Card key={matchResult.id} variant="outlined">
                    <CardContent>
                      {/* チーム名とスコア */}
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {matchResult.player_team_name} vs {matchResult.opponent_team_name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                          <Chip
                            label={matchResult.player_team_sets}
                            color={matchResult.player_team_sets > matchResult.opponent_sets ? 'success' : 'default'}
                            sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                          />
                          <Typography variant="h6">-</Typography>
                          <Chip
                            label={matchResult.opponent_sets}
                            color={matchResult.opponent_sets > matchResult.player_team_sets ? 'error' : 'default'}
                            sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ mb: 2 }} />

                      {/* 個人戦の結果 */}
                      <Stack spacing={2}>
                        {matchResult.match_games?.map((game) => (
                          <Card key={game.id} variant="outlined" sx={{ backgroundColor: '#fafafa' }}>
                            <CardContent sx={{ py: 2 }}>
                              <Typography variant="subtitle2" sx={{ textAlign: 'center', mb: 2, fontWeight: 'bold' }}>
                                第{game.game_no}試合 ({game.is_doubles ? 'ダブルス' : 'シングルス'})
                              </Typography>

                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 2 }}>
                                {/* 左側: 自チーム選手情報 */}
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                                    {game.player?.name || 'プレイヤー不明'}
                                    {game.is_doubles && game.player_2 && (
                                      <>
                                        <br />
                                        {game.player_2.name}
                                      </>
                                    )}
                                  </Typography>
                                </Box>

                                {/* 中央: スコア */}
                                <Box sx={{ textAlign: 'center', px: 2 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    {game.team_sets} - {game.opponent_sets}
                                  </Typography>
                                </Box>

                                {/* 右側: 相手チーム選手情報 */}
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                                    {game.opponent_player_name}
                                    {game.is_doubles && game.opponent_player_name_2 && (
                                      <>
                                        <br />
                                        {game.opponent_player_name_2}
                                      </>
                                    )}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* メモがある場合 */}
                              {game.notes && (
                                <Box sx={{ mt: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    <strong>メモ:</strong> {game.notes}
                                  </Typography>
                                </Box>
                              )}

                              {/* 動画がある場合 */}
                              {game.match_game_movies && game.match_game_movies.length > 0 && (
                                <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
                                    📹 関連動画 ({game.match_game_movies.length}件)
                                  </Typography>
                                  <Stack spacing={1}>
                                    {game.match_game_movies.map((movieItem, index) => (
                                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                まだ試合結果が登録されていません
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            イベントを削除しますか？
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-dialog-description">
              「{event.name}」を削除します。この操作は元に戻せません。
              関連する試合結果もすべて削除されます。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              削除
            </Button>
          </DialogActions>
        </Dialog>
    </PageLayout>
  );
}
