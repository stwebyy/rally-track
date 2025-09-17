import * as React from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { PLAYER_STYLES } from '@/types/constants';

type PlayerStyleSelectProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
}

export default function PlayerStyleSelect({
  value,
  onChange,
  label = '戦型',
  disabled = false,
  required = false,
  fullWidth = true,
}: PlayerStyleSelectProps) {
  return (
    <FormControl fullWidth={fullWidth} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={label}
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
  );
}
