'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { createClient } from '@/utils/supabase/client';
import PageLayout from '@/components/molescules/PageLayout';

type Member = {
  id: number;
  name: string;
}

type GameRecord = {
  id: number;
  event_date: string;
  opponent_name: string;
  team_sets: number;
  opponent_sets: number;
  is_win: boolean;
  is_doubles: boolean;
  partner_name?: string;
}

type OpponentStats = {
  opponent_name: string;
  wins: number;
  losses: number;
  total_team_sets: number;
  total_opponent_sets: number;
  win_rate: number;
  games: GameRecord[];
}

export default function MemberRecord() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [member, setMember] = React.useState<Member | null>(null);
  const [clubOpponentStats, setClubOpponentStats] = React.useState<OpponentStats[]>([]);
  const [externalOpponentStats, setExternalOpponentStats] = React.useState<OpponentStats[]>([]);
  const [currentTab, setCurrentTab] = React.useState(0);
  const [expandedAccordions, setExpandedAccordions] = React.useState<Set<string>>(new Set());
  const [selectedPeriods, setSelectedPeriods] = React.useState<Record<string, string>>({});
  const [globalSelectedPeriod, setGlobalSelectedPeriod] = React.useState<string>('');

  const supabase = createClient();

  React.useEffect(() => {
    const loadMemberRecord = async () => {
      try {
        setLoading(true);

        // メンバー情報を取得
        const { data: memberData, error: memberError } = await supabase
          .from('harataku_members')
          .select('id, name')
          .eq('id', memberId)
          .single();

        if (memberError) throw memberError;
        setMember(memberData);

        // 部内試合記録を取得
        const { data: clubGamesData, error: clubGamesError } = await supabase
          .from('harataku_game_results')
          .select(`
            id,
            player_game_set,
            opponent_game_set,
            player_id,
            opponent_id,
            harataku_match_results!inner(
              date,
              location
            ),
            player:harataku_members!player_id(name),
            opponent:harataku_members!opponent_id(name)
          `)
          .or(`player_id.eq.${memberId},opponent_id.eq.${memberId}`);

        if (clubGamesError) throw clubGamesError;

        // 部外試合記録を取得
        const { data: externalGamesData, error: externalGamesError } = await supabase
          .from('match_games')
          .select(`
            id,
            team_sets,
            opponent_sets,
            opponent_player_name,
            opponent_player_name_2,
            is_doubles,
            match_results!inner(
              events!inner(
                name,
                date
              )
            )
          `)
          .eq('player_name_id', memberId);

        if (externalGamesError) throw externalGamesError;

        // 部内試合統計を計算
        const clubStatsMap = new Map<string, OpponentStats>();
        clubGamesData?.forEach((game) => {
          // 型アサーション
          const matchResult = game.harataku_match_results as unknown as { date: string; location: string };
          const playerInfo = game.player as unknown as { name: string };
          const opponentInfo = game.opponent as unknown as { name: string };

          // 自分が player_id か opponent_id かを判定
          const isPlayer = game.player_id === parseInt(memberId);
          const myScore = isPlayer ? game.player_game_set : game.opponent_game_set;
          const opponentScore = isPlayer ? game.opponent_game_set : game.player_game_set;
          const opponentName = isPlayer ? opponentInfo.name : playerInfo.name;

          const isWin = myScore > opponentScore;

          const gameRecord: GameRecord = {
            id: game.id,
            event_date: matchResult.date,
            opponent_name: opponentName,
            team_sets: myScore,
            opponent_sets: opponentScore,
            is_win: isWin,
            is_doubles: false, // 部内試合はシングルスのみと仮定
            partner_name: undefined,
          };

          if (!clubStatsMap.has(opponentName)) {
            clubStatsMap.set(opponentName, {
              opponent_name: opponentName,
              wins: 0,
              losses: 0,
              total_team_sets: 0,
              total_opponent_sets: 0,
              win_rate: 0,
              games: [],
            });
          }

          const stats = clubStatsMap.get(opponentName)!;
          if (isWin) {
            stats.wins++;
          } else {
            stats.losses++;
          }
          stats.total_team_sets += myScore;
          stats.total_opponent_sets += opponentScore;
          stats.games.push(gameRecord);
        });

        // 部外試合統計を計算
        const externalStatsMap = new Map<string, OpponentStats>();
        externalGamesData?.forEach((game) => {
          const matchResult = game.match_results as unknown as { events: { name: string; date: string } };
          const eventDate = matchResult.events.date;
          const isWin = game.team_sets > game.opponent_sets;

          let opponentName = game.opponent_player_name;
          if (game.is_doubles && game.opponent_player_name_2) {
            opponentName += ` / ${game.opponent_player_name_2}`;
          }

          let partnerName: string | undefined;
          if (game.is_doubles) {
            partnerName = undefined; // 後で実装予定
          }

          const gameRecord: GameRecord = {
            id: game.id,
            event_date: eventDate,
            opponent_name: opponentName,
            team_sets: game.team_sets,
            opponent_sets: game.opponent_sets,
            is_win: isWin,
            is_doubles: game.is_doubles,
            partner_name: partnerName,
          };

          if (!externalStatsMap.has(opponentName)) {
            externalStatsMap.set(opponentName, {
              opponent_name: opponentName,
              wins: 0,
              losses: 0,
              total_team_sets: 0,
              total_opponent_sets: 0,
              win_rate: 0,
              games: [],
            });
          }

          const stats = externalStatsMap.get(opponentName)!;
          if (isWin) {
            stats.wins++;
          } else {
            stats.losses++;
          }
          stats.total_team_sets += game.team_sets;
          stats.total_opponent_sets += game.opponent_sets;
          stats.games.push(gameRecord);
        });

        // 統計を計算してソート
        const processStats = (statsMap: Map<string, OpponentStats>) => {
          return Array.from(statsMap.values()).map(stats => ({
            ...stats,
            win_rate: stats.wins + stats.losses > 0
              ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
              : 0,
            games: stats.games.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()),
          })).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
        };

        setClubOpponentStats(processStats(clubStatsMap));
        setExternalOpponentStats(processStats(externalStatsMap));

      } catch (error) {
        console.error('Error loading member record:', error);
        setError(error instanceof Error ? error.message : 'データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      loadMemberRecord();
    }
  }, [memberId, supabase]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAccordionChange = (panelId: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordions(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(panelId);
      } else {
        newSet.delete(panelId);
      }
      return newSet;
    });
  };

  const currentStats = currentTab === 0 ? clubOpponentStats : externalOpponentStats;

  // 期間選択用のヘルパー関数
  const getAvailablePeriods = React.useCallback((games: GameRecord[]) => {
    const periods = new Set<string>();
    games.forEach(game => {
      const date = new Date(game.event_date);
      const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      periods.add(yearMonth);
    });
    return Array.from(periods).sort().reverse(); // 新しい順
  }, []);

  const filterGamesByPeriod = React.useCallback((games: GameRecord[], period: string) => {
    if (!period) return games;
    return games.filter(game => {
      const date = new Date(game.event_date);
      const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      return yearMonth === period;
    });
  }, []);

  const calculateStatsForPeriod = React.useCallback((stats: OpponentStats, period: string) => {
    const filteredGames = filterGamesByPeriod(stats.games, period);
    const wins = filteredGames.filter(game => game.is_win).length;
    const losses = filteredGames.length - wins;
    const totalTeamSets = filteredGames.reduce((sum, game) => sum + game.team_sets, 0);
    const totalOpponentSets = filteredGames.reduce((sum, game) => sum + game.opponent_sets, 0);
    const winRate = filteredGames.length > 0 ? Math.round((wins / filteredGames.length) * 100) : 0;

    return {
      ...stats,
      wins,
      losses,
      total_team_sets: totalTeamSets,
      total_opponent_sets: totalOpponentSets,
      win_rate: winRate,
      games: filteredGames.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()),
    };
  }, [filterGamesByPeriod]);

  const handlePeriodChange = React.useCallback((opponentName: string, period: string) => {
    setSelectedPeriods(prev => ({
      ...prev,
      [`${currentTab}-${opponentName}`]: period
    }));
  }, [currentTab]);

  const handleGlobalPeriodChange = React.useCallback((period: string) => {
    setGlobalSelectedPeriod(period);
  }, []);

  // 全体のデータから利用可能な期間を取得
  const getGlobalAvailablePeriods = React.useMemo(() => {
    const allGames: GameRecord[] = [];
    const currentTabStats = currentTab === 0 ? clubOpponentStats : externalOpponentStats;

    currentTabStats.forEach(stats => {
      allGames.push(...stats.games);
    });

    const periods = new Set<string>();
    allGames.forEach(game => {
      const date = new Date(game.event_date);
      const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      periods.add(yearMonth);
    });
    return Array.from(periods).sort().reverse(); // 新しい順
  }, [currentTab, clubOpponentStats, externalOpponentStats]);

  // タブごとの戦績を計算
  const calculateTabStats = React.useMemo(() => {
    const currentTabStats = currentTab === 0 ? clubOpponentStats : externalOpponentStats;

    // 期間でフィルタリング
    let filteredStats = currentTabStats;
    if (globalSelectedPeriod !== '全期間') {
      filteredStats = currentTabStats.map(stats => ({
        ...stats,
        games: filterGamesByPeriod(stats.games, globalSelectedPeriod)
      })).filter(stats => stats.games.length > 0);
    }

    let totalWins = 0;
    let totalLosses = 0;
    let totalTeamSets = 0;
    let totalOpponentSets = 0;

    filteredStats.forEach(stats => {
      if (globalSelectedPeriod === '全期間') {
        totalWins += stats.wins;
        totalLosses += stats.losses;
        totalTeamSets += stats.total_team_sets;
        totalOpponentSets += stats.total_opponent_sets;
      } else {
        // 期間フィルタリング後の統計を計算
        const periodStats = calculateStatsForPeriod(stats, globalSelectedPeriod);
        totalWins += periodStats.wins;
        totalLosses += periodStats.losses;
        totalTeamSets += periodStats.total_team_sets;
        totalOpponentSets += periodStats.total_opponent_sets;
      }
    });

    const totalGames = totalWins + totalLosses;
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    return {
      totalWins,
      totalLosses,
      totalGames,
      totalTeamSets,
      totalOpponentSets,
      winRate,
    };
  }, [currentTab, clubOpponentStats, externalOpponentStats, globalSelectedPeriod, filterGamesByPeriod, calculateStatsForPeriod]);

  if (loading) {
    return (
      <PageLayout title="戦績表示">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="戦績表示">
        <Alert severity="error">{error}</Alert>
      </PageLayout>
    );
  }

  if (!member) {
    return (
      <PageLayout title="戦績表示">
        <Alert severity="warning">メンバーが見つかりません。</Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`${member.name}の戦績`}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => router.back()} color="inherit">
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {/* タブ切り替えと戦績表示 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="試合タイプ">
          <Tab label="部内試合結果" />
          <Tab label="部外試合結果" />
        </Tabs>
      </Box>

      {/* 選択中のタブの戦績表示 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              {currentTab === 0 ? '部内試合戦績' : '部外試合戦績'}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>期間</InputLabel>
              <Select
                value={globalSelectedPeriod}
                onChange={(e) => handleGlobalPeriodChange(e.target.value)}
                label="期間"
              >
                <MenuItem value="全期間">全期間</MenuItem>
                {getGlobalAvailablePeriods.map((period) => (
                  <MenuItem key={period} value={period}>
                    {period}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box display="flex" gap={4} flexWrap="wrap" alignItems="center">
            <Box>
              <Typography variant="caption" color="text.secondary">
                総試合数
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {calculateTabStats.totalGames}試合
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                勝敗
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {calculateTabStats.totalWins}勝 {calculateTabStats.totalLosses}敗
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                勝率
              </Typography>
              <Typography variant="body2" fontWeight="bold" color={calculateTabStats.winRate >= 50 ? 'success.main' : 'text.primary'}>
                {calculateTabStats.winRate}%
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              合計セット数
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {calculateTabStats.totalTeamSets} - {calculateTabStats.totalOpponentSets}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {currentStats.length === 0 ? (
        <Alert severity="info">
          {currentTab === 0 ? '部内試合記録がありません。' : '部外試合記録がありません。'}
        </Alert>
      ) : (
        <Stack spacing={2} sx={{ mb: { xs: 4, md: 2 } }}>
          {currentStats.map((stats: OpponentStats, index: number) => {
            const panelId = `${currentTab}-${stats.opponent_name}`;
            return (
              <Accordion
                key={stats.opponent_name}
                expanded={expandedAccordions.has(panelId)}
                onChange={handleAccordionChange(panelId)}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel-${index}-content`}
                  id={`panel-${index}-header`}
                >
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Typography
                    variant="body1"
                    sx={{
                      flex: '1',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: { xs: '115px', sm: '200px', md: '300px' }
                    }}
                  >
                    対 {stats.opponent_name}
                  </Typography>
                    <Chip
                      label={`${stats.wins}勝${stats.losses}敗`}
                      color={stats.wins > stats.losses ? 'success' : stats.wins < stats.losses ? 'error' : 'default'}
                      size="small"
                      sx={{ minWidth: '86px' }}
                    />
                    <Chip
                      label={`勝率: ${stats.win_rate}%`}
                      variant="outlined"
                      size="small"
                      sx={{ minWidth: '78px' }}
                    />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {(() => {
                  const selectedPeriod = selectedPeriods[`${currentTab}-${stats.opponent_name}`] || '';
                  const availablePeriods = getAvailablePeriods(stats.games);
                  const displayStats = calculateStatsForPeriod(stats, selectedPeriod);

                  return (
                    <>
                      {/* 期間選択 */}
                      <Box sx={{ mb: 3 }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>期間</InputLabel>
                          <Select
                            value={selectedPeriod || '全期間'}
                            onChange={(e) => handlePeriodChange(stats.opponent_name, e.target.value === '全期間' ? '' : e.target.value)}
                            label="期間"
                          >
                            <MenuItem value="全期間">全期間</MenuItem>
                            {availablePeriods.map((period) => (
                              <MenuItem key={period} value={period}>
                                {period}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      <Box display="flex" gap={4} mb={3} flexWrap="wrap">
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            勝敗
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {displayStats.wins}勝 {displayStats.losses}敗
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            勝率
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {displayStats.win_rate}%
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            合計セット数
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {displayStats.total_team_sets} - {displayStats.total_opponent_sets}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        {selectedPeriod ? `${selectedPeriod}の` : ''}直近5試合の記録
                      </Typography>

                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>年月日</TableCell>
                              <TableCell>セット数</TableCell>
                              <TableCell>勝敗</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {displayStats.games.slice(0, 5).map((game: GameRecord) => (
                              <TableRow key={game.id}>
                                <TableCell>
                                  {new Date(game.event_date).toLocaleDateString('ja-JP')}
                                </TableCell>
                                <TableCell>
                                  {game.team_sets}-{game.opponent_sets}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={game.is_win ? '勝ち' : '負け'}
                                    color={game.is_win ? 'success' : 'error'}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                            {displayStats.games.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} align="center">
                                  {selectedPeriod ? 'この期間の' : ''}試合記録がありません
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  );
                })()}
              </AccordionDetails>
            </Accordion>
            );
          })}
        </Stack>
      )}
    </PageLayout>
  );
}
