import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

type ScoreDisplayProps = {
  playerName: string;
  playerScore: number;
  opponentName: string;
  opponentScore: number;
  onPlayerScoreChange?: (score: number) => void;
  onOpponentScoreChange?: (score: number) => void;
  disabled?: boolean;
  readonly?: boolean;
  maxScore?: number;
  minScore?: number;
  size?: 'small' | 'medium' | 'large';
}

export default function ScoreDisplay({
  playerName,
  playerScore,
  opponentName,
  opponentScore,
  onPlayerScoreChange,
  onOpponentScoreChange,
  disabled = false,
  readonly = false,
  maxScore = 5,
  minScore = 0,
  size = 'medium',
}: ScoreDisplayProps) {
  const getChipColor = (score1: number, score2: number) => {
    if (score1 > score2) return 'success';
    if (score1 < score2) return 'error';
    return 'default';
  };

  const getTextFieldWidth = () => {
    switch (size) {
      case 'small': return 80;
      case 'large': return 150;
      default: return 120;
    }
  };

  const getNameMinWidth = () => {
    switch (size) {
      case 'small': return 80;
      case 'large': return 120;
      default: return 100;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return '0.9rem';
      case 'large': return '1.4rem';
      default: return '1.2rem';
    }
  };

  if (readonly) {
    return (
      <Box display="flex" gap={2} alignItems="center" justifyContent="center">
        <Typography variant="body1" sx={{ minWidth: getNameMinWidth(), textAlign: 'center' }}>
          {playerName || '自チーム'}
        </Typography>
        <Chip
          label={playerScore}
          color={getChipColor(playerScore, opponentScore)}
          sx={{ minWidth: 60, fontSize: getFontSize() }}
        />
        <Typography variant="h6" sx={{ mx: 2 }}>
          vs
        </Typography>
        <Chip
          label={opponentScore}
          color={getChipColor(opponentScore, playerScore)}
          sx={{ minWidth: 60, fontSize: getFontSize() }}
        />
        <Typography variant="body1" sx={{ minWidth: getNameMinWidth(), textAlign: 'center' }}>
          {opponentName || '相手チーム'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" gap={2} alignItems="center" justifyContent="center">
      <TextField
        label={'自チームセット数'}
        type="tel"
        slotProps={{ htmlInput: { min: minScore, max: maxScore } }}
        value={playerScore}
        onChange={(e) => onPlayerScoreChange?.(parseInt(e.target.value) || 0)}
        sx={{ width: getTextFieldWidth() }}
        disabled={disabled}
      />
      <Typography variant="h6" sx={{ mx: 2 }}>
        vs
      </Typography>
      <TextField
        label={'相手セット数'}
        type="tel"
        slotProps={{ htmlInput: { min: minScore, max: maxScore } }}
        value={opponentScore}
        onChange={(e) => onOpponentScoreChange?.(parseInt(e.target.value) || 0)}
        sx={{ width: getTextFieldWidth() }}
        disabled={disabled}
      />
    </Box>
  );
}
