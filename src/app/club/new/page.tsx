'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
  player_id: number;
  opponent_id: number;
  player_game_set: number;
  opponent_game_set: number;
}

export default function NewMatchResult() {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Match result fields
  const [matchDate, setMatchDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [matchLocation, setMatchLocation] = React.useState('');

  // Members and game results
  const [members, setMembers] = React.useState<Member[]>([]);
  const [gameResults, setGameResults] = React.useState<GameResultForm[]>([
    {
      player_id: 0,
      opponent_id: 0,
      player_game_set: 0,
      opponent_game_set: 0,
    },
  ]);

  const supabase = createClient();

  React.useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      try {
        const { data: membersData, error: membersError } = await supabase
          .from('harataku_members')
          .select('*')
          .order('name');

        if (membersError) {
          throw membersError;
        }
        setMembers(membersData || []);
      } catch (error) {
        console.error('Error loading members:', error);
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [supabase]);

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
      // 試合結果の作成
      const { data: matchResultData, error: createMatchError } = await supabase
        .from('harataku_match_results')
        .insert({
          date: matchDate,
          location: matchLocation || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createMatchError || !matchResultData) {
        throw createMatchError || new Error('試合結果の作成に失敗しました');
      }

      // ゲーム結果の作成
      const gameResultsToInsert = validGameResults.map(game => ({
        harataku_match_result_id: matchResultData.id,
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

      setSuccess('部内試合結果を作成しました');
      setTimeout(() => {
        router.push(`/club/${matchResultData.id}`);
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
      <PageLayout title="新規部内試合結果作成">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="新規部内試合結果作成">
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
                      type="tel"
                      value={game.player_game_set}
                      onChange={(e) => handleGameResultChange(index, 'player_game_set', parseInt(e.target.value) || 0)}
                      slotProps={{
                        htmlInput: { min: 0 }
                      }}
                      fullWidth
                    />
                    <TextField
                      label="相手セット数"
                      type="tel"
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
