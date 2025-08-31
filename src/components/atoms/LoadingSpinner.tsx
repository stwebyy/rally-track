'use client';

import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

interface LoadingSpinnerProps {
  size?: number;
  minHeight?: string;
}

export default function LoadingSpinner({
  size = 40,
  minHeight = '50vh'
}: LoadingSpinnerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight,
      }}
    >
      <CircularProgress size={size} />
    </Box>
  );
}
