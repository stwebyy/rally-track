import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { youtubeClient } from '@/lib/youtubeClient';

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

    // YouTube API認証状態確認
    const isAuthenticated = await youtubeClient.checkAuthStatus();

    return NextResponse.json({
      success: true,
      authenticated: isAuthenticated,
      message: isAuthenticated
        ? 'YouTube API authentication is valid'
        : 'YouTube API authentication failed',
    });

  } catch (error) {
    console.error('Auth status check error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
