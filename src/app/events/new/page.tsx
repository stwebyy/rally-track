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
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { createClient } from '@/utils/supabase/client';
import { PLAYER_STYLES } from '@/types/constants';
import PageLayout from '@/components/molescules/PageLayout';

interface MatchGame {
  game_no: number;
  player_name: string;
  player_style: string;
  opponent_player_name: string;
  opponent_player_style: string;
  team_sets: number;
  opponent_sets: number;
  is_doubles: boolean;
  player_name_2?: string;
  player_style_2?: string;
  opponent_player_name_2?: string;
  opponent_player_style_2?: string;
  notes?: string;
}

interface MatchResult {
  id?: number;
  game_no: number;
  player_team_name: string;
  opponent_team_name: string;
  player_team_sets: number;
  opponent_sets: number;
  match_games: MatchGame[];
}

export default function NewEvent() {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Event fields
  const [eventName, setEventName] = React.useState('');
  const [eventDate, setEventDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [eventLocation, setEventLocation] = React.useState('');

  // Match results
  const [matchResults, setMatchResults] = React.useState<MatchResult[]>([
    {
      game_no: 1,
      player_team_name: '',
      opponent_team_name: '',
      player_team_sets: 0,
      opponent_sets: 0,
      match_games: [
        {
          game_no: 1,
          player_name: '',
          player_style: '',
          opponent_player_name: '',
          opponent_player_style: '',
          team_sets: 0,
          opponent_sets: 0,
          is_doubles: false,
        },
      ],
    },
  ]);

  const supabase = createClient();

  const handleAddMatchResult = () => {
    const newGameNo = matchResults.length + 1;
    // 試合1の自チーム名を取得（存在する場合）
    const firstMatchPlayerTeamName = matchResults.length > 0 ? matchResults[0].player_team_name : '';

    setMatchResults([
      ...matchResults,
      {
        game_no: newGameNo,
        player_team_name: firstMatchPlayerTeamName,
        opponent_team_name: '',
        player_team_sets: 0,
        opponent_sets: 0,
        match_games: [
          {
            game_no: 1,
            player_name: '',
            player_style: '',
            opponent_player_name: '',
            opponent_player_style: '',
            team_sets: 0,
            opponent_sets: 0,
            is_doubles: false,
          },
        ],
      },
    ]);
  };

  const handleRemoveMatchResult = (index: number) => {
    if (matchResults.length > 1) {
      const updatedResults = matchResults.filter((_, i) => i !== index);
      // Renumber game_no
      updatedResults.forEach((match, idx) => {
        match.game_no = idx + 1;
      });
      setMatchResults(updatedResults);
    }
  };

  const handleMatchResultChange = (index: number, field: keyof MatchResult, value: string | number) => {
    const updatedResults = [...matchResults];
    updatedResults[index] = {
      ...updatedResults[index],
      [field]: value,
    };
    setMatchResults(updatedResults);
  };

  const handleAddGame = (matchIndex: number) => {
    const updatedResults = [...matchResults];
    const newGameNo = updatedResults[matchIndex].match_games.length + 1;
    updatedResults[matchIndex].match_games.push({
      game_no: newGameNo,
      player_name: '',
      player_style: '',
      opponent_player_name: '',
      opponent_player_style: '',
      team_sets: 0,
      opponent_sets: 0,
      is_doubles: false,
    });
    setMatchResults(updatedResults);
  };

  const handleRemoveGame = (matchIndex: number, gameIndex: number) => {
    const updatedResults = [...matchResults];
    if (updatedResults[matchIndex].match_games.length > 1) {
      updatedResults[matchIndex].match_games.splice(gameIndex, 1);
      updatedResults[matchIndex].match_games.forEach((game, idx) => {
        game.game_no = idx + 1;
      });
      setMatchResults(updatedResults);
    }
  };

  const handleGameChange = (matchIndex: number, gameIndex: number, field: keyof MatchGame, value: string | number | boolean) => {
    const updatedResults = [...matchResults];
    updatedResults[matchIndex].match_games[gameIndex] = {
      ...updatedResults[matchIndex].match_games[gameIndex],
      [field]: value,
    };

    const teamWins = updatedResults[matchIndex].match_games.filter(game => game.team_sets > game.opponent_sets).length;
    const opponentWins = updatedResults[matchIndex].match_games.filter(game => game.team_sets < game.opponent_sets).length;

    updatedResults[matchIndex].player_team_sets = teamWins;
    updatedResults[matchIndex].opponent_sets = opponentWins;

    setMatchResults(updatedResults);
  };

  const validateForm = () => {
    if (!eventName.trim()) {
      setError('試合名を入力してください。');
      return false;
    }
    if (!eventDate) {
      setError('試合日を入力してください。');
      return false;
    }

    for (let i = 0; i < matchResults.length; i++) {
      const match = matchResults[i];
      if (!match.player_team_name.trim() || !match.opponent_team_name.trim()) {
        setError(`試合 ${match.game_no}: チーム名は必須です。`);
        return false;
      }

      for (let j = 0; j < match.match_games.length; j++) {
        const game = match.match_games[j];
        if (!game.player_name.trim() || !game.opponent_player_name.trim()) {
          setError(`試合 ${match.game_no} の ${j + 1}試合目: 選手名は必須です。`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          name: eventName.trim(),
          date: eventDate,
          location: eventLocation.trim() || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      for (const match of matchResults) {
        const { data: matchResultData, error: matchResultError } = await supabase
          .from('match_results')
          .insert({
            event_id: eventData.id,
            game_no: match.game_no,
            player_team_name: match.player_team_name.trim(),
            opponent_team_name: match.opponent_team_name.trim(),
            player_team_sets: match.player_team_sets,
            opponent_sets: match.opponent_sets,
          })
          .select()
          .single();

        if (matchResultError) throw matchResultError;

        if (match.match_games.length > 0) {
          const gamesToInsert = match.match_games.map(game => ({
            match_result_id: matchResultData.id,
            game_no: game.game_no,
            player_name: game.player_name.trim(),
            player_style: game.player_style,
            opponent_player_name: game.opponent_player_name.trim(),
            opponent_player_style: game.opponent_player_style,
            team_sets: game.team_sets,
            opponent_sets: game.opponent_sets,
            is_doubles: game.is_doubles,
            player_name_2: game.player_name_2?.trim() || null,
            player_style_2: game.player_style_2 || null,
            opponent_player_name_2: game.opponent_player_name_2?.trim() || null,
            opponent_player_style_2: game.opponent_player_style_2 || null,
            notes: game.notes?.trim() || null,
          }));

          const { error: gamesError } = await supabase
            .from('match_games')
            .insert(gamesToInsert);

          if (gamesError) throw gamesError;
        }
      }

      setSuccess('試合結果が正常に作成されました。');

      setTimeout(() => {
        router.push(`/events/${eventData.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error creating event:', error);
      setError(error instanceof Error ? error.message : '試合結果の作成に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="新規試合結果作成">
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => router.push('/events')} color="inherit">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          新規試合結果作成
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            試合情報
          </Typography>

          <Stack spacing={3} sx={{ mb: 4 }}>
            <TextField
              label="試合名"
              required
              fullWidth
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="例：第1回練習試合"
            />

            <TextField
              label="試合日"
              type="date"
              required
              fullWidth
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              label="開催場所"
              fullWidth
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="例：A体育館"
            />
          </Stack>

          <Divider sx={{ my: 4 }} />

          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h6">
              試合結果
            </Typography>
            <Button
              onClick={handleAddMatchResult}
              startIcon={<AddIcon />}
              variant="outlined"
              color="primary"
            >
              試合を追加
            </Button>
          </Box>

          {matchResults.map((match, index) => (
            <Card key={index} sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">
                    試合 {match.game_no}
                  </Typography>
                  {matchResults.length > 1 && (
                    <IconButton
                      onClick={() => handleRemoveMatchResult(index)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Stack spacing={3}>
                  <Box display="flex" gap={2}>
                    <TextField
                      label="自チーム名"
                      required
                      fullWidth
                      value={match.player_team_name}
                      onChange={(e) => handleMatchResultChange(index, 'player_team_name', e.target.value)}
                      placeholder="例：A高校"
                    />
                    <TextField
                      label="相手チーム名"
                      required
                      fullWidth
                      value={match.opponent_team_name}
                      onChange={(e) => handleMatchResultChange(index, 'opponent_team_name', e.target.value)}
                      placeholder="例：B高校"
                    />
                  </Box>

                  <Box display="flex" gap={2} alignItems="center" justifyContent="center">
                    <Typography variant="body1" sx={{ minWidth: 100, textAlign: 'center' }}>
                      {match.player_team_name || '自チーム'}
                    </Typography>
                    <Chip
                      label={match.player_team_sets}
                      color={match.player_team_sets > match.opponent_sets ? 'success' : 'default'}
                      sx={{ minWidth: 60, fontSize: '1.2rem' }}
                    />
                    <Typography variant="h6" sx={{ mx: 2 }}>
                      vs
                    </Typography>
                    <Chip
                      label={match.opponent_sets}
                      color={match.opponent_sets > match.player_team_sets ? 'error' : 'default'}
                      sx={{ minWidth: 60, fontSize: '1.2rem' }}
                    />
                    <Typography variant="body1" sx={{ minWidth: 100, textAlign: 'center' }}>
                      {match.opponent_team_name || '相手チーム'}
                    </Typography>
                  </Box>

                  <Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        個人戦
                      </Typography>
                      <Button
                        onClick={() => handleAddGame(index)}
                        startIcon={<AddIcon />}
                        size="small"
                        variant="outlined"
                      >
                        個人戦を追加
                      </Button>
                    </Box>

                    {match.match_games.map((game, gameIndex) => (
                      <Card key={gameIndex} variant="outlined" sx={{ mb: 2 }}>
                        <CardContent sx={{ py: 2 }}>
                          <Box mb={2}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                              <Typography variant="subtitle2">
                                第{game.game_no}試合
                              </Typography>
                              {match.match_games.length > 1 && (
                                <IconButton
                                  onClick={() => handleRemoveGame(index, gameIndex)}
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </Box>
                            <FormControl>
                              <RadioGroup
                                row
                                value={game.is_doubles ? 'doubles' : 'singles'}
                                onChange={(e) => handleGameChange(index, gameIndex, 'is_doubles', e.target.value === 'doubles')}
                              >
                                <FormControlLabel value="singles" control={<Radio />} label="シングルス" />
                                <FormControlLabel value="doubles" control={<Radio />} label="ダブルス" />
                              </RadioGroup>
                            </FormControl>
                          </Box>

                          <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {game.is_doubles ? 'ペア情報' : '選手情報'}
                            </Typography>
                            <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                              <TextField
                                label={game.is_doubles ? '選手1人目の名前' : '選手名'}
                                required
                                fullWidth
                                value={game.player_name}
                                onChange={(e) => handleGameChange(index, gameIndex, 'player_name', e.target.value)}
                                placeholder="例：田中太郎"
                              />
                              <FormControl fullWidth>
                                <InputLabel>{game.is_doubles ? '選手1人目の戦型' : '戦型'}</InputLabel>
                                <Select
                                  value={game.player_style}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'player_style', e.target.value)}
                                  label={game.is_doubles ? '選手1人目の戦型' : '戦型'}
                                >
                                  <MenuItem value="">戦型（任意項目）</MenuItem>
                                  {PLAYER_STYLES.map((style) => (
                                    <MenuItem key={style} value={style}>
                                      {style}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>

                            {game.is_doubles && (
                              <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                                <TextField
                                  label="選手2人目の名前"
                                  required
                                  fullWidth
                                  value={game.player_name_2 || ''}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'player_name_2', e.target.value)}
                                  placeholder="例：山田花子"
                                />
                                <FormControl fullWidth>
                                  <InputLabel>選手2人目の戦型</InputLabel>
                                  <Select
                                    value={game.player_style_2 || ''}
                                    onChange={(e) => handleGameChange(index, gameIndex, 'player_style_2', e.target.value)}
                                    label="選手2人目の戦型"
                                  >
                                    <MenuItem value="">戦型（任意項目）</MenuItem>
                                    {PLAYER_STYLES.map((style) => (
                                      <MenuItem key={style} value={style}>
                                        {style}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Box>
                            )}

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {game.is_doubles ? '相手ペア情報' : '相手選手情報'}
                            </Typography>
                            <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                              <TextField
                                label={game.is_doubles ? '相手選手1人目の名前' : '相手選手名'}
                                required
                                fullWidth
                                value={game.opponent_player_name}
                                onChange={(e) => handleGameChange(index, gameIndex, 'opponent_player_name', e.target.value)}
                                placeholder="例：佐藤花子"
                              />
                              <FormControl fullWidth>
                                <InputLabel>{game.is_doubles ? '相手選手1人目の戦型' : '相手戦型'}</InputLabel>
                                <Select
                                  value={game.opponent_player_style}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'opponent_player_style', e.target.value)}
                                  label={game.is_doubles ? '相手選手1人目の戦型' : '相手戦型'}
                                >
                                  <MenuItem value="">戦型（任意項目）</MenuItem>
                                  {PLAYER_STYLES.map((style) => (
                                    <MenuItem key={style} value={style}>
                                      {style}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>

                            {game.is_doubles && (
                              <Box display="flex" gap={2} sx={{ flexDirection: { xs: 'column', sm: 'row' } }}>
                                <TextField
                                  label="相手選手2人目の名前"
                                  required
                                  fullWidth
                                  value={game.opponent_player_name_2 || ''}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'opponent_player_name_2', e.target.value)}
                                  placeholder="例：鈴木一郎"
                                />
                                <FormControl fullWidth>
                                  <InputLabel>相手選手2人目の戦型</InputLabel>
                                  <Select
                                    value={game.opponent_player_style_2 || ''}
                                    onChange={(e) => handleGameChange(index, gameIndex, 'opponent_player_style_2', e.target.value)}
                                    label="相手選手2人目の戦型"
                                  >
                                    <MenuItem value="">戦型（任意項目）</MenuItem>
                                    {PLAYER_STYLES.map((style) => (
                                      <MenuItem key={style} value={style}>
                                        {style}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Box>
                            )}

                            <Box display="flex" gap={2} alignItems="center" justifyContent="center">
                              <TextField
                                label="セット数"
                                type="tel"
                                slotProps={{ htmlInput: { min: 0, max: 5 } }}
                                value={game.team_sets}
                                onChange={(e) => handleGameChange(index, gameIndex, 'team_sets', parseInt(e.target.value) || 0)}
                                sx={{ width: 120 }}
                              />
                              <Typography variant="h6" sx={{ mx: 2 }}>
                                vs
                              </Typography>
                              <TextField
                                label="相手セット数"
                                type="tel"
                                slotProps={{ htmlInput: { min: 0, max: 5 } }}
                                value={game.opponent_sets}
                                onChange={(e) => handleGameChange(index, gameIndex, 'opponent_sets', parseInt(e.target.value) || 0)}
                                sx={{ width: 120 }}
                              />
                            </Box>

                            <Box display="flex" justifyContent="center">
                              <Chip
                                label={
                                  game.team_sets > game.opponent_sets ? (
                                    `勝利 (${game.team_sets}-${game.opponent_sets})`
                                  ) : game.team_sets < game.opponent_sets ? (
                                    `敗北 (${game.team_sets}-${game.opponent_sets})`
                                  ) : (
                                    `引き分け (${game.team_sets}-${game.opponent_sets})`
                                  )
                                }
                                color={
                                  game.team_sets > game.opponent_sets
                                    ? 'success'
                                    : game.team_sets < game.opponent_sets
                                    ? 'error'
                                    : 'default'
                                }
                                size="small"
                              />
                            </Box>

                            <TextField
                              label="メモ"
                              multiline
                              rows={3}
                              fullWidth
                              value={game.notes || ''}
                              onChange={(e) => handleGameChange(index, gameIndex, 'notes', e.target.value)}
                              placeholder="試合の詳細や反省点などをメモできます"
                              sx={{ mt: 2 }}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>

                  <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                    <Chip
                      label={
                        match.player_team_sets > match.opponent_sets ? (
                          `試合勝利 (${match.player_team_sets}-${match.opponent_sets})`
                        ) : match.player_team_sets < match.opponent_sets ? (
                          `試合敗北 (${match.player_team_sets}-${match.opponent_sets})`
                        ) : (
                          `試合引き分け (${match.player_team_sets}-${match.opponent_sets})`
                        )
                      }
                      color={
                        match.player_team_sets > match.opponent_sets
                          ? 'success'
                          : match.player_team_sets < match.opponent_sets
                          ? 'error'
                          : 'default'
                      }
                      variant="filled"
                      sx={{ fontSize: '1rem', py: 2 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}

          <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{ minWidth: 200 }}
            >
              {saving ? '保存中...' : '試合結果を保存'}
            </Button>
          </Box>
        </form>
      </Paper>
    </PageLayout>
  );
}
