import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';

import DeleteIcon from '@mui/icons-material/Delete';

import { MatchGame } from '@/types/event';
import PlayerStyleSelect from '@/components/atoms/PlayerStyleSelect';
import ScoreDisplay from '@/components/atoms/ScoreDisplay';

interface MatchGameFormProps {
  game: MatchGame;
  totalGames: number;
  onGameChange: (field: keyof MatchGame, value: string | number) => void;
  onRemoveGame?: () => void;
  disabled?: boolean;
}

export default function MatchGameForm({
  game,
  totalGames,
  onGameChange,
  onRemoveGame,
  disabled = false,
}: MatchGameFormProps) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle2">
            第{game.game_no}試合
          </Typography>
          {totalGames > 1 && onRemoveGame && (
            <IconButton
              onClick={onRemoveGame}
              color="error"
              size="small"
              disabled={disabled}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>

        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            選手情報
          </Typography>
          <Box display="flex" gap={2}>
            <TextField
              label="選手名"
              required
              fullWidth
              value={game.player_name}
              onChange={(e) => onGameChange('player_name', e.target.value)}
              disabled={disabled}
              placeholder="例：田中太郎"
            />
            <PlayerStyleSelect
              value={game.player_style}
              onChange={(value) => onGameChange('player_style', value)}
              label="戦型"
              disabled={disabled}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            試合結果
          </Typography>
          <ScoreDisplay
            playerName="セット数"
            playerScore={game.team_sets}
            opponentName="相手セット数"
            opponentScore={game.opponent_sets}
            onPlayerScoreChange={(score) => onGameChange('team_sets', score)}
            onOpponentScoreChange={(score) => onGameChange('opponent_sets', score)}
            disabled={disabled}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            相手選手情報
          </Typography>
          <Box display="flex" gap={2}>
            <TextField
              label="相手選手名"
              required
              fullWidth
              value={game.opponent_player_name}
              onChange={(e) => onGameChange('opponent_player_name', e.target.value)}
              disabled={disabled}
              placeholder="例：佐藤花子"
            />
            <PlayerStyleSelect
              value={game.opponent_player_style}
              onChange={(value) => onGameChange('opponent_player_style', value)}
              label="相手戦型"
              disabled={disabled}
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
        </Stack>
      </CardContent>
    </Card>
  );
}
