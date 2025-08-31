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
import { DataGrid, GridColDef, GridActionsCellItem, GridSortModel, GridFilterModel } from '@mui/x-data-grid';
import { gridClasses } from '@mui/x-data-grid';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { createClient } from '@/utils/supabase/client';
import { EventWithMatchResults } from '@/types/event';
import { PageLayout, SearchField } from '@/components';

export default function Events() {
  const router = useRouter();

  const [events, setEvents] = React.useState<EventWithMatchResults[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sortModel, setSortModel] = React.useState<GridSortModel>([{ field: 'date', sort: 'desc' }]);
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>({ items: [] });
  const [searchText, setSearchText] = React.useState('');
  const [filteredEvents, setFilteredEvents] = React.useState<EventWithMatchResults[]>([]);
  const [isClient, setIsClient] = React.useState(false);
  const supabase = createClient();

  // クライアントサイドでのマウント確認
  React.useEffect(() => {
    setIsClient(true);
  }, []);

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
    loadData();
  }, [loadData]);

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
        width: 120,
        // 日付文字列から年月日部分のみを表示
        valueFormatter: (value: string) => {
          if (!value) return '';
          // YYYY-MM-DD形式の日付文字列をそのまま表示
          return value.split('T')[0];
        },
      },
      {
        field: 'name',
        headerName: '試合名',
        width: 150,
        minWidth: 150,
      },
      {
        field: 'location',
        headerName: '試合場所',
        width: 120,
        minWidth: 100,
      },
      {
        field: 'actions',
        type: 'actions',
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

  return (
    <PageLayout title="試合結果">
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
      <SearchField
        value={searchText}
        onChange={setSearchText}
        placeholder="試合名、場所、日付で検索..."
      />

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
        ) : isClient ? (
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
              [`& .${gridClasses.columnHeader}`]: {
                backgroundColor: '#f5f6fa',
                outline: 'transparent',
              },
              [`& .${gridClasses.cell}`]: {
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
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <Typography>読み込み中...</Typography>
          </Box>
        )}
      </Box>
    </PageLayout>
  );
};
