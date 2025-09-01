import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import DeleteIcon from '@mui/icons-material/Delete';

import { MatchGame } from '@/types/event';
import { PLAYER_STYLES } from '@/types/constants';

interface Member {
  id: number;
  name: string;
}

interface MatchGameFormProps {
  game: MatchGame;
  totalGames: number;
  onGameChange: (field: keyof MatchGame, value: string | number | boolean) => void;
  onRemoveGame?: () => void;
  disabled?: boolean;
  members?: Member[];
}

export default function MatchGameForm({
  game,
  totalGames,
  onGameChange,
  onRemoveGame,
  disabled = false,
  members = [],
}: MatchGameFormProps) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle2">
            第{game.game_no}試合
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <FormControl>
              <RadioGroup
                row
                value={game.is_doubles ? 'doubles' : 'singles'}
                onChange={(e) => onGameChange('is_doubles', e.target.value === 'doubles')}
              >
                <FormControlLabel value="singles" control={<Radio />} label="シングルス" />
                <FormControlLabel value="doubles" control={<Radio />} label="ダブルス" />
              </RadioGroup>
            </FormControl>
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
        </Box>

        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {game.is_doubles ? 'ペア情報' : '選手情報'}
          </Typography>
          <Box display="flex" gap={2}>
            <FormControl fullWidth required>
              <InputLabel>{game.is_doubles ? '選手1人目の名前' : '選手名'}</InputLabel>
              <Select
                value={game.player_name}
                onChange={(e) => onGameChange('player_name', e.target.value)}
                label={game.is_doubles ? '選手1人目の名前' : '選手名'}
                disabled={disabled}
              >
                <MenuItem value="">選手を選択</MenuItem>
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {game.is_doubles && (
            <Box display="flex" gap={2}>
              <FormControl fullWidth required>
                <InputLabel>選手2人目の名前</InputLabel>
                <Select
                  value={game.player_name_2 || ''}
                  onChange={(e) => onGameChange('player_name_2', e.target.value)}
                  label="選手2人目の名前"
                  disabled={disabled}
                >
                  <MenuItem value="">選手を選択</MenuItem>
                  {members.map((member) => (
                    <MenuItem key={member.id} value={member.name}>
                      {member.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {game.is_doubles ? '相手ペア情報' : '相手選手情報'}
          </Typography>
          <Box display="flex" gap={2}>
            <TextField
              label={game.is_doubles ? '相手選手1人目の名前' : '相手選手名'}
              required
              fullWidth
              value={game.opponent_player_name}
              onChange={(e) => onGameChange('opponent_player_name', e.target.value)}
              disabled={disabled}
              placeholder="例：佐藤花子"
            />
            <FormControl fullWidth>
              <InputLabel>{game.is_doubles ? '相手選手1人目の戦型' : '相手戦型'}</InputLabel>
              <Select
                value={game.opponent_player_style}
                onChange={(e) => onGameChange('opponent_player_style', e.target.value)}
                label={game.is_doubles ? '相手選手1人目の戦型' : '相手戦型'}
                disabled={disabled}
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
            <Box display="flex" gap={2}>
              <TextField
                label="相手選手2人目の名前"
                required
                fullWidth
                value={game.opponent_player_name_2 || ''}
                onChange={(e) => onGameChange('opponent_player_name_2', e.target.value)}
                disabled={disabled}
                placeholder="例：鈴木一郎"
              />
              <FormControl fullWidth>
                <InputLabel>相手選手2人目の戦型</InputLabel>
                <Select
                  value={game.opponent_player_style_2 || ''}
                  onChange={(e) => onGameChange('opponent_player_style_2', e.target.value)}
                  label="相手選手2人目の戦型"
                  disabled={disabled}
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
              onChange={(e) => onGameChange('team_sets', parseInt(e.target.value) || 0)}
              disabled={disabled}
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
              onChange={(e) => onGameChange('opponent_sets', parseInt(e.target.value) || 0)}
              disabled={disabled}
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
            onChange={(e) => onGameChange('notes', e.target.value)}
            disabled={disabled}
            placeholder="試合の詳細や反省点などをメモできます"
            sx={{ mt: 2 }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
