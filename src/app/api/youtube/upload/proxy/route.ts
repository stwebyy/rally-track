import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// YouTube アップロードのプロキシエンドポイント
// ブラウザCORS制限を回避するため、サーバー経由でYouTube APIにアップロード
export const maxDuration = 300; // 5分

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URLパラメータまたはヘッダーからuploadUrlとsessionIdを取得
    const { searchParams } = new URL(request.url);
    let uploadUrl = searchParams.get('uploadUrl');
    let sessionId = searchParams.get('sessionId');

    // URLが長すぎる場合はヘッダーから取得
    if (!uploadUrl) {
      uploadUrl = request.headers.get('x-upload-url');
    }
    if (!sessionId) {
      sessionId = request.headers.get('x-session-id');
    }

    console.log('Proxy request params:', {
      hasUploadUrl: !!uploadUrl,
      hasSessionId: !!sessionId,
      uploadUrlLength: uploadUrl?.length,
      sessionId: sessionId
    });

    if (!uploadUrl || !sessionId) {
      return NextResponse.json(
        { error: 'Missing uploadUrl or sessionId parameter' },
        { status: 400 }
      );
    }

    // セッション検証（Supabaseから取得）
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', parseInt(sessionId))
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      console.error('Session validation failed:', sessionError);
      return NextResponse.json(
        { error: 'Invalid upload session' },
        { status: 404 }
      );
    }

    // リクエストヘッダーとボディを取得
    const contentRange = request.headers.get('content-range');
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const body = await request.arrayBuffer();

    console.log(`Proxying chunk upload: ${contentRange}, size: ${body.byteLength}, type: ${contentType}`);

    // YouTube APIに対してプロキシリクエスト
    const youtubeResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': contentRange || '',
        'Content-Type': contentType,
        ...(body.byteLength > 0 && { 'Content-Length': body.byteLength.toString() })
      },
      body: body.byteLength > 0 ? body : undefined,
    });

    console.log(`YouTube API response: ${youtubeResponse.status} ${youtubeResponse.statusText}`);

    // YouTube APIからのレスポンスヘッダーを転送
    const responseHeaders = new Headers();
    youtubeResponse.headers.forEach((value, key) => {
      // CORSやセキュリティ関連のヘッダーは除外
      if (!key.toLowerCase().startsWith('access-control') &&
          !key.toLowerCase().startsWith('x-') &&
          key.toLowerCase() !== 'server') {
        responseHeaders.set(key, value);
      }
    });

    // レスポンスボディを取得（エラーハンドリング強化）
    let responseBody: string | object | null = null;
    let responseBodyText = '';
    const contentTypeHeader = youtubeResponse.headers.get('content-type') || '';

    try {
      if (youtubeResponse.status === 204 || youtubeResponse.status === 308) {
        // No Content または Resume Incomplete の場合はボディは空
        responseBody = null;
      } else {
        // レスポンステキストを一度だけ読み取り
        responseBodyText = await youtubeResponse.text();
        console.log(`Raw YouTube response: ${responseBodyText.substring(0, 200)}...`);

        if (responseBodyText.trim()) {
          if (contentTypeHeader.includes('application/json')) {
            responseBody = JSON.parse(responseBodyText);
          } else {
            responseBody = responseBodyText;
          }
        } else {
          responseBody = null;
        }
      }
    } catch (parseError) {
      console.error('Response parsing error:', parseError);
      // パースエラーの場合は生のテキストを返す
      responseBody = responseBodyText || null;
    }

    console.log(`Response processed: status=${youtubeResponse.status}, hasBody=${!!responseBody}, bodyType=${typeof responseBody}`);

    return new NextResponse(
      responseBody ? JSON.stringify(responseBody) : null,
      {
        status: youtubeResponse.status,
        statusText: youtubeResponse.statusText,
        headers: responseHeaders,
      }
    );

  } catch (error) {
    console.error('Proxy upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
