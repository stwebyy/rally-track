import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// セッション再開
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
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
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // セッション期限確認
    const isExpired = new Date() > new Date(session.expires_at);
    if (isExpired) {
      // 期限切れセッションの状態更新
      await supabase
        .from('upload_sessions')
        .update({
          status: 'expired',
          error_message: 'Session expired - please start a new upload',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      return NextResponse.json(
        {
          error: 'Session expired',
          message: 'Please start a new upload session',
          canCreateNew: true
        },
        { status: 410 }
      );
    }

    // 既に完了している場合
    if (session.status === 'completed') {
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        youtubeVideoId: session.youtube_video_id,
        status: 'completed',
        message: 'Upload already completed'
      });
    }

    // 失敗状態の場合
    if (session.status === 'failed') {
      return NextResponse.json(
        {
          error: 'Upload failed previously',
          errorMessage: session.error_message,
          canRetry: true
        },
        { status: 400 }
      );
    }

    // 再開可能な状態確認
    const resumableStates = ['pending', 'uploading', 'processing'];
    if (!resumableStates.includes(session.status)) {
      return NextResponse.json(
        { error: 'Session cannot be resumed from current state' },
        { status: 400 }
      );
    }

    // セッション状態を uploading に更新
    const { error: updateError } = await supabase
      .from('upload_sessions')
      .update({
        status: 'uploading',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Session resume error:', updateError);
      return NextResponse.json(
        { error: 'Failed to resume session' },
        { status: 500 }
      );
    }

    // 進行率計算
    const progressPercentage = session.file_size > 0
      ? Math.round((session.uploaded_bytes / session.file_size) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      fileName: session.file_name,
      fileSize: session.file_size,
      uploadedBytes: session.uploaded_bytes,
      progress: progressPercentage,
      uploadUrl: session.youtube_upload_url,
      metadata: session.metadata,
      expiresAt: session.expires_at,
      status: 'uploading',
      message: 'Session resumed successfully'
    });

  } catch (error) {
    console.error('Resume session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
