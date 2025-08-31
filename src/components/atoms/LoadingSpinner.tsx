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
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // サーバーサイドとクライアントサイドで同じHTMLを返す
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight,
      }}
    >
      {mounted ? (
        <CircularProgress size={size} />
      ) : (
        <Box
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #1976d2',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }}
        />
      )}
    </Box>
  );
}
