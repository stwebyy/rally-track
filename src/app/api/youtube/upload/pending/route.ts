import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// 未完了セッション一覧取得
export const maxDuration = 30;

// シンプルなキャッシュ（メモリ内、5分間有効）
const cache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // キャッシュチェック
    const cacheKey = `pending_sessions_${user.id}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedData.data, {
        headers: { 'Cache-Control': 'private, max-age=300' } // 5分キャッシュ
      });
    }

    // URLパラメータ取得
    const url = new URL(request.url);
    const includeExpired = url.searchParams.get('includeExpired') === 'true';

    // 未完了セッション取得クエリ
    let query = supabase
      .from('upload_sessions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'uploading', 'processing'])
      .order('created_at', { ascending: false });

    // 期限切れを除外する場合
    if (!includeExpired) {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // セッション情報を整形
    const formattedSessions = sessions.map(session => {
      const progressPercentage = session.file_size > 0
        ? Math.round((session.uploaded_bytes / session.file_size) * 100)
        : 0;

      const isExpired = new Date() > new Date(session.expires_at);

      return {
        sessionId: session.id,
        fileName: session.file_name,
        fileSize: session.file_size,
        uploadedBytes: session.uploaded_bytes,
        progress: progressPercentage,
        status: isExpired ? 'expired' : session.status,
        youtubeUploadUrl: session.youtube_upload_url,
        metadata: session.metadata,
        errorMessage: session.error_message,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        isExpired: isExpired,
        canResume: !isExpired && (session.status === 'uploading' || session.status === 'pending')
      };
    });

    // 統計情報
    const stats = {
      total: formattedSessions.length,
      pending: formattedSessions.filter(s => s.status === 'pending').length,
      uploading: formattedSessions.filter(s => s.status === 'uploading').length,
      processing: formattedSessions.filter(s => s.status === 'processing').length,
      expired: formattedSessions.filter(s => s.isExpired).length,
      resumable: formattedSessions.filter(s => s.canResume).length
    };

    const responseData = {
      sessions: formattedSessions,
      stats: stats,
      timestamp: new Date().toISOString()
    };

    // キャッシュを更新
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'private, max-age=300' } // 5分キャッシュ
    });

  } catch (error) {
    console.error('Pending sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
