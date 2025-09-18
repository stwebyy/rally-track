import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  VideoResponse
} from '@/types/database';

// Supabaseクエリ結果の型定義
type ExternalGameQuery = {
  id: number;
  created_at: string;
  game_no: number | null;
  opponent_player_name: string;
  is_doubles: boolean;
  player_name_id: number;
  player_name_2_id: number | null;
  match_result_id: number;
  match_game_movies: {
    game_movies: {
      id: number;
      title: string;
      url: string;
      created_at: string;
    };
  }[];
}

type InternalGameQuery = {
  id: number;
  created_at: string;
  player_id: number;
  opponent_id: number;
  harataku_match_result_id: number | null;
  harataku_match_results: {
    date: string;
  }[];
  harataku_game_movies: {
    game_movies: {
      id: number;
      title: string;
      url: string;
      created_at: string;
    };
  }[];
}

type MatchResult = {
  id: number;
  player_team_name: string;
  opponent_team_name: string;
  event_id: number;
  events: {
    event_date: string;
  }[];
}

type EnrichedExternalGame = ExternalGameQuery & {
  match_result?: MatchResult;
  event_date?: string;
  player_names: string[];
}

type EnrichedInternalGame = InternalGameQuery & {
  player: { name: string };
  opponent: { name: string };
  match_date?: string;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== YouTube videos API called ===');
  console.log('Request URL:', request.url);

  try {
    // Supabase認証チェック
    const supabase = await createClient();
    console.log('Supabase client created');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check result:', { user: user?.id, error: authError?.message });

    if (authError || !user) {
      console.log('Authentication failed:', authError?.message || 'No user');
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message || 'No user found' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // 変数宣言（適切な型定義）
    let externalVideos: EnrichedExternalGame[] = [];
    let internalVideos: EnrichedInternalGame[] = [];

    // 動画付きの部外試合ゲーム（全メンバーの動画）
    console.log('Fetching external games...');
    const { data: externalGames, error: externalError } = await supabase
      .from('match_games')
      .select(`
        id,
        created_at,
        game_no,
        opponent_player_name,
        is_doubles,
        player_name_id,
        player_name_2_id,
        match_result_id,
        match_game_movies!inner(
          game_movies!inner(
            id,
            title,
            url,
            created_at
          )
        )
      `)
      .order('created_at', { ascending: false });

    console.log('External games query result:', {
      count: externalGames?.length || 0,
      error: externalError?.message
    });

    if (externalGames && externalGames.length > 0) {
      // 試合結果を取得
      const matchResultIds = [...new Set(externalGames.map(game => game.match_result_id).filter(Boolean))];

      const { data: matchResults, error: matchResultError } = await supabase
        .from('match_results')
        .select(`
          id,
          player_team_name,
          opponent_team_name,
          event_id,
          events!inner(
            date
          )
        `)
        .in('id', matchResultIds);

      if (matchResultError) {
        console.error('Error fetching match results:', matchResultError);
        throw matchResultError;
      }

      // 選手名を取得
      const playerIds = [...new Set([
        ...externalGames.map(game => game.player_name_id).filter((id): id is number => id !== null),
        ...externalGames.map(game => game.player_name_2_id).filter((id): id is number => id !== null)
      ])];

      const { data: players, error: playersError } = await supabase
        .from('harataku_members')
        .select('id, name')
        .in('id', playerIds);

      if (playersError) {
        console.error('Error fetching players:', playersError);
        throw playersError;
      }

      const playerMap = new Map(players?.map(p => [p.id, p.name]) || []);
      const matchResultMap = new Map(matchResults?.map(mr => [mr.id, mr]) || []);

      externalVideos = externalGames.map(game => ({
        ...game,
        match_result: matchResultMap.get(game.match_result_id),
        event_date: matchResultMap.get(game.match_result_id)?.events?.date,
        player_names: [
          playerMap.get(game.player_name_id) || '不明',
          game.player_name_2_id ? playerMap.get(game.player_name_2_id) : undefined
        ].filter(Boolean) as string[]
      })) as unknown as EnrichedExternalGame[];
    }

    if (externalError) {
      console.error('Error fetching external videos:', externalError);
      // エラーがあっても続行（部内試合データは取得する）
    }

    // 動画付きの部内試合ゲーム（全メンバーの動画）
    console.log('Fetching internal games...');
    const { data: internalGames, error: internalError } = await supabase
      .from('harataku_game_results')
      .select(`
        id,
        created_at,
        player_id,
        opponent_id,
        harataku_match_result_id,
        harataku_match_results!inner(
          date
        ),
        harataku_game_movies!inner(
          game_movies!inner(
            id,
            title,
            url,
            created_at
          )
        )
      `)
      .order('created_at', { ascending: false });

    console.log('Internal games query result:', {
      count: internalGames?.length || 0,
      error: internalError?.message
    });

    if (internalGames && internalGames.length > 0) {
      // メンバー名を取得
      const playerIds = [...new Set([
        ...internalGames.map(game => game.player_id).filter((id): id is number => typeof id === 'number' && id !== null),
        ...internalGames.map(game => game.opponent_id).filter((id): id is number => typeof id === 'number' && id !== null)
      ])];

      const { data: members, error: membersError } = await supabase
        .from('harataku_members')
        .select('id, name')
        .in('id', playerIds);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }

      const memberMap = new Map(members?.map(m => [m.id, m.name]) || []);

      internalVideos = internalGames.map(game => ({
        ...game,
        player: { name: memberMap.get(game.player_id) || '不明' },
        opponent: { name: memberMap.get(game.opponent_id) || '不明' },
        match_date: game.harataku_match_results?.date
      })) as unknown as EnrichedInternalGame[];
    }

    if (internalError) {
      console.error('Error fetching internal videos:', internalError);
      // エラーがあっても続行（独立動画は取得する）
    }

    // データを簡単なフォーマットに変換（型安全性向上）
    const formatExternalVideos: VideoResponse[] = (externalVideos || []).map((video: EnrichedExternalGame): VideoResponse => {
      const matchResult = video.match_result;
      const gameType = video.is_doubles ? 'ダブルス' : 'シングルス';
      const gameNo = video.game_no ? `第${video.game_no}ゲーム` : '';
      const movie = video.match_game_movies[0]?.game_movies; // 最初の動画を取得

      // 選手名を取得
      const playerName = video.player_names?.[0] || '不明';
      const playerName2 = video.player_names?.[1] || '';
      const playerNames = video.is_doubles && playerName2
        ? `${playerName}・${playerName2}`
        : playerName;

      // 相手選手名
      const opponentName = video.opponent_player_name || '不明';

      // タイトルは動画のタイトルを使用（フォールバック用に生成もする）
      let generatedTitle = '';
      if (matchResult) {
        generatedTitle = `${matchResult.player_team_name} vs ${matchResult.opponent_team_name} - ${playerNames} vs ${opponentName}`;
        if (gameNo) generatedTitle += ` (${gameNo})`;
        generatedTitle += ` [${gameType}]`;
      } else {
        generatedTitle = `${playerNames} vs ${opponentName} - ${gameType}${gameNo ? ` (${gameNo})` : ''}`;
      }

      // 試合日時を取得
      const matchDate = video.event_date || video.created_at;

      return {
        id: `external_${video.id}`,
        title: movie?.title || generatedTitle,
        youtube_url: movie?.url || '',
        created_at: video.created_at,
        match_date: matchDate,
        match_type: 'external' as const,
      };
    });

    const formatInternalVideos: VideoResponse[] = (internalVideos || []).map((video: EnrichedInternalGame): VideoResponse => {
      const playerName = video.player?.name || '不明';
      const opponentName = video.opponent?.name || '不明';
      const movie = video.harataku_game_movies[0]?.game_movies; // 最初の動画を取得

      // フォールバック用タイトル
      const generatedTitle = `${playerName} vs ${opponentName} [部内試合]`;

      return {
        id: `internal_${video.id}`,
        title: movie?.title || generatedTitle,
        youtube_url: movie?.url || '',
        created_at: video.created_at,
        match_date: video.match_date || video.created_at,
        match_type: 'internal' as const,
      };
    });

    // 作成日時順でソート（すべての動画タイプを含める）
    const allVideos: VideoResponse[] = [...formatExternalVideos, ...formatInternalVideos]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 独立した動画も取得してマージ（試合に紐付いていない動画）
    console.log('Fetching standalone movies...');
    const { data: standaloneMovies, error: moviesError } = await supabase
      .from('game_movies')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('Standalone movies query result:', {
      count: standaloneMovies?.length || 0,
      error: moviesError?.message
    });

    if (moviesError) {
      console.error('Error fetching standalone movies:', moviesError);
    } else if (standaloneMovies) {
      // 中間テーブルで使用されている動画IDを取得
      const usedMovieIds = new Set<number>();

      const { data: matchGamesMovies } = await supabase
        .from('match_game_movies')
        .select('movie_id');

      if (matchGamesMovies) {
        matchGamesMovies.forEach((game) => {
          usedMovieIds.add(game.movie_id);
        });
      }

      const { data: internalGamesMovies } = await supabase
        .from('harataku_game_movies')
        .select('movie_id');

      if (internalGamesMovies) {
        internalGamesMovies.forEach((game) => {
          usedMovieIds.add(game.movie_id);
        });
      }

      // 未使用の独立動画をフィルタリング
      const unusedMovies = standaloneMovies.filter((movie) => !usedMovieIds.has(movie.id));

      // 独立動画をフォーマット
      const formattedStandaloneMovies: VideoResponse[] = unusedMovies.map((movie): VideoResponse => ({
        id: `standalone_${movie.id}`,
        title: movie.title,
        youtube_url: movie.url,
        created_at: movie.created_at,
        match_date: movie.created_at,
        match_type: 'standalone' as const,
      }));

      // 独立動画を結果に追加
      allVideos.push(...formattedStandaloneMovies);
      allVideos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    console.log(`Found ${allVideos.length} videos total for user ${user.id}`);
    console.log(`- External match videos: ${formatExternalVideos.length}`);
    console.log(`- Internal match videos: ${formatInternalVideos.length}`);
    console.log(`- Standalone videos: ${(standaloneMovies || []).length - (formatExternalVideos.length + formatInternalVideos.length)}`);

    // アップロードセッションからの動画も取得
    const { data: uploadSessions, error: uploadError } = await supabase
      .from('upload_sessions')
      .select(`
        id,
        youtube_video_id,
        video_id_status,
        metadata,
        created_at,
        status
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (uploadError) {
      console.error('Error fetching upload sessions:', uploadError);
    } else if (uploadSessions && uploadSessions.length > 0) {
      console.log(`Found ${uploadSessions.length} upload sessions`);

      // アップロードセッションを動画形式に変換
      const uploadVideos = uploadSessions
        .map(session => {
          try {
            const metadata = session.metadata as Record<string, unknown>;
            const isPlaceholder = session.youtube_video_id?.startsWith('placeholder_') || session.video_id_status === 'placeholder';

            return {
              id: `upload_${session.id}`,
              title: (typeof metadata?.title === 'string' ? metadata.title : null) || 'Untitled Video',
              youtube_url: isPlaceholder
                ? '#'
                : `https://www.youtube.com/watch?v=${session.youtube_video_id}`,
              created_at: session.created_at,
              match_date: session.created_at,
              match_type: 'standalone' as const,
              // プレースホルダー用の追加データ
              videoId: session.youtube_video_id,
              videoIdStatus: session.video_id_status,
              sessionId: session.id,
            };
          } catch (error) {
            console.error('Error processing upload session:', session.id, error);
            return null;
          }
        })
        .filter((video): video is NonNullable<typeof video> => video !== null);

      // 重複を除去（既存の動画と重複する場合は既存を優先）
      const existingUrls = new Set(allVideos.map(v => v.youtube_url));
      const newUploadVideos = uploadVideos.filter(v => !existingUrls.has(v.youtube_url));

      allVideos.push(...newUploadVideos);
      allVideos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log(`Added ${newUploadVideos.length} upload session videos`);
    };

    const response = {
      videos: allVideos,
      count: allVideos.length
    };

    console.log('=== API Response ready ===');
    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('=== Videos API Error ===');
    console.error('Videos list error:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    const errorResponse = {
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };

    console.error('Error response:', errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
