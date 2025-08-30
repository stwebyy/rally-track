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
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { PLAYER_STYLES } from '@/types/constants';

interface Event {
  id: number;
  name: string;
  date: string;
  location?: string;
}

interface MatchGame {
  id?: number;
  match_result_id?: number;
  game_no: number;
  player_name: string;
  player_style: string;
  opponent_player_name: string;
  opponent_player_style: string;
  team_sets: number;
  opponent_sets: number;
}

interface MatchResult {
  id?: number;
  event_id: number;
  game_no: number;
  player_team_name: string;
  opponent_team_name: string;
  player_team_sets: number;
  opponent_sets: number;
  notes: string;
  match_games: MatchGame[];
}

export default function EditEvent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Event fields
  const [event, setEvent] = React.useState<Event | null>(null);
  const [eventName, setEventName] = React.useState('');
  const [eventDate, setEventDate] = React.useState('');
  const [eventLocation, setEventLocation] = React.useState('');

  // Match results
  const [matchResults, setMatchResults] = React.useState<MatchResult[]>([]);
  const [deletedMatchIds, setDeletedMatchIds] = React.useState<number[]>([]);

  const supabase = createClient();

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await loadEventData();
      } else {
        // ログインしていない場合はサインインページにリダイレクト
        router.push('/signin');
      }
    };

    const loadEventData = async () => {
      try {
        // Load event data
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;

        setEvent(eventData);
        setEventName(eventData.name);
        setEventDate(eventData.date);
        setEventLocation(eventData.location || '');

        // Load match results with their games
        const { data: matchData, error: matchError } = await supabase
          .from('match_results')
          .select(`
            *,
            match_games (*)
          `)
          .eq('event_id', eventId)
          .order('id');

        if (matchError) throw matchError;

        if (matchData && matchData.length > 0) {
          setMatchResults(matchData.map(match => ({
            ...match,
            notes: match.notes || '',
            match_games: match.match_games || [],
          })));
        } else {
          // No matches exist, add a default one
          setMatchResults([{
            event_id: parseInt(eventId),
            game_no: 1,
            player_team_name: '',
            opponent_team_name: '',
            player_team_sets: 0,
            opponent_sets: 0,
            notes: '',
            match_games: [{
              game_no: 1,
              player_name: '',
              player_style: '',
              opponent_player_name: '',
              opponent_player_style: '',
              team_sets: 0,
              opponent_sets: 0,
            }],
          }]);
        }

      } catch (error) {
        console.error('Error loading event data:', error);
        setError('試合データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [eventId, router, supabase, supabase.auth]);

  const handleAddMatchResult = () => {
    const newGameNo = matchResults.length + 1;
    setMatchResults([
      ...matchResults,
      {
        event_id: parseInt(eventId),
        game_no: newGameNo,
        player_team_name: '',
        opponent_team_name: '',
        player_team_sets: 0,
        opponent_sets: 0,
        notes: '',
        match_games: [{
          game_no: 1,
          player_name: '',
          player_style: '',
          opponent_player_name: '',
          opponent_player_style: '',
          team_sets: 0,
          opponent_sets: 0,
        }],
      },
    ]);
  };

  const handleRemoveMatchResult = (index: number) => {
    const match = matchResults[index];
    if (match.id) {
      // Existing match - mark for deletion
      setDeletedMatchIds([...deletedMatchIds, match.id]);
    }
    const updatedResults = matchResults.filter((_, i) => i !== index);
    // Renumber game_no
    updatedResults.forEach((match, idx) => {
      match.game_no = idx + 1;
    });
    setMatchResults(updatedResults);
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

  const handleGameChange = (matchIndex: number, gameIndex: number, field: keyof MatchGame, value: string | number) => {
    const updatedResults = [...matchResults];
    updatedResults[matchIndex].match_games[gameIndex] = {
      ...updatedResults[matchIndex].match_games[gameIndex],
      [field]: value,
    };

    // Calculate team scores based on individual game results
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

    // Match results validation
    for (let i = 0; i < matchResults.length; i++) {
      const match = matchResults[i];
      if (!match.player_team_name.trim() || !match.opponent_team_name.trim()) {
        setError(`団体戦 ${match.game_no}: チーム名は必須です。`);
        return false;
      }

      for (let j = 0; j < match.match_games.length; j++) {
        const game = match.match_games[j];
        if (!game.player_name.trim() || !game.opponent_player_name.trim()) {
          setError(`団体戦 ${match.game_no} の ${j + 1}試合目: 選手名は必須です。`);
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
      // 1. Update event
      const { error: eventError } = await supabase
        .from('events')
        .update({
          name: eventName.trim(),
          date: eventDate,
          location: eventLocation.trim() || null,
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // 2. Delete removed match results
      if (deletedMatchIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('match_results')
          .delete()
          .in('id', deletedMatchIds);

        if (deleteError) throw deleteError;
      }

      // 3. Update/Insert match results and games
      for (const match of matchResults) {
        if (match.id) {
          // Update existing match result
          const { error: updateError } = await supabase
            .from('match_results')
            .update({
              game_no: match.game_no,
              player_team_name: match.player_team_name.trim(),
              opponent_team_name: match.opponent_team_name.trim(),
              player_team_sets: match.player_team_sets,
              opponent_sets: match.opponent_sets,
              notes: match.notes.trim() || null,
            })
            .eq('id', match.id);

          if (updateError) throw updateError;

          // Delete existing games for this match
          const { error: deleteGamesError } = await supabase
            .from('match_games')
            .delete()
            .eq('match_result_id', match.id);

          if (deleteGamesError) throw deleteGamesError;

          // Insert updated games
          if (match.match_games.length > 0) {
            const gamesToInsert = match.match_games.map(game => ({
              match_result_id: match.id,
              game_no: game.game_no,
              player_name: game.player_name.trim(),
              player_style: game.player_style,
              opponent_player_name: game.opponent_player_name.trim(),
              opponent_player_style: game.opponent_player_style,
              team_sets: game.team_sets,
              opponent_sets: game.opponent_sets,
            }));

            const { error: insertGamesError } = await supabase
              .from('match_games')
              .insert(gamesToInsert);

            if (insertGamesError) throw insertGamesError;
          }
        } else {
          // Insert new match result
          const { data: newMatchData, error: insertMatchError } = await supabase
            .from('match_results')
            .insert({
              event_id: parseInt(eventId),
              game_no: match.game_no,
              player_team_name: match.player_team_name.trim(),
              opponent_team_name: match.opponent_team_name.trim(),
              player_team_sets: match.player_team_sets,
              opponent_sets: match.opponent_sets,
              notes: match.notes.trim() || null,
            })
            .select()
            .single();

          if (insertMatchError) throw insertMatchError;

          // Insert games for new match
          if (match.match_games.length > 0) {
            const gamesToInsert = match.match_games.map(game => ({
              match_result_id: newMatchData.id,
              game_no: game.game_no,
              player_name: game.player_name.trim(),
              player_style: game.player_style,
              opponent_player_name: game.opponent_player_name.trim(),
              opponent_player_style: game.opponent_player_style,
              team_sets: game.team_sets,
              opponent_sets: game.opponent_sets,
            }));

            const { error: insertGamesError } = await supabase
              .from('match_games')
              .insert(gamesToInsert);

            if (insertGamesError) throw insertGamesError;
          }
        }
      }

      setSuccess('試合結果が正常に更新されました。');

      // Clear deleted match IDs
      setDeletedMatchIds([]);

      // Redirect to event details page after a short delay
      setTimeout(() => {
        router.push(`/events/${eventId}`);
      }, 1500);

    } catch (error) {
      console.error('Error updating event:', error);
      setError(error instanceof Error ? error.message : '試合結果の更新に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <CircularProgress />
      </div>
    );
  }

  if (!user || !event) {
    if (!user) {
      return null;
    }
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        <Alert severity="error">
          試合データが見つかりません。
        </Alert>
      </div>
    );
  }

  return (
    <div
      key={`edit-event-${eventId}`}
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '24px'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton
          onClick={() => router.push(`/events/${eventId}`)}
          sx={{ mr: 2 }}
          color="inherit"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          試合結果を編集
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        {/* Event Information */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            試合情報
          </Typography>
          <Stack spacing={3}>
            <TextField
              label="試合名"
              required
              fullWidth
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              disabled={saving}
              placeholder="例: 第1回練習試合"
            />

            <TextField
              label="試合日"
              type="date"
              required
              fullWidth
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={saving}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              label="試合場所"
              fullWidth
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              disabled={saving}
              placeholder="例: 体育館A"
            />
          </Stack>
        </Paper>

        {/* Match Results */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              団体戦結果
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddMatchResult}
              disabled={saving}
              variant="outlined"
            >
              団体戦を追加
            </Button>
          </Box>

          <Stack spacing={3}>
            {matchResults.map((match, index) => (
              <Card key={match.id || `new-${index}`} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      団体戦 {match.game_no} {match.id && <Chip label="保存済み" size="small" color="primary" />}
                    </Typography>
                    {matchResults.length > 1 && (
                      <IconButton
                        onClick={() => handleRemoveMatchResult(index)}
                        disabled={saving}
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
                        value={match.player_team_name || ''}
                        onChange={(e) => handleMatchResultChange(index, 'player_team_name', e.target.value)}
                        disabled={saving}
                        placeholder="例：A高校"
                      />
                      <TextField
                        label="相手チーム名"
                        required
                        fullWidth
                        value={match.opponent_team_name || ''}
                        onChange={(e) => handleMatchResultChange(index, 'opponent_team_name', e.target.value)}
                        disabled={saving}
                        placeholder="例：B高校"
                      />
                    </Box>

                    <Box display="flex" gap={2} alignItems="center" justifyContent="center">
                      <Typography variant="body1" sx={{ minWidth: 100, textAlign: 'center' }}>
                        {match.player_team_name || '自チーム'}
                      </Typography>
                      <Chip
                        label={match.player_team_sets || 0}
                        color={(match.player_team_sets || 0) > (match.opponent_sets || 0) ? 'success' : 'default'}
                        sx={{ minWidth: 60, fontSize: '1.2rem' }}
                      />
                      <Typography variant="h6" sx={{ mx: 2 }}>
                        vs
                      </Typography>
                      <Chip
                        label={match.opponent_sets || 0}
                        color={(match.opponent_sets || 0) > (match.player_team_sets || 0) ? 'error' : 'default'}
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
                          disabled={saving}
                        >
                          試合を追加
                        </Button>
                      </Box>

                      {match.match_games.map((game, gameIndex) => (
                        <Card key={gameIndex} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent sx={{ py: 2 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Typography variant="subtitle2">
                                第{game.game_no}試合
                              </Typography>
                              {match.match_games.length > 1 && (
                                <IconButton
                                  onClick={() => handleRemoveGame(index, gameIndex)}
                                  color="error"
                                  size="small"
                                  disabled={saving}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </Box>

                            <Stack spacing={2}>
                              <Box display="flex" gap={2}>
                                <TextField
                                  label="選手名"
                                  required
                                  fullWidth
                                  value={game.player_name}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'player_name', e.target.value)}
                                  disabled={saving}
                                  placeholder="例：田中太郎"
                                />
                                <FormControl fullWidth>
                                  <InputLabel>戦型</InputLabel>
                                  <Select
                                    value={game.player_style}
                                    onChange={(e) => handleGameChange(index, gameIndex, 'player_style', e.target.value)}
                                    label="戦型"
                                    disabled={saving}
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

                              <Box display="flex" gap={2} alignItems="center" justifyContent="center">
                                <TextField
                                  label="セット数"
                                  type="number"
                                  slotProps={{ htmlInput: { min: 0, max: 5 } }}
                                  value={game.team_sets}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'team_sets', parseInt(e.target.value) || 0)}
                                  sx={{ width: 120 }}
                                  disabled={saving}
                                />
                                <Typography variant="h6" sx={{ mx: 2 }}>
                                  vs
                                </Typography>
                                <TextField
                                  label="相手セット数"
                                  type="number"
                                  slotProps={{ htmlInput: { min: 0, max: 5 } }}
                                  value={game.opponent_sets}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'opponent_sets', parseInt(e.target.value) || 0)}
                                  sx={{ width: 120 }}
                                  disabled={saving}
                                />
                              </Box>

                              <Box display="flex" gap={2}>
                                <TextField
                                  label="相手選手名"
                                  required
                                  fullWidth
                                  value={game.opponent_player_name}
                                  onChange={(e) => handleGameChange(index, gameIndex, 'opponent_player_name', e.target.value)}
                                  disabled={saving}
                                  placeholder="例：佐藤花子"
                                />
                                <FormControl fullWidth>
                                  <InputLabel>相手戦型</InputLabel>
                                  <Select
                                    value={game.opponent_player_style}
                                    onChange={(e) => handleGameChange(index, gameIndex, 'opponent_player_style', e.target.value)}
                                    label="相手戦型"
                                    disabled={saving}
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
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>

                    <TextField
                      label="メモ"
                      multiline
                      rows={3}
                      fullWidth
                      value={match.notes || ''}
                      onChange={(e) => handleMatchResultChange(index, 'notes', e.target.value)}
                      disabled={saving}
                      placeholder="試合の感想や特記事項など"
                    />

                    <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                      <Chip
                        label={
                          (match.player_team_sets || 0) > (match.opponent_sets || 0) ? (
                            `団体戦勝利 (${match.player_team_sets}-${match.opponent_sets})`
                          ) : (match.player_team_sets || 0) < (match.opponent_sets || 0) ? (
                            `団体戦敗北 (${match.player_team_sets}-${match.opponent_sets})`
                          ) : (
                            `団体戦引き分け (${match.player_team_sets}-${match.opponent_sets})`
                          )
                        }
                        color={
                          (match.player_team_sets || 0) > (match.opponent_sets || 0)
                            ? 'success'
                            : (match.player_team_sets || 0) < (match.opponent_sets || 0)
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
          </Stack>
        </Paper>

        {/* Submit Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => router.push(`/events/${eventId}`)}
            disabled={saving}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? '保存中...' : '更新'}
          </Button>
        </Box>
      </Box>
    </div>
  );
}
