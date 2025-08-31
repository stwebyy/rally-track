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
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { createClient } from '@/utils/supabase/client';
import { Event, MatchResult, MatchGame } from '@/types/event';
import {
  PageLayout,
  EventForm,
  MatchGameForm,
  ScoreDisplay
} from '@/components';

export default function EditEvent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

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

  const loadEventData = React.useCallback(async () => {
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
      // 日付をYYYY-MM-DD形式に変換
      const formattedDate = eventData.date ? new Date(eventData.date).toISOString().split('T')[0] : '';
      setEventDate(formattedDate);
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
          match_games: [{
            game_no: 1,
            player_name: '',
            player_style: '',
            opponent_player_name: '',
            opponent_player_style: '',
            team_sets: 0,
            opponent_sets: 0,
            is_doubles: false,
          }],
        }]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase]);

  React.useEffect(() => {
    loadEventData();
  }, [loadEventData]);

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
        match_games: [{
          game_no: 1,
          player_name: '',
          player_style: '',
          opponent_player_name: '',
          opponent_player_style: '',
          team_sets: 0,
          opponent_sets: 0,
          is_doubles: false,
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
              is_doubles: game.is_doubles,
              player_name_2: game.player_name_2?.trim() || null,
              player_style_2: game.player_style_2 || null,
              opponent_player_name_2: game.opponent_player_name_2?.trim() || null,
              opponent_player_style_2: game.opponent_player_style_2 || null,
              notes: game.notes?.trim() || null,
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
              is_doubles: game.is_doubles,
              player_name_2: game.player_name_2?.trim() || null,
              player_style_2: game.player_style_2 || null,
              opponent_player_name_2: game.opponent_player_name_2?.trim() || null,
              opponent_player_style_2: game.opponent_player_style_2 || null,
              notes: game.notes?.trim() || null,
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
      <PageLayout title="読み込み中">
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh'
        }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (!event) {
    return (
      <PageLayout title="エラー">
        <Alert severity="error">
          試合データが見つかりません。
        </Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="試合結果を編集">
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
        <EventForm
          eventName={eventName}
          eventDate={eventDate}
          eventLocation={eventLocation}
          onEventNameChange={setEventName}
          onEventDateChange={setEventDate}
          onEventLocationChange={setEventLocation}
          disabled={saving}
        />

        {/* Match Results */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              試合結果
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddMatchResult}
              disabled={saving}
              variant="outlined"
            >
              試合を追加
            </Button>
          </Box>

          <Stack spacing={3}>
            {matchResults.map((match, index) => (
              <Card key={match.id || `new-${index}`} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      試合 {match.game_no} {match.id && <Chip label="保存済み" size="small" color="primary" />}
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

                    <ScoreDisplay
                      playerName={match.player_team_name || '自チーム'}
                      playerScore={match.player_team_sets || 0}
                      opponentName={match.opponent_team_name || '相手チーム'}
                      opponentScore={match.opponent_sets || 0}
                      readonly={true}
                    />

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
                        <MatchGameForm
                          key={gameIndex}
                          game={game}
                          totalGames={match.match_games.length}
                          onGameChange={(field, value) => handleGameChange(index, gameIndex, field, value)}
                          onRemoveGame={match.match_games.length > 1 ? () => handleRemoveGame(index, gameIndex) : undefined}
                          disabled={saving}
                        />
                      ))}
                    </Box>

                    <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                      <Chip
                        label={
                          (match.player_team_sets || 0) > (match.opponent_sets || 0) ? (
                            `試合勝利 (${match.player_team_sets}-${match.opponent_sets})`
                          ) : (match.player_team_sets || 0) < (match.opponent_sets || 0) ? (
                            `試合敗北 (${match.player_team_sets}-${match.opponent_sets})`
                          ) : (
                            `試合引き分け (${match.player_team_sets}-${match.opponent_sets})`
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
    </PageLayout>
  );
}
