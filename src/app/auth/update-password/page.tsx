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
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LinearProgress from '@mui/material/LinearProgress';
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

const UpdatePasswordContainer = styled(Stack)(({ theme }) => ({
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

export default function UpdatePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [currentPasswordErrorMessage, setCurrentPasswordErrorMessage] = useState('');
  const [newPasswordErrorMessage, setNewPasswordErrorMessage] = useState('');
  const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = useState('');
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

  const handleClickShowCurrentPassword = () => setShowCurrentPassword((show) => !show);
  const handleClickShowNewPassword = () => setShowNewPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);

  // パスワード要件チェック関数
  const getPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 6,
      recommended: password.length >= 8,
      hasLetterAndNumber: /(?=.*[a-zA-Z])(?=.*\d)/.test(password),
      isDifferent: password !== currentPassword
    };
  };

  // パスワード強度計算
  const getPasswordStrength = (password: string) => {
    const requirements = getPasswordRequirements(password);
    const score = Object.values(requirements).filter(Boolean).length;
    return {
      score,
      percentage: (score / 4) * 100,
      label: score === 0 ? '' : score === 1 ? '弱い' : score === 2 ? '普通' : score === 3 ? '良い' : '強い',
      color: score <= 1 ? 'error' : score === 2 ? 'warning' : score === 3 ? 'info' : 'success'
    };
  };

  const validateInputs = () => {
    const currentPassword = document.getElementById('currentPassword') as HTMLInputElement;
    const newPassword = document.getElementById('newPassword') as HTMLInputElement;
    const confirmPassword = document.getElementById('confirmPassword') as HTMLInputElement;

    let isValid = true;

    if (!currentPassword.value || currentPassword.value.length < 6) {
      setCurrentPasswordError(true);
      setCurrentPasswordErrorMessage('現在のパスワードを入力してください。');
      isValid = false;
    } else {
      setCurrentPasswordError(false);
      setCurrentPasswordErrorMessage('');
    }

    if (!newPassword.value || newPassword.value.length < 6) {
      setNewPasswordError(true);
      setNewPasswordErrorMessage('新しいパスワードは6文字以上である必要があります。');
      isValid = false;
    } else if (newPassword.value.length < 8) {
      setNewPasswordError(true);
      setNewPasswordErrorMessage('より安全にするため、8文字以上のパスワードを推奨します。');
      isValid = false;
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword.value)) {
      setNewPasswordError(true);
      setNewPasswordErrorMessage('より安全にするため、英文字と数字を組み合わせてください。');
      isValid = false;
    } else {
      setNewPasswordError(false);
      setNewPasswordErrorMessage('');
    }

    if (!confirmPassword.value || confirmPassword.value !== newPassword.value) {
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
    setError('');
    setSuccess('');
    // エラー状態をクリア
    setCurrentPasswordError(false);
    setNewPasswordError(false);
    setConfirmPasswordError(false);
    setCurrentPasswordErrorMessage('');
    setNewPasswordErrorMessage('');
    setConfirmPasswordErrorMessage('');

    const data = new FormData(event.currentTarget);
    const currentPassword = data.get('currentPassword') as string;
    const newPassword = data.get('newPassword') as string;

    try {
      // 1. まず現在のパスワードを検証
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error('現在のパスワードが正しくありません。');
      }

      // 2. 現在のパスワードが正しければ、新しいパスワードに更新
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      // 3. パスワード更新成功時にセッションを更新
      await supabase.auth.refreshSession();

      setSuccess('パスワードが正常に更新されました。セキュリティのため、セッションも更新されました。');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: unknown) {
      console.error('Password update error:', error);
      let errorMessage = 'パスワードの更新に失敗しました。';

      if (error instanceof Error) {
        if (error.message.includes('現在のパスワードが正しくありません')) {
          errorMessage = '現在のパスワードが正しくありません。';
          setCurrentPasswordError(true);
          setCurrentPasswordErrorMessage('現在のパスワードが正しくありません。');
        } else if (error.message.includes('weak password')) {
          errorMessage = 'パスワードが弱すぎます。より複雑なパスワードを入力してください。';
          setNewPasswordError(true);
          setNewPasswordErrorMessage('パスワードが弱すぎます。より複雑なパスワードを設定してください。');
        } else if (error.message.includes('same password')) {
          errorMessage = '現在のパスワードと異なるパスワードを入力してください。';
          setNewPasswordError(true);
          setNewPasswordErrorMessage('現在のパスワードと異なるパスワードを入力してください。');
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = '現在のパスワードが正しくありません。';
          setCurrentPasswordError(true);
          setCurrentPasswordErrorMessage('現在のパスワードが正しくありません。');
        } else {
          errorMessage = error.message;
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
        <UpdatePasswordContainer direction="column" justifyContent="center">
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
        </UpdatePasswordContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <UpdatePasswordContainer direction="column" justifyContent="center">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(1.5rem, 8vw, 1.75rem)', textAlign: 'center' }}
          >
            パスワード更新
          </Typography>
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}
          >
            アカウント: {user.email}
            <br />
            セキュリティのため、現在のパスワードで本人確認を行います
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
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
              <FormLabel htmlFor="currentPassword">現在のパスワード</FormLabel>
              <TextField
                error={currentPasswordError}
                helperText={currentPasswordErrorMessage}
                name="currentPassword"
                placeholder="••••••"
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                autoComplete="current-password"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={currentPasswordError ? 'error' : 'primary'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowCurrentPassword}
                          edge="end"
                        >
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="newPassword">新しいパスワード</FormLabel>
              <TextField
                error={newPasswordError}
                helperText={newPasswordErrorMessage}
                name="newPassword"
                placeholder="••••••"
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                autoComplete="new-password"
                required
                fullWidth
                variant="outlined"
                color={newPasswordError ? 'error' : 'primary'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowNewPassword}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1, color: 'text.primary' }}>
                  📋 パスワード要件：
                </Typography>
                {newPassword ? (
                  // 入力中の場合はリアルタイムチェック表示
                  <Box>
                    {(() => {
                      const requirements = getPasswordRequirements(newPassword);
                      const strength = getPasswordStrength(newPassword);
                      return (
                        <Box>
                          {/* パスワード強度インジケーター */}
                          {strength.score > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  パスワード強度
                                </Typography>
                                <Typography variant="body2" sx={{ color: `${strength.color}.main` }}>
                                  {strength.label}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={strength.percentage}
                                color={strength.color as 'error' | 'warning' | 'info' | 'success'}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          )}

                          {/* 要件チェックリスト */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            {requirements.minLength ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'grey.400', mr: 1 }} />
                            )}
                            <Typography variant="body2" sx={{ color: requirements.minLength ? 'success.main' : 'text.secondary' }}>
                              最低6文字以上
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            {requirements.recommended ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'grey.400', mr: 1 }} />
                            )}
                            <Typography variant="body2" sx={{ color: requirements.recommended ? 'success.main' : 'text.secondary' }}>
                              8文字以上（推奨）
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            {requirements.hasLetterAndNumber ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'grey.400', mr: 1 }} />
                            )}
                            <Typography variant="body2" sx={{ color: requirements.hasLetterAndNumber ? 'success.main' : 'text.secondary' }}>
                              英文字と数字を組み合わせる
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {requirements.isDifferent ? (
                              <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'grey.400', mr: 1 }} />
                            )}
                            <Typography variant="body2" sx={{ color: requirements.isDifferent ? 'success.main' : 'text.secondary' }}>
                              現在のパスワードと異なること
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                ) : (
                  // 入力前の場合は基本要件を表示
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                    • 最低6文字以上（8文字以上を推奨）<br />
                    • 英文字と数字を組み合わせる<br />
                    • 現在のパスワードと異なること
                  </Typography>
                )}
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="confirmPassword">新しいパスワード（確認）</FormLabel>
              <TextField
                error={confirmPasswordError}
                helperText={confirmPasswordErrorMessage}
                name="confirmPassword"
                placeholder="••••••"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                required
                fullWidth
                variant="outlined"
                color={confirmPasswordError ? 'error' : 'primary'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowConfirmPassword}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </FormControl>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {loading ? '更新中...' : 'パスワードを更新'}
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
      </UpdatePasswordContainer>
    </ThemeProvider>
  );
}
