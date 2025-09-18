import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// セッション状況確認
export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // セッション情報取得
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', parseInt(sessionId))
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // 進行率計算
    const progressPercentage = session.file_size > 0
      ? Math.round((session.uploaded_bytes / session.file_size) * 100)
      : 0;

    // セッション期限確認
    const isExpired = session.expires_at ? new Date() > new Date(session.expires_at) : false;
    const actualStatus = isExpired && session.status !== 'completed'
      ? 'failed'
      : session.status;

    // レスポンスデータ構築
    const responseData = {
      sessionId: session.id,
      fileName: session.file_name,
      fileSize: session.file_size,
      uploadedBytes: session.uploaded_bytes,
      progress: progressPercentage,
      status: actualStatus,
      youtubeVideoId: session.youtube_video_id,
      youtubeUploadUrl: session.youtube_upload_url,
      metadata: session.metadata,
      errorMessage: session.error_message,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      isExpired: isExpired
    };

    // 期限切れの場合はステータスを更新
    if (isExpired && session.status !== 'completed' && session.status !== 'failed') {
      await supabase
        .from('upload_sessions')
        .update({
          status: 'failed',
          error_message: 'Session expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', parseInt(sessionId))
        .eq('user_id', user.id);
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Session status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
