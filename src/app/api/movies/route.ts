import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Movies list API called');

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

    // 全ての動画を取得
    const { data: allMovies, error: allMoviesError } = await supabase
      .from('game_movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (allMoviesError) {
      console.error('Error fetching all movies:', allMoviesError);
      throw allMoviesError;
    }

    // フォーマットして返す
    const formattedMovies = (allMovies || []).map((movie) => ({
      id: `movie_${movie.id}`,
      title: movie.title,
      youtube_url: movie.url,
      created_at: movie.created_at,
      updated_at: movie.updated_at,
      match_date: movie.created_at,
      match_type: 'standalone' as const,
    }));

    console.log(`Found ${formattedMovies.length} movies for user ${user.id}`);

    return NextResponse.json({
      videos: formattedMovies,
      count: formattedMovies.length
    });

  } catch (error) {
    console.error('Movies list error:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
