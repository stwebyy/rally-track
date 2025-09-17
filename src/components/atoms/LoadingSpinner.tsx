'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

// CSSアニメーションのスタイル
const spinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '3px solid #e0e0e0',
  borderTop: '3px solid #1976d2',
  animation: 'spin 1s linear infinite',
};

// Material-UIのCircularProgressを動的にインポート（SSR無効）
const CircularProgress = dynamic(() => import('@mui/material/CircularProgress'), {
  ssr: false,
  loading: () => <div style={spinnerStyle} />
});

interface LoadingSpinnerProps {
  size?: number;
  minHeight?: string;
}

const LoadingSpinner = ({
  size = 40,
  minHeight = '50vh'
}: LoadingSpinnerProps) => {
  React.useEffect(() => {
    // CSSアニメーションをheadに追加
    if (typeof document !== 'undefined') {
      const styleId = 'loading-spinner-keyframes';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

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
};

export default LoadingSpinner;
