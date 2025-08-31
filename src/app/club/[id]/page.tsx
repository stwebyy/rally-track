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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';

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
          opponent:harataku_members!opponent_id(*)
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
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>プレイヤー</TableCell>
                    <TableCell>対戦相手</TableCell>
                    <TableCell align="center">プレイヤーセット数</TableCell>
                    <TableCell align="center">相手セット数</TableCell>
                    <TableCell align="center">結果</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gameResults.map((game, index) => (
                    <TableRow key={game.id || index}>
                      <TableCell>
                        {game.player?.name || `プレイヤーID: ${game.player_id}`}
                      </TableCell>
                      <TableCell>
                        {game.opponent?.name || `プレイヤーID: ${game.opponent_id}`}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" component="span">
                          {game.player_game_set}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" component="span">
                          {game.opponent_game_set}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={game.player_game_set > game.opponent_game_set ? '勝利' : game.player_game_set < game.opponent_game_set ? '敗北' : '引き分け'}
                          color={game.player_game_set > game.opponent_game_set ? 'success' : game.player_game_set < game.opponent_game_set ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
