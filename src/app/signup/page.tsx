'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
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

// Create a theme that matches Material-UI's sign-up template
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

const SignUpContainer = styled(Stack)(({ theme }) => ({
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

export default function SignUp() {
  const router = useRouter();
  const supabase = createClient();
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const [nameError, setNameError] = React.useState(false);
  const [nameErrorMessage, setNameErrorMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');

  const validateInputs = () => {
    const email = document.getElementById('email') as HTMLInputElement;
    const password = document.getElementById('password') as HTMLInputElement;
    const name = document.getElementById('name') as HTMLInputElement;

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage('有効なメールアドレスを入力してください。');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('パスワードは6文字以上である必要があります。');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    if (!name.value || name.value.length < 1) {
      setNameError(true);
      setNameErrorMessage('お名前を入力してください。');
      isValid = false;
    } else {
      setNameError(false);
      setNameErrorMessage('');
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
    const email = data.get('email') as string;
    const password = data.get('password') as string;
    const name = data.get('name') as string;

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (authData.user) {
        // Create profile record in the profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              display_name: name,
            },
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw here as the user account was created successfully
          // The profile can be created later if needed
        }

        if (authData.user.email_confirmed_at) {
          // User is immediately confirmed, redirect to dashboard
          router.push('/');
        } else {
          // User needs to confirm email
          setSuccessMessage(
            '登録が完了しました！メールに送信された確認リンクをクリックしてアカウントを有効化してください。'
          );
        }
      }
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMessage = 'アカウント作成に失敗しました。';

      if (error instanceof Error) {
        console.error('Error message:', error.message);

        if (error.message.includes('already registered') ||
            error.message.includes('User already registered') ||
            error.message.includes('email address is already registered') ||
            error.message.includes('duplicate') ||
            error.message.includes('unique constraint') ||
            error.message.includes('already exists')) {
          errorMessage = 'このメールアドレスは既に登録されています。サインインページからログインしてください。';
        } else if (error.message.includes('weak password')) {
          errorMessage = 'パスワードが弱すぎます。より複雑なパスワードを入力してください。';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = '有効なメールアドレスを入力してください。';
        } else if (error.message.includes('Password should be at least 6 characters')) {
          errorMessage = 'パスワードは6文字以上である必要があります。';
        } else if (error.message.includes('Signup is disabled')) {
          errorMessage = '新規登録は現在無効になっています。管理者にお問い合わせください。';
        } else {
          errorMessage = `エラー: ${error.message}`;
        }
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as { message?: string; code?: string };
        if (errorObj.message) {
          console.error('Supabase error message:', errorObj.message);
          errorMessage = `エラー: ${errorObj.message}`;
        }
        if (errorObj.code) {
          console.error('Supabase error code:', errorObj.code);
        }
      }

      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <SignUpContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)' }}
          >
            サインアップ
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
              <FormLabel htmlFor="name">表示名</FormLabel>
              <TextField
                autoComplete="name"
                name="name"
                required
                fullWidth
                id="name"
                placeholder="原 卓哉"
                error={nameError}
                helperText={nameErrorMessage}
                color={nameError ? 'error' : 'primary'}
                disabled={loading}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="email">メールアドレス</FormLabel>
              <TextField
                required
                fullWidth
                id="email"
                placeholder="your@email.com"
                name="email"
                autoComplete="email"
                variant="outlined"
                error={emailError}
                helperText={emailErrorMessage}
                color={emailError ? 'error' : 'primary'}
                disabled={loading}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password">パスワード</FormLabel>
              <TextField
                required
                fullWidth
                name="password"
                placeholder="••••••"
                type="password"
                id="password"
                autoComplete="new-password"
                variant="outlined"
                error={passwordError}
                helperText={passwordErrorMessage}
                color={passwordError ? 'error' : 'primary'}
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
              {loading ? 'サインアップ中...' : 'サインアップ'}
            </Button>
          </Box>
          <Divider>
            <Typography sx={{ color: 'text.secondary' }}>または</Typography>
          </Divider>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ textAlign: 'center' }}>
              既にアカウントをお持ちの方は{' '}
              <Link
                href="/signin"
                variant="body2"
                sx={{ alignSelf: 'center', fontWeight: 'medium' }}
              >
                こちらからサインイン
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignUpContainer>
    </ThemeProvider>
  );
}
