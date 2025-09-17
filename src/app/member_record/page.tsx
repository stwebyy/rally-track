'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { createClient } from '@/utils/supabase/client';
import PageLayout from '@/components/molescules/PageLayout';

type MemberRanking = {
  id: number;
  name: string;
  wins: number;
  losses: number;
  win_rate: number;
  win_sets: number;
  loss_sets: number;
  total_games: number;
}

type GameRecord = {
  id: number;
  match_date: string;
  player_name: string;
  opponent_name: string;
  player_sets: number;
  opponent_sets: number;
}

const MemberRecordRanking = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rankings, setRankings] = React.useState<MemberRanking[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>('全期間');
  const [availablePeriods, setAvailablePeriods] = React.useState<string[]>([]);

  const supabase = createClient();

  React.useEffect(() => {
    const loadRankingData = async () => {
      try {
        setLoading(true);

        // 部内試合記録を取得
        const { data: gamesData, error: gamesError } = await supabase
          .from('harataku_game_results')
          .select(`
            id,
            player_game_set,
            opponent_game_set,
            player:harataku_members!harataku_game_results_player_id_fkey(id, name),
            opponent:harataku_members!harataku_game_results_opponent_id_fkey(id, name),
            match:harataku_match_results!harataku_game_results_harataku_match_result_id_fkey(date)
          `);

        if (gamesError) throw gamesError;

        // ゲームレコードを整理
        const gameRecords: GameRecord[] = (gamesData || []).map(game => {
          const match = game.match as { date?: string } | null;
          const player = game.player as { id?: number; name?: string } | null;
          const opponent = game.opponent as { id?: number; name?: string } | null;

          return {
            id: game.id,
            match_date: match?.date || '',
            player_name: player?.name || '',
            opponent_name: opponent?.name || '',
            player_sets: game.player_game_set,
            opponent_sets: game.opponent_game_set,
          };
        });

        // 利用可能な期間を抽出
        const periods = new Set<string>();
        gameRecords.forEach(game => {
          if (game.match_date) {
            const date = new Date(game.match_date);
            const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
            periods.add(yearMonth);
          }
        });
        const sortedPeriods = Array.from(periods).sort().reverse();
        setAvailablePeriods(sortedPeriods);

        // 期間でフィルタリング
        const filteredGames = selectedPeriod === '全期間'
          ? gameRecords
          : gameRecords.filter(game => {
              if (!game.match_date) return false;
              const date = new Date(game.match_date);
              const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
              return yearMonth === selectedPeriod;
            });

        // メンバー別統計を計算
        const memberStatsMap = new Map<string, MemberRanking>();

        // 全メンバーを初期化
        const allMembers = new Set<string>();
        filteredGames.forEach(game => {
          if (game.player_name) allMembers.add(game.player_name);
          if (game.opponent_name) allMembers.add(game.opponent_name);
        });

        allMembers.forEach(memberName => {
          memberStatsMap.set(memberName, {
            id: 0, // 後で設定
            name: memberName,
            wins: 0,
            losses: 0,
            win_rate: 0,
            win_sets: 0,
            loss_sets: 0,
            total_games: 0,
          });
        });

        // 統計を計算
        filteredGames.forEach(game => {
          const playerWon = game.player_sets > game.opponent_sets;

          // プレイヤーの統計を更新
          const playerStats = memberStatsMap.get(game.player_name);
          if (playerStats) {
            playerStats.total_games++;
            playerStats.win_sets += game.player_sets;
            playerStats.loss_sets += game.opponent_sets;
            if (playerWon) {
              playerStats.wins++;
            } else {
              playerStats.losses++;
            }
          }

          // 対戦相手の統計を更新
          const opponentStats = memberStatsMap.get(game.opponent_name);
          if (opponentStats) {
            opponentStats.total_games++;
            opponentStats.win_sets += game.opponent_sets;
            opponentStats.loss_sets += game.player_sets;
            if (!playerWon) {
              opponentStats.wins++;
            } else {
              opponentStats.losses++;
            }
          }
        });

        // 勝率を計算してソート
        const rankingData = Array.from(memberStatsMap.values())
          .map((stats, index) => ({
            ...stats,
            id: index + 1,
            win_rate: stats.total_games > 0 ? Math.round((stats.wins / stats.total_games) * 100) : 0,
          }))
          .filter(stats => stats.total_games > 0) // 試合がある人のみ
          .sort((a, b) => {
            // 勝率で降順ソート、同じ場合は総試合数で降順
            if (b.win_rate !== a.win_rate) {
              return b.win_rate - a.win_rate;
            }
            return b.total_games - a.total_games;
          });

        setRankings(rankingData);

      } catch (error) {
        console.error('Error loading ranking data:', error);
        setError(error instanceof Error ? error.message : 'データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    loadRankingData();
  }, [selectedPeriod, supabase]);

  const handlePeriodChange = (event: SelectChangeEvent<string>) => {
    setSelectedPeriod(event.target.value);
  };

  if (loading) {
    return (
      <PageLayout title="部内ランキング">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="部内ランキング">
        <Alert severity="error">{error}</Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="部内ランキング">
      {/* 期間選択 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              部内ランキング
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>期間</InputLabel>
              <Select
                value={selectedPeriod}
                onChange={handlePeriodChange}
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
        </CardContent>
      </Card>

      {/* ランキング表 */}
      {rankings.length === 0 ? (
        <Alert severity="info">
          {selectedPeriod === '全期間' ? '試合記録がありません。' : '選択された期間に試合記録がありません。'}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="部内ランキング表">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '65px' }}>順位</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '110px' }}>名前</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '50px' }}>勝</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '50px' }}>負</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>勝率</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>得セット</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>失セット</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rankings.map((member, index) => (
                <TableRow
                  key={member.name}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: index < 3 ? 'action.hover' : 'inherit' // 上位3位をハイライト
                  }}
                >
                  <TableCell align="center" sx={{ width: '65px' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: index < 3 ? 'bold' : 'normal',
                        color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#CD7F32' : 'inherit'
                      }}
                    >
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: '110px' }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: index < 3 ? 'bold' : 'normal' }}
                    >
                      {member.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ width: '50px' }}>
                    <Typography variant="body2">{member.wins}</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ width: '50px' }}>
                    <Typography variant="body2">{member.losses}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 'bold',
                        color: member.win_rate >= 70 ? 'success.main' :
                               member.win_rate >= 50 ? 'warning.main' : 'error.main'
                      }}
                    >
                      {member.win_rate}%
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{member.win_sets}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{member.loss_sets}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 統計サマリー */}
      {rankings.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              統計サマリー ({selectedPeriod})
            </Typography>
            <Box display="flex" gap={4} flexWrap="wrap" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  参加者数
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {rankings.length}名
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  総試合数
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Math.round(rankings.reduce((sum, member) => sum + member.total_games, 0) / 2)}試合
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
};

export default MemberRecordRanking;
