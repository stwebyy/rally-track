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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';

import { createClient } from '@/utils/supabase/client';
import PageLayout from '@/components/molescules/PageLayout';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string | null;
  created_at: string;
  updated_at: string;
}

interface MatchGame {
  id: number;
  match_result_id: number;
  game_no: number;
  player_name: string;
  player_style: string;
  opponent_player_name: string;
  opponent_player_style: string;
  team_sets: number;
  opponent_sets: number;
  created_at: string;
  updated_at: string;
}

interface MatchResult {
  id: number;
  event_id: number;
  player_team_name: string;
  opponent_team_name: string;
  player_team_sets: number;
  opponent_sets: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  match_games: MatchGame[];
}

interface EventWithMatchResults extends Event {
  match_results: MatchResult[];
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
            match_games (*)
          )
        `)
        .eq('id', eventId)
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

  const getResultChip = (playerTeamSets: number, opponentSets: number) => {
    if (playerTeamSets > opponentSets) {
      return <Chip label="勝ち" color="success" size="small" />;
    } else if (playerTeamSets < opponentSets) {
      return <Chip label="負け" color="error" size="small" />;
    } else {
      return <Chip label="引分" color="default" size="small" />;
    }
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
            title="試合結果"
            subheader={`${event.match_results?.length || 0}件の試合`}
          />
          <CardContent>
            {event.match_results && event.match_results.length > 0 ? (
              <Stack spacing={3}>
                {event.match_results.map((result) => (
                  <Card key={result.id} variant="outlined">
                    <CardHeader
                      title={`${result.player_team_name} vs ${result.opponent_team_name}`}
                      subheader={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                          {getResultChip(result.player_team_sets, result.opponent_sets)}
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {result.player_team_sets} - {result.opponent_sets}
                          </Typography>
                        </Box>
                      }
                    />
                    <CardContent>
                      {result.notes && (
                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                          備考: {result.notes}
                        </Typography>
                      )}

                      {/* Individual Games */}
                      {result.match_games && result.match_games.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>試合</TableCell>
                                <TableCell>選手名</TableCell>
                                <TableCell>プレースタイル</TableCell>
                                <TableCell>相手選手</TableCell>
                                <TableCell>相手スタイル</TableCell>
                                <TableCell align="center">セット数</TableCell>
                                <TableCell>結果</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {result.match_games
                                .sort((a, b) => a.game_no - b.game_no)
                                .map((game) => (
                                <TableRow key={game.id}>
                                  <TableCell>{game.game_no}試合目</TableCell>
                                  <TableCell>{game.player_name}</TableCell>
                                  <TableCell>{game.player_style}</TableCell>
                                  <TableCell>{game.opponent_player_name}</TableCell>
                                  <TableCell>{game.opponent_player_style}</TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {game.team_sets} - {game.opponent_sets}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {game.team_sets > game.opponent_sets ? (
                                      <Chip label="勝ち" color="success" size="small" />
                                    ) : game.team_sets < game.opponent_sets ? (
                                      <Chip label="負け" color="error" size="small" />
                                    ) : (
                                      <Chip label="引分" color="default" size="small" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                          この試合の詳細な試合結果はまだ登録されていません
                        </Typography>
                      )}
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
