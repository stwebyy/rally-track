'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

// Create a theme that matches Material-UI's sign-in template
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Material-UI default blue
    },
    secondary: {
      main: '#dc004e', // Material-UI default pink/red
    },
  },
  shape: {
    borderRadius: 8, // More consistent with Material-UI defaults
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  [theme.breakpoints.up('sm')]: {
    maxWidth: '450px',
  },
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const ChangeEmailContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

function SitemarkIcon() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(45deg, #1976d2 30%, #1565c0 90%)', // Material-UI blue gradient
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.2rem',
        }}
      >
        R
      </Box>
    </Box>
  );
}

export default function ChangeEmail() {
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        // ユーザーがログインしていない場合はサインインページにリダイレクト
        router.push('/signin');
      }
    };

    getUser();
  }, [router, supabase.auth]);

  const validateInputs = () => {
    const email = document.getElementById('email') as HTMLInputElement;
    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage('有効なメールアドレスを入力してください。');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    return isValid;
  };

  const handleRetry = async () => {
    if (retryCount >= 3) {
      setError('再試行回数が上限に達しました。しばらく時間をおいてからお試しください。');
      return;
    }

    setRetryCount(prev => prev + 1);
    setError('');

    // 少し待ってから再実行
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      }
    }, 1000);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const data = new FormData(event.currentTarget);
    const email = data.get('email') as string;

    try {
      const { error } = await supabase.auth.updateUser({
        email: email,
      });

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      setSuccess('メールアドレス変更の確認メールを送信しました。\n\n手順：\n1. 新しいメールアドレス（' + email + '）の受信箱を確認してください\n2. Supabaseからの確認メールを開き、「Confirm your new email」リンクをクリックしてください\n3. 確認が完了すると、メールアドレスが正式に変更されます\n4. その後、新しいメールアドレスでログインできるようになります\n\n※確認メールが届かない場合は、迷惑メールフォルダもご確認ください。');
      setNewEmail('');
      setRetryCount(0); // 成功時にリトライカウントをリセット

    } catch (error: unknown) {
      console.error('Email change error:', error);
      let errorMessage = 'メールアドレスの変更に失敗しました。';

      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error details:', error);

        if (error.message.includes('rate_limit') || error.message.includes('rate limit')) {
          errorMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください。';
        } else if (error.message.includes('same email') || error.message.includes('same_email')) {
          errorMessage = '現在のメールアドレスと異なるメールアドレスを入力してください。';
        } else if (error.message.includes('invalid email') || error.message.includes('invalid_email')) {
          errorMessage = '無効なメールアドレス形式です。';
        } else if (error.message.includes('email change') || error.message.includes('sending email') || error.message.includes('unexpected_failure')) {
          errorMessage = `❌ メール送信に失敗しました`;
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '現在のメールアドレスが確認されていません。まず現在のメールアドレスを確認してください。';
        } else {
          errorMessage = `エラー: ${error.message}`;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <ChangeEmailContainer direction="column" justifyContent="center">
          <Card variant="outlined">
            <SitemarkIcon />
            <Typography
              component="h1"
              variant="h4"
              sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)', textAlign: 'center' }}
            >
              読み込み中...
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          </Card>
        </ChangeEmailContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <ChangeEmailContainer direction="column" justifyContent="center">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)', textAlign: 'center' }}
          >
            メールアドレス変更
          </Typography>
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}
          >
            現在のメールアドレス: {user.email}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {error}
              {retryCount < 3 && error.includes('unexpected_failure') && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleRetry}
                    disabled={loading}
                  >
                    再試行 ({retryCount + 1}/3)
                  </Button>
                </Box>
              )}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 2,
            }}
          >
            <FormControl>
              <FormLabel htmlFor="email">新しいメールアドレス</FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={emailError ? 'error' : 'primary'}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={loading}
              />
            </FormControl>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {loading ? '送信中...' : 'メールアドレス変更を送信'}
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              <Link
                href="/"
                variant="body2"
                sx={{ alignSelf: 'center', fontWeight: 'medium' }}
              >
                ホームに戻る
              </Link>
            </Typography>
          </Box>
        </Card>
      </ChangeEmailContainer>
    </ThemeProvider>
  );
}
