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
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // SSR時は静的なプレースホルダーを表示
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight,
        }}
      >
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #1976d2',
          }}
        />
      </Box>
    );
  }

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
