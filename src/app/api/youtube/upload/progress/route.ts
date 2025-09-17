import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// アップロード進行状況を更新
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, uploadedBytes } = await request.json();

    // パラメータ検証
    if (!sessionId || typeof uploadedBytes !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, uploadedBytes' },
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

    // セッション期限確認
    if (new Date() > new Date(session.expires_at)) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 410 }
      );
    }

    // 進行状況を更新
    const status = uploadedBytes >= session.file_size ? 'processing' : 'uploading';

    const { error: updateError } = await supabase
      .from('upload_sessions')
      .update({
        uploaded_bytes: uploadedBytes,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Progress update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    // 進行率計算
    const progressPercentage = Math.round((uploadedBytes / session.file_size) * 100);

    return NextResponse.json({
      success: true,
      progress: progressPercentage,
      uploadedBytes,
      totalBytes: session.file_size,
      status: status
    });

  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
