'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import Divider from '@mui/material/Divider';
import { DataGrid, GridColDef, GridActionsCellItem, GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import { gridClasses } from '@mui/x-data-grid';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SportsIcon from '@mui/icons-material/Sports';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';

import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const DRAWER_WIDTH = 240;
const MINI_DRAWER_WIDTH = 64;

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

export default function Events() {
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = React.useState(true);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const [events, setEvents] = React.useState<EventWithMatchResults[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sortModel, setSortModel] = React.useState<GridSortModel>([{ field: 'date', sort: 'desc' }]);
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>({ items: [] });
  const [searchText, setSearchText] = React.useState('');
  const [filteredEvents, setFilteredEvents] = React.useState<EventWithMatchResults[]>([]);
  const supabase = createClient();

  React.useEffect(() => {
    // ユーザー状態を取得
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        // ログインしていない場合はサインインページにリダイレクト
        router.push('/signin');
      }
      setLoading(false);
    };

    getUser();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/signin');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  // クライアントサイドでのみローカルストレージから設定を読み込む
  React.useEffect(() => {
    setIsHydrated(true);
    try {
      const saved = localStorage.getItem('rally-track-sidebar-expanded');
      if (saved !== null) {
        setIsDesktopSidebarExpanded(JSON.parse(saved));
      }
    } catch {
      // エラーが発生した場合はデフォルト値を使用
    }
  }, []);

  // Filter events based on search text
  React.useEffect(() => {
    if (!searchText.trim()) {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(event =>
        event.name.toLowerCase().includes(searchText.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchText.toLowerCase()) ||
        event.date.includes(searchText)
      );
      setFilteredEvents(filtered);
    }
  }, [events, searchText]);

  // データを取得する関数
  const loadData = React.useCallback(async () => {
    setIsDataLoading(true);
    setError(null);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          match_results (*)
        `)
        .order('date', { ascending: false });

      if (eventsError) {
        throw eventsError;
      }

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError((error as Error).message);
    } finally {
      setIsDataLoading(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // サイドバー状態をローカルストレージに保存
  React.useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('rally-track-sidebar-expanded', JSON.stringify(isDesktopSidebarExpanded));
    }
  }, [isDesktopSidebarExpanded, isHydrated]);

  const handleDesktopSidebarToggle = () => {
    setIsDesktopSidebarExpanded(!isDesktopSidebarExpanded);
  };

  const handleMobileSidebarToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleDrawerToggle = () => {
    if (isDesktop) {
      handleDesktopSidebarToggle();
    } else {
      handleMobileSidebarToggle();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const handleRefresh = () => {
    if (!isDataLoading) {
      loadData();
    }
  };

  const handleCreateClick = () => {
    router.push('/events/new');
  };

  const handleRowClick = (params: { row: EventWithMatchResults }) => {
    router.push(`/events/${params.row.id}`);
  };

  const handleRowEdit = React.useCallback((event: EventWithMatchResults) => () => {
    router.push(`/events/edit/${event.id}`);
  }, [router]);

  const handleRowDelete = React.useCallback((event: EventWithMatchResults) => async () => {
    if (window.confirm(`「${event.name}」を削除しますか？`)) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', event.id);

        if (error) {
          throw error;
        }

        await loadData();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('削除に失敗しました');
      }
    }
  }, [supabase, loadData]);

  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'date',
        headerName: '年月日',
        type: 'date',
        width: 120,
        valueGetter: (value: string) => value && new Date(value),
      },
      {
        field: 'name',
        headerName: '試合名',
        width: 250,
        minWidth: 150,
      },
      {
        field: 'location',
        headerName: '試合場所',
        width: 150,
        minWidth: 100,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'アクション',
        width: 120,
        sortable: false,
        filterable: false,
        hideable: false,
        resizable: false,
        flex: 1,
        getActions: ({ row }: { row: EventWithMatchResults }) => [
          <GridActionsCellItem
            key="edit-item"
            icon={<EditIcon />}
            label="編集"
            onClick={handleRowEdit(row)}
          />,
          <GridActionsCellItem
            key="delete-item"
            icon={<DeleteIcon />}
            label="削除"
            onClick={handleRowDelete(row)}
          />,
        ],
      },
    ],
    [handleRowEdit, handleRowDelete],
  );

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.main',
                },
              },
            }}
          >
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
          <ListItemButton
            onClick={() => router.push('/auth/update-password')}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon>
              <LockIcon />
            </ListItemIcon>
            <ListItemText primary="パスワード更新" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => router.push('/auth/change-email')}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon>
              <EmailIcon />
            </ListItemIcon>
            <ListItemText primary="メールアドレス変更" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleSignOut}
            sx={{
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="サインアウト" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  // ミニサイドバーのコンテンツ（アイコンのみ）
  const miniDrawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        <ListItem disablePadding>
          <Tooltip title="試合結果" placement="right">
            <ListItemButton
              selected
              sx={{
                justifyContent: 'center',
                px: 2.5,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                <SportsIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <Tooltip title="パスワード更新" placement="right">
            <ListItemButton
              onClick={() => router.push('/auth/update-password')}
              sx={{
                justifyContent: 'center',
                px: 2.5,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0 }}>
                <LockIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </ListItem>
        <ListItem disablePadding>
          <Tooltip title="メールアドレス変更" placement="right">
            <ListItemButton
              onClick={() => router.push('/auth/change-email')}
              sx={{
                justifyContent: 'center',
                px: 2.5,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0 }}>
                <EmailIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </ListItem>
        <ListItem disablePadding>
          <Tooltip title="サインアウト" placement="right">
            <ListItemButton
              onClick={handleSignOut}
              sx={{
                justifyContent: 'center',
                px: 2.5,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0 }}>
                <LogoutIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </div>
  );

  if (loading || !isHydrated) {
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
    return null;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          width: {
            xs: '100%',
            md: `calc(100% - ${isDesktopSidebarExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)`
          },
          ml: {
            xs: 0,
            md: `${isDesktopSidebarExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px`
          },
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {isDesktop ? (isDesktopSidebarExpanded ? <MenuOpenIcon /> : <MenuIcon />) : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Rally Track - 試合結果管理
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: isDesktop ? (isDesktopSidebarExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH) : 0,
          flexShrink: 0,
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={isMobileSidebarOpen}
          onClose={handleMobileSidebarToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundColor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: isDesktopSidebarExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
              transition: (theme) => theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              backgroundColor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {isDesktopSidebarExpanded ? drawer : miniDrawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            xs: '100%',
            md: `calc(100% - ${isDesktopSidebarExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)`
          },
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />

        {/* Page header with actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            試合結果
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="データを再読み込み" placement="left" enterDelay={1000}>
              <div>
                <IconButton
                  size="small"
                  aria-label="refresh"
                  onClick={handleRefresh}
                  disabled={isDataLoading}
                >
                  <RefreshIcon />
                </IconButton>
              </div>
            </Tooltip>
            <Button
              variant="contained"
              onClick={handleCreateClick}
              startIcon={<AddIcon />}
            >
              新規作成
            </Button>
          </Stack>
        </Box>

        {/* Search field */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="試合名、場所、日付で検索..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ maxWidth: 400 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {/* Data Grid */}
        <Box sx={{
          height: 600,
          width: '100%',
          backgroundColor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <DataGrid
              rows={filteredEvents}
              columns={columns}
              loading={isDataLoading}
              onRowClick={handleRowClick}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 }
                },
                sorting: {
                  sortModel: sortModel,
                },
              }}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              filterModel={filterModel}
              onFilterModelChange={setFilterModel}
              disableRowSelectionOnClick
              slotProps={{
                loadingOverlay: {
                  variant: 'circular-progress',
                  noRowsVariant: 'circular-progress',
                },
                baseIconButton: {
                  size: 'small',
                },
              }}
              sx={{
                [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                  outline: 'transparent',
                },
                [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: {
                  outline: 'none',
                },
                [`& .${gridClasses.row}:hover`]: {
                  cursor: 'pointer',
                },
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
