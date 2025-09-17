import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ゲームデータの型定義
type GamePlayer = {
  name: string;
};

// Supabase クエリ結果の型定義
type ExternalMatchGameRaw = {
  id: string;
  player_name: string | null;
  opponent_player_name: string | null;
  team_sets: number | null;
  opponent_sets: number | null;
  match_result_id: string;
  youtube_url: string | null;
  created_at: string;
  updated_at: string;
};

type HaratakuGameResultRaw = {
  id: string;
  player_id: string;
  opponent_id: string;
  player_game_set: number | null;
  opponent_game_set: number | null;
  harataku_match_result_id: string;
  created_at: string;
  updated_at: string;
};

type HaratakuMember = {
  id: string;
  name: string;
};

type ExternalGameData = {
  id: string;
  player: GamePlayer;
  opponent: GamePlayer;
  player_game_set: number;
  opponent_game_set: number;
  external_match_result_id: string;
  youtube_url: string | null;
  created_at: string;
  updated_at: string;
};

type InternalGameData = {
  id: string;
  player: GamePlayer;
  opponent: GamePlayer;
  player_game_set: number;
  opponent_game_set: number;
  harataku_match_result_id: string;
  created_at: string;
  updated_at: string;
  player_id: string;
  opponent_id: string;
};

type GameData = ExternalGameData | InternalGameData;

export async function GET(request: NextRequest) {
  console.log('=== Games API called ===');

  try {
    // Supabase認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const matchType = searchParams.get('type'); // 'external' or 'internal'
    const matchId = searchParams.get('matchId');

    console.log('Request parameters:', { matchType, matchId });

    if (!matchType || !matchId) {
      return NextResponse.json(
        { error: 'Match type and match ID are required' },
        { status: 400 }
      );
    }

    let gamesData: GameData[] = [];

    if (matchType === 'external') {
      // 対外試合のゲーム情報を取得
      console.log('Fetching external games for match ID:', matchId);

      const { data, error } = await supabase
        .from('external_match_game_results')
        .select('*')
        .eq('match_result_id', matchId)
        .order('created_at', { ascending: true });

      console.log('External games query result:', {
        data: data?.length || 0,
        error: error?.message
      });

      if (error) {
        console.error('External games fetch error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch external games', details: error.message },
          { status: 500 }
        );
      }

      // 外部試合データを適切な形式に変換
      gamesData = (data || []).map((game: ExternalMatchGameRaw): ExternalGameData => ({
        id: game.id,
        player: { name: game.player_name || '不明' },
        opponent: { name: game.opponent_player_name || '不明' },
        player_game_set: game.team_sets || 0,
        opponent_game_set: game.opponent_sets || 0,
        external_match_result_id: game.match_result_id,
        youtube_url: game.youtube_url,
        created_at: game.created_at,
        updated_at: game.updated_at
      }));

    } else if (matchType === 'internal') {
      // 部内試合のゲーム情報を取得
      console.log('Fetching internal games for match ID:', matchId);

      const { data, error } = await supabase
        .from('harataku_game_results')
        .select(`
          id,
          player_id,
          opponent_id,
          player_game_set,
          opponent_game_set,
          harataku_match_result_id,
          created_at,
          updated_at
        `)
        .eq('harataku_match_result_id', matchId)
        .order('created_at', { ascending: true });

      console.log('Internal games query result:', {
        data: data?.length || 0,
        error: error?.message
      });

      if (error) {
        console.error('Harataku games fetch error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch harataku games', details: error.message },
          { status: 500 }
        );
      }

      // 選手名を別途取得
      if (data && data.length > 0) {
        const playerIds = [...new Set([
          ...data.map((game: HaratakuGameResultRaw) => game.player_id),
          ...data.map((game: HaratakuGameResultRaw) => game.opponent_id)
        ])];

        const { data: members, error: membersError } = await supabase
          .from('harataku_members')
          .select('id, name')
          .in('id', playerIds);

        console.log('Members query result:', {
          count: members?.length || 0,
          error: membersError?.message
        });

        if (membersError) {
          console.error('Members fetch error:', membersError);
          return NextResponse.json(
            { error: 'Failed to fetch member names', details: membersError.message },
            { status: 500 }
          );
        }

        const memberMap = new Map(members?.map((m: HaratakuMember) => [m.id, m.name]) || []);

        gamesData = data.map((game: HaratakuGameResultRaw): InternalGameData => ({
          id: game.id,
          player: { name: memberMap.get(game.player_id) || '不明' },
          opponent: { name: memberMap.get(game.opponent_id) || '不明' },
          player_game_set: game.player_game_set || 0,
          opponent_game_set: game.opponent_game_set || 0,
          harataku_match_result_id: game.harataku_match_result_id,
          created_at: game.created_at,
          updated_at: game.updated_at,
          player_id: game.player_id,
          opponent_id: game.opponent_id
        }));
      } else {
        gamesData = [];
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid match type. Must be "external" or "internal"' },
        { status: 400 }
      );
    }

    console.log('Returning games data:', { count: gamesData.length });

    return NextResponse.json({
      success: true,
      data: gamesData
    });

  } catch (error) {
    console.error('Unexpected error in games API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
