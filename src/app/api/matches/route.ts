import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    // Supabase認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 対外試合結果を取得
    const { data: matchResults, error: matchError } = await supabase
      .from('match_results')
      .select(`
        id,
        event_id,
        player_team_name,
        opponent_team_name,
        player_team_sets,
        opponent_sets,
        game_no,
        notes,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (matchError) {
      console.error('Match results fetch error:', matchError);
      return NextResponse.json(
        { error: 'Failed to fetch match results' },
        { status: 500 }
      );
    }

    // 部内試合結果を取得
    const { data: haratakuResults, error: haratakuError } = await supabase
      .from('harataku_match_results')
      .select(`
        id,
        date,
        location,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (haratakuError) {
      console.error('Harataku results fetch error:', haratakuError);
      return NextResponse.json(
        { error: 'Failed to fetch harataku results' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        matchResults: matchResults || [],
        haratakuResults: haratakuResults || [],
      },
    });

  } catch (error) {
    console.error('Match data fetch error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
