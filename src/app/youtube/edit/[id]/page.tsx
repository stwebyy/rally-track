'use client';

import * as React from 'react';
import { useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import PageLayout from '@/components/molescules/PageLayout';
import { createClient } from '@/utils/supabase/client';

// Types for new UI structure
type GameMovie = {
  id: number;
  title: string;
  url: string;
  created_at: string;
}

type MatchOption = {
  id: number;
  display: string;
}

type GameOption = {
  id: number;
  display: string;
}

const VideoEditPage = () => {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  // State
  const [video, setVideo] = React.useState<GameMovie | null>(null);
  const [title, setTitle] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  // New UI state
  const [selectedMatchType, setSelectedMatchType] = React.useState<'external' | 'internal' | ''>('');
  const [selectedMatchId, setSelectedMatchId] = React.useState<number | undefined>(undefined);
  const [selectedGameId, setSelectedGameId] = React.useState<number | undefined>(undefined);

  // Data
  const [externalMatches, setExternalMatches] = React.useState<MatchOption[]>([]);
  const [internalMatches, setInternalMatches] = React.useState<MatchOption[]>([]);
  const [externalGames, setExternalGames] = React.useState<GameOption[]>([]);
  const [internalGames, setInternalGames] = React.useState<GameOption[]>([]);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      // External matches
      const { data: externalData } = await supabase
        .from('match_results')
        .select('id, player_team_name, opponent_team_name, event_id')
        .order('id', { ascending: false });

      // Get events data separately
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, name, date');

      // Create events lookup map
      const eventsMap = new Map();
      (eventsData || []).forEach(event => {
        eventsMap.set(event.id, event);
      });

      // Internal matches
      const { data: internalData } = await supabase
        .from('harataku_match_results')
        .select('id, date, location')
        .order('date', { ascending: false });

      // Convert to display format
      const externalOptions: MatchOption[] = (externalData || []).map(match => {
        const event = eventsMap.get(match.event_id);
        const eventName = event?.name || '不明なイベント';
        return {
          id: match.id,
          display: `${eventName} - ${match.player_team_name} vs ${match.opponent_team_name}`
        };
      });

      const internalOptions: MatchOption[] = (internalData || []).map(match => ({
        id: match.id,
        display: `部内試合 (${new Date(match.date).toLocaleDateString('ja-JP')})`
      }));

      setExternalMatches(externalOptions);
      setInternalMatches(internalOptions);
    } catch (error) {
      console.error('Data loading error:', error);
    }
  }, [supabase]);

  const loadGamesForMatch = useCallback(async (matchId: number, isInternal: boolean) => {
    if (isInternal) {
      // Internal match games
      const { data } = await supabase
        .from('harataku_game_results')
        .select(`
          id,
          player_id,
          opponent_id,
          player_game_set,
          opponent_game_set
        `)
        .eq('harataku_match_result_id', matchId);

      // Get harataku_members data separately
      const { data: membersData } = await supabase
        .from('harataku_members')
        .select('id, name');

      // Create members lookup map
      const membersMap = new Map();
      (membersData || []).forEach(member => {
        membersMap.set(member.id, member);
      });

      const internalGameOptions: GameOption[] = (data || []).map(game => {
        const player = membersMap.get(game.player_id);
        const opponent = membersMap.get(game.opponent_id);

        const playerName = player?.name || `ID:${game.player_id}`;
        const opponentName = opponent?.name || `ID:${game.opponent_id}`;

        return {
          id: game.id,
          display: `${playerName} vs ${opponentName}`
        };
      });

      setInternalGames(internalGameOptions);
    } else {
      // External match games
      const { data } = await supabase
        .from('match_games')
        .select(`
          id,
          game_no,
          player_name_id,
          player_name_2_id,
          opponent_player_name,
          opponent_player_name_2,
          is_doubles
        `)
        .eq('match_result_id', matchId)
        .order('game_no', { ascending: true });

      // Get harataku_members data separately
      const { data: membersData } = await supabase
        .from('harataku_members')
        .select('id, name');

      // Create members lookup map
      const membersMap = new Map();
      (membersData || []).forEach(member => {
        membersMap.set(member.id, member);
      });

      const externalGameOptions: GameOption[] = (data || []).map(game => {
        const player1 = membersMap.get(game.player_name_id);
        const player2 = game.player_name_2_id ? membersMap.get(game.player_name_2_id) : null;

        const playerName = player1?.name || `ID:${game.player_name_id}`;
        const playerName2 = player2?.name || '';
        const displayPlayerName = game.is_doubles && playerName2
          ? `${playerName}/${playerName2}`
          : playerName;

        // Handle opponent names for doubles
        const opponentName1 = game.opponent_player_name;
        const opponentName2 = game.opponent_player_name_2 || '';
        const displayOpponentName = game.is_doubles && opponentName2
          ? `${opponentName1}/${opponentName2}`
          : opponentName1;

        return {
          id: game.id,
          display: `第${game.game_no}試合 - ${displayPlayerName} vs ${displayOpponentName}`
        };
      });

      setExternalGames(externalGameOptions);
    }
  }, [supabase]);

  // Load initial data
  React.useEffect(() => {
    loadData();

    const loadVideoData = async () => {
      if (!videoId) return;

      try {
        setLoading(true);
        setError('');

        // Get video data
        const { data: videoData, error: videoError } = await supabase
          .from('game_movies')
          .select('*')
          .eq('id', parseInt(videoId))
          .single();

        if (videoError) throw videoError;
        setVideo(videoData);
        setTitle(videoData.title);

        // Check existing external links
        const { data: externalLinks, error: externalError } = await supabase
          .from('match_game_movies')
          .select('match_game_id')
          .eq('movie_id', parseInt(videoId));

        if (!externalError && externalLinks?.length > 0) {
          setSelectedMatchType('external');
          setSelectedGameId(externalLinks[0].match_game_id);
        }

        // Check existing internal links
        const { data: internalLinks, error: internalError } = await supabase
          .from('harataku_game_movies')
          .select('harataku_game_results_id')
          .eq('movie_id', parseInt(videoId));

        if (!internalError && internalLinks?.length > 0) {
          setSelectedMatchType('internal');
          setSelectedGameId(internalLinks[0].harataku_game_results_id);
        }

      } catch (error) {
        console.error('Data loading error:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadVideoData();
  }, [videoId, loadData, supabase]);

  // Load games when match is selected
  React.useEffect(() => {
    if (selectedMatchType && selectedMatchId) {
      loadGamesForMatch(selectedMatchId, selectedMatchType === 'internal');
    }
  }, [selectedMatchType, selectedMatchId, loadGamesForMatch]);

  const handleMatchChange = (matchId: string) => {
    setSelectedMatchId(parseInt(matchId));
    setSelectedGameId(undefined);

    // Reset games
    setExternalGames([]);
    setInternalGames([]);
  };

  const handleSave = async () => {
    if (!video || !selectedGameId) return;

    try {
      setSaving(true);
      setError('');

      // Remove existing links
      await supabase
        .from('match_game_movies')
        .delete()
        .eq('movie_id', video.id);

      await supabase
        .from('harataku_game_movies')
        .delete()
        .eq('movie_id', video.id);

      // Create new link
      if (selectedMatchType === 'external') {
        const { error } = await supabase
          .from('match_game_movies')
          .insert([{
            match_game_id: selectedGameId,
            movie_id: video.id
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('harataku_game_movies')
          .insert([{
            harataku_game_results_id: selectedGameId,
            movie_id: video.id
          }]);
        if (error) throw error;
      }

      // Update title
      if (title !== video.title) {
        const { error } = await supabase
          .from('game_movies')
          .update({ title })
          .eq('id', video.id);
        if (error) throw error;
      }

      router.push('/youtube/videos');
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Stack spacing={3} maxWidth={800} mx="auto">
        <Typography variant="h4" component="h1">
          動画編集
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {video && (
          <>
            {/* Video Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  動画情報
                </Typography>
                <TextField
                  fullWidth
                  label="タイトル"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  margin="normal"
                />
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    URL: {video.url}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Match Selection */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  試合との紐付け
                </Typography>

                {/* Match Type Selection */}
                <FormControl component="fieldset" margin="normal">
                  <FormLabel component="legend">試合の種類</FormLabel>
                  <RadioGroup
                    value={selectedMatchType}
                    onChange={(e) => {
                      setSelectedMatchType(e.target.value as 'external' | 'internal');
                      setSelectedMatchId(undefined);
                      setSelectedGameId(undefined);
                      setExternalGames([]);
                      setInternalGames([]);
                    }}
                  >
                    <FormControlLabel value="external" control={<Radio />} label="対外試合" />
                    <FormControlLabel value="internal" control={<Radio />} label="部内試合" />
                  </RadioGroup>
                </FormControl>

                {/* Match Selection */}
                {selectedMatchType && (
                  <FormControl fullWidth margin="normal">
                    <Typography variant="subtitle2" gutterBottom>
                      試合を選択
                    </Typography>
                    <Select
                      value={selectedMatchId?.toString() || ''}
                      onChange={(e) => handleMatchChange(e.target.value as string)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>試合を選択してください</em>
                      </MenuItem>
                      {(selectedMatchType === 'external' ? externalMatches : internalMatches).map((match) => (
                        <MenuItem key={match.id} value={match.id}>
                          {match.display}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Game Selection */}
                {selectedMatchId && (selectedMatchType === 'external' ? externalGames.length > 0 : internalGames.length > 0) && (
                  <FormControl fullWidth margin="normal">
                    <Typography variant="subtitle2" gutterBottom>
                      ゲームを選択
                    </Typography>
                    <Select
                      value={selectedGameId?.toString() || ''}
                      onChange={(e) => setSelectedGameId(parseInt(e.target.value as string))}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>ゲームを選択してください</em>
                      </MenuItem>
                      {(selectedMatchType === 'external' ? externalGames : internalGames).map((game) => (
                        <MenuItem key={game.id} value={game.id}>
                          {game.display}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !selectedGameId}
                sx={{ minWidth: 120 }}
              >
                {saving ? <CircularProgress size={20} /> : '保存'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/youtube/videos')}
                disabled={saving}
              >
                キャンセル
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </PageLayout>
  );
};

export default VideoEditPage;
