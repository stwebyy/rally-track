'use client';

import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'var(--font-roboto), Arial, sans-serif',
  },
});

// Emotion cache for Material-UI with SSR support
let cache: ReturnType<typeof createCache> | null = null;

const createEmotionCache = () => {
  if (!cache) {
    cache = createCache({
      key: 'css',
      prepend: true,
      // SSR support
      ...(typeof window === 'undefined' ? { insertionPoint: undefined } : {}),
    });
  }
  return cache;
};

const ThemeRegistry = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Remove server-side injected CSS
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles && jssStyles.parentElement) {
      jssStyles.parentElement.removeChild(jssStyles);
    }
  }, []);

  const emotionCache = createEmotionCache();

  // SSR時は最小限のスタイルで表示
  if (!mounted) {
    return (
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </CacheProvider>
    );
  }

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
};

export default ThemeRegistry;
