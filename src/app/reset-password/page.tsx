'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { supabase } from '@/lib/supabaseClient';

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

const ResetPasswordContainer = styled(Stack)(({ theme }) => ({
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

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const [confirmPasswordError, setConfirmPasswordError] = React.useState(false);
  const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [isValidSession, setIsValidSession] = React.useState(false);

  React.useEffect(() => {
    // Check if we have a valid session from the password reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      } else {
        // Check URL parameters for access_token and refresh_token
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session from URL parameters
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!sessionError) {
            setIsValidSession(true);
          } else {
            setAuthError('パスワードリセットリンクが無効です。新しいリンクをリクエストしてください。');
          }
        } else {
          setAuthError('パスワードリセットリンクが無効です。新しいリンクをリクエストしてください。');
        }
      }
    };

    checkSession();
  }, [searchParams]);

  const validateInputs = () => {
    const password = document.getElementById('password') as HTMLInputElement;
    const confirmPassword = document.getElementById('confirmPassword') as HTMLInputElement;

    let isValid = true;

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('パスワードは6文字以上である必要があります。');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    if (!confirmPassword.value || confirmPassword.value !== password.value) {
      setConfirmPasswordError(true);
      setConfirmPasswordErrorMessage('パスワードが一致しません。');
      isValid = false;
    } else {
      setConfirmPasswordError(false);
      setConfirmPasswordErrorMessage('');
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    setAuthError('');
    setSuccessMessage('');

    const data = new FormData(event.currentTarget);
    const password = data.get('password') as string;

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage('パスワードが正常に更新されました。サインインページに移動します。');

      // Redirect to signin page after 2 seconds
      setTimeout(() => {
        router.push('/signin');
      }, 2000);

    } catch (error: unknown) {
      console.error('Password reset error:', error);
      let errorMessage = 'パスワードの更新に失敗しました。';

      if (error instanceof Error) {
        if (error.message.includes('weak password')) {
          errorMessage = 'パスワードが弱すぎます。より複雑なパスワードを入力してください。';
        } else if (error.message.includes('same password')) {
          errorMessage = '現在のパスワードと異なるパスワードを入力してください。';
        } else {
          errorMessage = error.message;
        }
      }

      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession && !authError) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <ResetPasswordContainer direction="column" justifyContent="center">
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
        </ResetPasswordContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <ResetPasswordContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)' }}
          >
            パスワードリセット
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            新しいパスワードを入力してください。
          </Typography>
          {authError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {authError}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ width: '100%' }}>
              {successMessage}
            </Alert>
          )}
          {isValidSession && (
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
                <FormLabel htmlFor="password">新しいパスワード</FormLabel>
                <TextField
                  error={passwordError}
                  helperText={passwordErrorMessage}
                  name="password"
                  placeholder="••••••"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  required
                  fullWidth
                  variant="outlined"
                  color={passwordError ? 'error' : 'primary'}
                  disabled={loading}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="confirmPassword">パスワード確認</FormLabel>
                <TextField
                  error={confirmPasswordError}
                  helperText={confirmPasswordErrorMessage}
                  name="confirmPassword"
                  placeholder="••••••"
                  type="password"
                  id="confirmPassword"
                  autoComplete="new-password"
                  required
                  fullWidth
                  variant="outlined"
                  color={confirmPasswordError ? 'error' : 'primary'}
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
                {loading ? 'パスワード更新中...' : 'パスワードを更新'}
              </Button>
            </Box>
          )}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              <Link
                href="/signin"
                variant="body2"
                sx={{ alignSelf: 'center', fontWeight: 'medium' }}
              >
                サインインページに戻る
              </Link>
            </Typography>
          </Box>
        </Card>
      </ResetPasswordContainer>
    </ThemeProvider>
  );
}
