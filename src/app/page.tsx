'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const supabase = createClient();

  React.useEffect(() => {
    // ユーザー状態を取得
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const handleRefreshUser = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      padding={2}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            Rally Track
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom>
            ようこそ！
          </Typography>
          {user && (
            <Box mt={2}>
              <Typography variant="body1">
                <strong>メールアドレス:</strong> {user.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>ユーザーID:</strong> {user.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>最終ログイン:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ja-JP') : '不明'}
              </Typography>
            </Box>
          )}
          <Typography variant="body1" sx={{ mt: 2 }}>
            この画面が表示されているということは、正常にログインされています。
          </Typography>
        </CardContent>
        <CardActions>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => router.push('/auth/change-email')}
                sx={{ flex: 1 }}
              >
                メール変更
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => router.push('/auth/update-password')}
                sx={{ flex: 1 }}
              >
                パスワード更新
              </Button>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefreshUser}
              disabled={loading}
              fullWidth
            >
              {loading ? '更新中...' : 'ユーザー情報を更新'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSignOut}
              fullWidth
            >
              サインアウト
            </Button>
          </Box>
        </CardActions>
      </Card>
    </Box>
  );
}
