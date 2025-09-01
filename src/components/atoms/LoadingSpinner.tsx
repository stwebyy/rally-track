'use client';

import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

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

  // クライアントサイドでのみレンダリングして hydration エラーを防ぐ
  if (!mounted) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight,
        }}
      >
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #1976d2',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight,
      }}
    >
      <CircularProgress size={size} />
    </div>
  );
}
