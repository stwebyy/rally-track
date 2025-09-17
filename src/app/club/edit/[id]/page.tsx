'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { createClient } from '@/utils/supabase/client';
import { Member } from '@/types/club';
import PageLayout from '@/components/molescules/PageLayout';

type GameResultForm = {
  id?: number;
  player_id: number;
  opponent_id: number;
  player_game_set: number;
  opponent_game_set: number;
}

export default function EditMatchResult() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Match result fields
  const [matchDate, setMatchDate] = React.useState('');
  const [matchLocation, setMatchLocation] = React.useState('');

  // Members and game results
  const [members, setMembers] = React.useState<Member[]>([]);
  const [gameResults, setGameResults] = React.useState<GameResultForm[]>([]);

  const supabase = createClient();

  const loadData = React.useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // メンバーリストの取得
      const { data: membersData, error: membersError } = await supabase
        .from('harataku_members')
        .select('*')
        .order('name');

      if (membersError) {
        throw membersError;
      }
      setMembers(membersData || []);

      // 試合結果の取得
      const { data: matchData, error: matchError } = await supabase
        .from('harataku_match_results')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (matchError) {
        throw matchError;
      }

      setMatchDate(matchData.date.split('T')[0]); // YYYY-MM-DD format
      setMatchLocation(matchData.location || '');

      // ゲーム結果の取得
      const { data: gameData, error: gameError } = await supabase
        .from('harataku_game_results')
        .select('*')
        .eq('harataku_match_result_id', parseInt(id))
        .order('id');

      if (gameError) {
        throw gameError;
      }

      const formattedGameResults: GameResultForm[] = (gameData || []).map(game => ({
        id: game.id,
        player_id: game.player_id,
        opponent_id: game.opponent_id,
        player_game_set: game.player_game_set,
        opponent_game_set: game.opponent_game_set,
      }));

      setGameResults(formattedGameResults.length > 0 ? formattedGameResults : [createEmptyGameResult()]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const createEmptyGameResult = (): GameResultForm => ({
    player_id: 0,
    opponent_id: 0,
    player_game_set: 0,
    opponent_game_set: 0,
  });

  const handleAddGameResult = () => {
    setGameResults([...gameResults, createEmptyGameResult()]);
  };

  const handleRemoveGameResult = (index: number) => {
    if (gameResults.length > 1) {
      const newGameResults = gameResults.filter((_, i) => i !== index);
      setGameResults(newGameResults);
    }
  };

  const handleGameResultChange = (index: number, field: keyof GameResultForm, value: string | number) => {
    const newGameResults = [...gameResults];
    (newGameResults[index] as GameResultForm)[field] = value as never;
    setGameResults(newGameResults);
  };

  const handleBack = () => {
    router.push('/club');
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    // バリデーション
    if (!matchDate) {
      setError('日付を入力してください');
      return;
    }

    const validGameResults = gameResults.filter(game =>
      game.player_id > 0 && game.opponent_id > 0 && game.player_id !== game.opponent_id
    );

    if (validGameResults.length === 0) {
      setError('少なくとも1つのゲーム結果を入力してください');
      return;
    }

    setSaving(true);

    try {
      // 試合結果の更新
      const { error: updateMatchError } = await supabase
        .from('harataku_match_results')
        .update({
          date: matchDate,
          location: matchLocation || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parseInt(id));

      if (updateMatchError) {
        throw updateMatchError;
      }

      // 既存のゲーム結果を削除
      const { error: deleteGameError } = await supabase
        .from('harataku_game_results')
        .delete()
        .eq('harataku_match_result_id', parseInt(id));

      if (deleteGameError) {
        throw deleteGameError;
      }

      // 新しいゲーム結果を挿入
      const gameResultsToInsert = validGameResults.map(game => ({
        harataku_match_result_id: parseInt(id),
        player_id: game.player_id,
        opponent_id: game.opponent_id,
        player_game_set: game.player_game_set,
        opponent_game_set: game.opponent_game_set,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertGameError } = await supabase
        .from('harataku_game_results')
        .insert(gameResultsToInsert);

      if (insertGameError) {
        throw insertGameError;
      }

      setSuccess('部内試合結果を更新しました');
      setTimeout(() => {
        router.push(`/club/${id}`);
      }, 1000);

    } catch (error) {
      console.error('Error saving data:', error);
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="部内試合結果編集">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="部内試合結果編集">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
          戻る
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* 試合情報 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="試合情報" />
        <CardContent>
          <Stack spacing={3}>
            <TextField
              label="日付"
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="場所"
              value={matchLocation}
              onChange={(e) => setMatchLocation(e.target.value)}
              fullWidth
              placeholder="試合場所を入力してください"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* ゲーム結果 */}
      <Card>
        <CardHeader
          title="ゲーム結果"
          action={
            <Button
              onClick={handleAddGameResult}
              startIcon={<AddIcon />}
              size="small"
            >
              ゲーム追加
            </Button>
          }
        />
        <CardContent>
          <Stack spacing={3}>
            {gameResults.map((game, index) => (
              <Paper key={index} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    ゲーム {index + 1}
                  </Typography>
                  {gameResults.length > 1 && (
                    <IconButton
                      onClick={() => handleRemoveGameResult(index)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>プレイヤー</InputLabel>
                      <Select
                        value={game.player_id}
                        onChange={(e) => handleGameResultChange(index, 'player_id', e.target.value)}
                        label="プレイヤー"
                      >
                        <MenuItem value={0}>選択してください</MenuItem>
                        {members.map((member) => (
                          <MenuItem key={member.id} value={member.id}>
                            {member.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>対戦相手</InputLabel>
                      <Select
                        value={game.opponent_id}
                        onChange={(e) => handleGameResultChange(index, 'opponent_id', e.target.value)}
                        label="対戦相手"
                      >
                        <MenuItem value={0}>選択してください</MenuItem>
                        {members.map((member) => (
                          <MenuItem key={member.id} value={member.id}>
                            {member.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="プレイヤーセット数"
                      type="number"
                      value={game.player_game_set}
                      onChange={(e) => handleGameResultChange(index, 'player_game_set', parseInt(e.target.value) || 0)}
                      slotProps={{
                        htmlInput: { min: 0 }
                      }}
                      fullWidth
                    />
                    <TextField
                      label="相手セット数"
                      type="number"
                      value={game.opponent_game_set}
                      onChange={(e) => handleGameResultChange(index, 'opponent_game_set', parseInt(e.target.value) || 0)}
                      slotProps={{
                        htmlInput: { min: 0 }
                      }}
                      fullWidth
                    />
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </PageLayout>
  );
};
