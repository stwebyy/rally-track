import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// アップロード完了処理
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, youtubeVideoId } = await request.json();

    // パラメータ検証
    if (!sessionId || !youtubeVideoId) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, youtubeVideoId' },
        { status: 400 }
      );
    }

    // セッション存在確認とユーザー認証
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // セッション完了処理
    const { error: updateError } = await supabase
      .from('upload_sessions')
      .update({
        youtube_video_id: youtubeVideoId,
        status: 'completed',
        uploaded_bytes: session.file_size, // 完了時は全バイト
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Session completion error:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }

    // 試合との紐付け処理（metadata内にgameResultIdがある場合）
    if (session.metadata &&
        typeof session.metadata === 'object' &&
        !Array.isArray(session.metadata) &&
        'gameResultId' in session.metadata &&
        session.metadata.gameResultId) {
      try {
        const gameResultId = session.metadata.gameResultId;
        const gameId = typeof gameResultId === 'number' ? gameResultId : parseInt(String(gameResultId));

        // gameIdが有効な数値かチェック
        if (!isNaN(gameId)) {
          // 既存の試合結果テーブルを確認
          const { data: gameResult } = await supabase
            .from('match_games')
            .select('id')
            .eq('id', gameId)
            .single();

          if (gameResult) {
            // 試合結果にYouTube動画IDを関連付け
            await supabase
              .from('match_games')
              .update({
                youtube_video_id: youtubeVideoId,
                updated_at: new Date().toISOString()
              })
              .eq('id', gameId);
          }
        } else {
          console.warn('Invalid gameResultId in metadata:', gameResultId);
        }
      } catch (gameError) {
        console.error('Game result linking error:', gameError);
        // 試合紐付けエラーは警告レベル（セッション完了は成功）
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      youtubeVideoId: youtubeVideoId,
      status: 'completed',
      message: 'Upload completed successfully'
    });

  } catch (error) {
    console.error('Finalize upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
