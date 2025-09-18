import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  GetGamesRequestSchema,
  GetGamesResponseSchema,
  type GetGamesResponse,
  type ErrorResponse,
  type ExternalGameData,
  type InternalGameData,
} from '@/schemas/api';
import {
  ExternalMatchGameRaw,
  HaratakuGameResultRaw,
  HaratakuMemberSimple
} from '@/types';

export async function GET(request: NextRequest) {
  console.log('=== Games API called ===');

  try {
    // Supabase認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('Authentication failed:', authError);
      const errorResponse: ErrorResponse = { error: 'Unauthorized' };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // URLパラメータを取得してバリデーション
    const { searchParams } = new URL(request.url);
    const requestParams = {
      type: searchParams.get('type'),
      matchId: searchParams.get('matchId'),
    };

    console.log('Request parameters:', requestParams);

    // Zodスキーマでバリデーション
    const validationResult = GetGamesRequestSchema.safeParse(requestParams);

    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.flatten());
      const errorResponse: ErrorResponse = {
        error: 'Invalid request parameters',
        message: validationResult.error.issues.map(e => e.message).join(', ')
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { type: matchType, matchId } = validationResult.data;

    let gamesData: (ExternalGameData | InternalGameData)[] = [];

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
        const errorResponse: ErrorResponse = {
          error: 'Failed to fetch external games',
          message: error.message
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }

      // 外部試合データを適切な形式に変換
      gamesData = (data || []).map((game: ExternalMatchGameRaw): ExternalGameData => ({
        id: game.id,
        player_name: game.player_name,
        opponent_player_name: game.opponent_player_name,
        team_sets: game.team_sets,
        opponent_sets: game.opponent_sets,
        match_result_id: game.match_result_id,
        youtube_url: game.youtube_url,
        created_at: game.created_at,
        updated_at: game.updated_at,
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
        const errorResponse: ErrorResponse = {
          error: 'Failed to fetch harataku games',
          message: error.message
        };
        return NextResponse.json(errorResponse, { status: 500 });
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
          const errorResponse: ErrorResponse = {
            error: 'Failed to fetch member names',
            message: membersError.message
          };
          return NextResponse.json(errorResponse, { status: 500 });
        }

        const memberMap = new Map(members?.map((m: HaratakuMemberSimple) => [m.id, m.name]) || []);

        gamesData = data.map((game: HaratakuGameResultRaw): InternalGameData => ({
          id: game.id,
          player: {
            id: game.player_id,
            name: memberMap.get(game.player_id) || '不明'
          },
          opponent: {
            id: game.opponent_id,
            name: memberMap.get(game.opponent_id) || '不明'
          },
          player_game_set: game.player_game_set,
          opponent_game_set: game.opponent_game_set,
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
      const errorResponse: ErrorResponse = {
        error: 'Invalid match type. Must be "external" or "internal"'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log('Returning games data:', { count: gamesData.length });

    // レスポンスデータをZodスキーマでバリデーション
    const responseData: GetGamesResponse = {
      games: gamesData,
      total: gamesData.length,
      type: matchType,
    };

    // バリデーションしてからレスポンス
    const validatedResponse = GetGamesResponseSchema.parse(responseData);
    return NextResponse.json(validatedResponse);

  } catch (error) {
    console.error('Unexpected error in games API:', error);
    const errorResponse: ErrorResponse = { error: 'Internal server error' };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
