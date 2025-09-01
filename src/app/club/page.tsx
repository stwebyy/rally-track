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
import { MatchResultWithGameResults } from '@/types/club';
import { PageLayout, SearchField } from '@/components';

export default function ClubMatchResults() {
  const router = useRouter();

  const [matchResults, setMatchResults] = React.useState<MatchResultWithGameResults[]>([]);
  const [isDataLoading, setIsDataLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sortModel, setSortModel] = React.useState<GridSortModel>([{ field: 'date', sort: 'desc' }]);
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>({ items: [] });
  const [searchText, setSearchText] = React.useState('');
  const [filteredResults, setFilteredResults] = React.useState<MatchResultWithGameResults[]>([]);
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
      const { data: matchResultsData, error: matchResultsError } = await supabase
        .from('harataku_match_results')
        .select(`
          *,
          harataku_game_results (
            *,
            player:harataku_members!player_id(*),
            opponent:harataku_members!opponent_id(*)
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (matchResultsError) {
        throw matchResultsError;
      }

      // データ構造を調整
      const formattedData = (matchResultsData || []).map(result => ({
        ...result,
        game_results: result.harataku_game_results || []
      }));

      setMatchResults(formattedData);
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

  // Filter match results based on search text
  React.useEffect(() => {
    if (!searchText.trim()) {
      setFilteredResults(matchResults);
    } else {
      const filtered = matchResults.filter(result =>
        result.location?.toLowerCase().includes(searchText.toLowerCase()) ||
        result.date.includes(searchText)
      );
      setFilteredResults(filtered);
    }
  }, [matchResults, searchText]);

  const handleRefresh = () => {
    if (!isDataLoading) {
      loadData();
    }
  };

  const handleCreateClick = () => {
    router.push('/club/new');
  };

  const handleRowClick = (params: { row: MatchResultWithGameResults }) => {
    router.push(`/club/${params.row.id}`);
  };

  const handleRowEdit = React.useCallback((result: MatchResultWithGameResults) => () => {
    router.push(`/club/edit/${result.id}`);
  }, [router]);

  const handleRowDelete = React.useCallback((result: MatchResultWithGameResults) => async () => {
    if (window.confirm(`${result.date}の部内試合結果を削除しますか？`)) {
      try {
        const { error } = await supabase
          .from('harataku_match_results')
          .delete()
          .eq('id', result.id);

        if (error) {
          throw error;
        }

        await loadData();
      } catch (error) {
        console.error('Error deleting match result:', error);
        alert('削除に失敗しました');
      }
    }
  }, [supabase, loadData]);

  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'date',
        headerName: '年月日',
        width: 115,
        // 日付文字列から年月日部分のみを表示
        valueFormatter: (value: string) => {
          if (!value) return '';
          // YYYY-MM-DD形式の日付文字列をそのまま表示
          return value.split('T')[0];
        },
      },
      {
        field: 'location',
        headerName: '場所',
        width: 120,
        minWidth: 120,
      },
      {
        field: 'game_count',
        headerName: '部内試合数',
        width: 120,
        valueGetter: (value, row) => {
          return row.game_results?.length || 0;
        },
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
        getActions: ({ row }: { row: MatchResultWithGameResults }) => [
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
    <PageLayout title="原卓会部内試合結果">
      {/* Page header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
        placeholder="場所、日付で検索..."
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
            rows={filteredResults}
            columns={columns}
            loading={isDataLoading}
            onRowClick={handleRowClick}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 }
              },
              sorting: {
                sortModel: [{ field: 'date', sort: 'desc' }],
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
