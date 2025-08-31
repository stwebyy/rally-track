'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuIcon from '@mui/icons-material/Menu';
import SportsIcon from '@mui/icons-material/Sports';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';

import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

const DRAWER_WIDTH = 240;

interface Event {
  id: number;
  name: string;
  date: string;
  location: string | null;
  created_at: string;
  updated_at: string;
}

interface MatchResult {
  id: number;
  event_id: number;
  team_name: string;
  player_name: string;
  player_style: string;
  opponent_team_name: string;
  opponent_player_name: string;
  opponent_player_style: string;
  team_sets: number;
  opponent_sets: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EventWithMatchResults extends Event {
  match_results: MatchResult[];
}

export default function EventDetail() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [event, setEvent] = React.useState<EventWithMatchResults | null>(null);
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
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

  // イベントデータを取得する関数
  const loadEventData = React.useCallback(async () => {
    if (!eventId) return;

    setIsDataLoading(true);
    setError(null);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          match_results (*)
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      setEvent(eventData);
    } catch (error) {
      console.error('Error loading event data:', error);
      setError((error as Error).message);
    } finally {
      setIsDataLoading(false);
    }
  }, [supabase, eventId]);

  React.useEffect(() => {
    if (user && eventId) {
      loadEventData();
    }
  }, [user, eventId, loadEventData]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleEdit = () => {
    router.push(`/${eventId}/edit`);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        throw error;
      }

      router.push('/');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('削除に失敗しました');
    }
    setDeleteDialogOpen(false);
  };

  const getResultChip = (teamSets: number, opponentSets: number) => {
    if (teamSets > opponentSets) {
      return <Chip label="勝ち" color="success" size="small" />;
    } else if (teamSets < opponentSets) {
      return <Chip label="負け" color="error" size="small" />;
    } else {
      return <Chip label="引分" color="default" size="small" />;
    }
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/')}>
            <ListItemIcon>
              <SportsIcon />
            </ListItemIcon>
            <ListItemText primary="試合結果" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/auth/update-password')}>
            <ListItemIcon>
              <LockIcon />
            </ListItemIcon>
            <ListItemText primary="パスワード更新" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/auth/change-email')}>
            <ListItemIcon>
              <EmailIcon />
            </ListItemIcon>
            <ListItemText primary="メールアドレス変更" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleSignOut}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="ログアウト" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (!user) {
    router.push('/signin');
    return null;
  }

  if (isDataLoading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}>
          <Toolbar>
            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Rally Track - 詳細表示
            </Typography>
          </Toolbar>
        </AppBar>
        <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
          <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}>
            {drawer}
          </Drawer>
          <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }} open>
            {drawer}
          </Drawer>
        </Box>
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
          <Toolbar />
          <Typography>データを読み込み中...</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}>
          <Toolbar>
            <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Rally Track - エラー
            </Typography>
          </Toolbar>
        </AppBar>
        <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
          <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}>
            {drawer}
          </Drawer>
          <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }} open>
            {drawer}
          </Drawer>
        </Box>
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
          <Toolbar />
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'イベントが見つかりません'}
          </Alert>
          <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
            一覧に戻る
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Rally Track - {event.name}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />

        {/* Header with actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
          >
            一覧に戻る
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={handleEdit}
              startIcon={<EditIcon />}
            >
              編集
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
              startIcon={<DeleteIcon />}
            >
              削除
            </Button>
          </Stack>
        </Box>

        {/* Event Information Card */}
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={event.name}
            subheader={`ID: ${event.id}`}
            avatar={<EventIcon color="primary" />}
          />
          <CardContent>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon color="action" />
                <Typography variant="body1">
                  <strong>開催日:</strong> {new Date(event.date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </Typography>
              </Box>
              {event.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnIcon color="action" />
                  <Typography variant="body1">
                    <strong>開催場所:</strong> {event.location}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                作成日: {new Date(event.created_at).toLocaleString('ja-JP')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                更新日: {new Date(event.updated_at).toLocaleString('ja-JP')}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Match Results */}
        <Card>
          <CardHeader
            title="試合結果"
            subheader={`${event.match_results?.length || 0}件の試合`}
          />
          <CardContent>
            {event.match_results && event.match_results.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>結果</TableCell>
                      <TableCell>チーム名</TableCell>
                      <TableCell>選手名</TableCell>
                      <TableCell>プレースタイル</TableCell>
                      <TableCell>相手チーム</TableCell>
                      <TableCell>相手選手</TableCell>
                      <TableCell>相手スタイル</TableCell>
                      <TableCell align="center">セット数</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {event.match_results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          {getResultChip(result.team_sets, result.opponent_sets)}
                        </TableCell>
                        <TableCell>{result.team_name}</TableCell>
                        <TableCell>{result.player_name}</TableCell>
                        <TableCell>{result.player_style}</TableCell>
                        <TableCell>{result.opponent_team_name}</TableCell>
                        <TableCell>{result.opponent_player_name}</TableCell>
                        <TableCell>{result.opponent_player_style}</TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {result.team_sets} - {result.opponent_sets}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                まだ試合結果が登録されていません
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          イベントを削除しますか？
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            「{event.name}」を削除します。この操作は元に戻せません。
            関連する試合結果もすべて削除されます。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
