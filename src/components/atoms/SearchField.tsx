'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { SxProps, Theme } from '@mui/material/styles';

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxWidth?: number;
  fullWidth?: boolean;
  mb?: number;
  sx?: SxProps<Theme>;
}

export default function SearchField({
  value,
  onChange,
  placeholder = '検索...',
  maxWidth = 400,
  fullWidth = true,
  mb = 3,
  sx,
}: SearchFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <Box sx={{ mb, ...sx }}>
      <TextField
        fullWidth={fullWidth}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        sx={{ maxWidth }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
