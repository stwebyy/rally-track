'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { createClient } from '@/utils/supabase/client';

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
    borderRadius: 8,
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

const ConfirmContainer = styled(Stack)(({ theme }) => ({
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
          background: 'linear-gradient(45deg, #1976d2 30%, #1565c0 90%)',
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

function ConfirmContent() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  React.useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // URLパラメータから確認用のトークンを取得
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (type === 'email_change' && token_hash) {
          // メール変更の確認を処理
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email_change',
          });

          if (error) {
            throw error;
          }

          setSuccess(true);
          setMessage('メールアドレスの変更が正常に完了しました。新しいメールアドレスでログインできるようになりました。');

          // 3秒後にホームページにリダイレクト
          setTimeout(() => {
            router.push('/');
          }, 3000);

        } else if (type === 'signup') {
          // サインアップの確認を処理
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token_hash!,
            type: 'signup',
          });

          if (error) {
            throw error;
          }

          setSuccess(true);
          setMessage('アカウントの確認が完了しました。ログインできるようになりました。');

          // 3秒後にサインインページにリダイレクト
          setTimeout(() => {
            router.push('/signin');
          }, 3000);

        } else {
          throw new Error('無効な確認リンクです。');
        }

      } catch (error: unknown) {
        console.error('Confirmation error:', error);
        let errorMessage = '確認処理に失敗しました。';

        if (error instanceof Error) {
          if (error.message.includes('token_hash')) {
            errorMessage = '確認リンクが無効または期限切れです。新しい確認メールをリクエストしてください。';
          } else {
            errorMessage = error.message;
          }
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [searchParams, router, supabase.auth]);

  if (loading) {
    return (
      <Card variant="outlined">
        <SitemarkIcon />
        <Typography
          component="h1"
          variant="h4"
          sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)', textAlign: 'center' }}
        >
          確認処理中...
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <SitemarkIcon />

      {success ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
          </Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)', textAlign: 'center' }}
          >
            確認完了
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            3秒後に自動的にリダイレクトされます...
          </Typography>
          <Button
            variant="contained"
            fullWidth
            onClick={() => router.push('/')}
            sx={{ mt: 2 }}
          >
            今すぐホームに移動
          </Button>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <ErrorIcon sx={{ fontSize: 60, color: 'error.main' }} />
          </Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)', textAlign: 'center' }}
          >
            確認エラー
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            fullWidth
            onClick={() => router.push('/signin')}
            sx={{ mt: 2 }}
          >
            サインインページに戻る
          </Button>
        </>
      )}
    </Card>
  );
}

export default function Confirm() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <ConfirmContainer direction="column" justifyContent="center">
        <Suspense fallback={
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
        }>
          <ConfirmContent />
        </Suspense>
      </ConfirmContainer>
    </ThemeProvider>
  );
}
