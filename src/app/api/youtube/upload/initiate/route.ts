import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { google } from 'googleapis';

// YouTube Upload Session を開始
export const maxDuration = 60; // 1分以内で完了

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileSize, metadata } = await request.json();

    // パラメータ検証
    if (!fileName || !fileSize || !metadata) {
      return NextResponse.json(
        { error: 'Missing required parameters: fileName, fileSize, metadata' },
        { status: 400 }
      );
    }

    // YouTube API設定をチェック
    console.log('Environment variables check:', {
      hasClientId: !!process.env.YT_CLIENT_ID,
      hasClientSecret: !!process.env.YT_CLIENT_SECRET,
      hasRefreshToken: !!process.env.YT_REFRESH_TOKEN,
      clientIdLength: process.env.YT_CLIENT_ID?.length,
      refreshTokenLength: process.env.YT_REFRESH_TOKEN?.length
    });

    if (!process.env.YT_CLIENT_ID || !process.env.YT_CLIENT_SECRET || !process.env.YT_REFRESH_TOKEN) {
      console.error('Missing YouTube API credentials');
      return NextResponse.json(
        { error: 'YouTube API credentials not configured' },
        { status: 500 }
      );
    }

    // YouTube API クライアント設定
    const oauth2Client = new google.auth.OAuth2(
      process.env.YT_CLIENT_ID,
      process.env.YT_CLIENT_SECRET,
      'http://localhost' // リダイレクトURI（トークン取得時と同じもの）
    );

    // リフレッシュトークンからアクセストークンを取得
    const refreshToken = process.env.YT_REFRESH_TOKEN;
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      // アクセストークンを更新
      console.log('Attempting to refresh YouTube access token...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      console.log('YouTube API credentials refreshed successfully', {
        hasAccessToken: !!credentials.access_token,
        expiryDate: credentials.expiry_date
      });
    } catch (tokenError) {
      console.error('Failed to refresh YouTube access token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to authenticate with YouTube API' },
        { status: 401 }
      );
    }

    try {
      // YouTube Resumable Upload セッションを開始
      console.log('Starting YouTube Resumable Upload session with metadata:', {
        title: metadata.title,
        fileSize,
        privacy: metadata.privacy
      });

      const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oauth2Client.credentials.access_token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*',
          'X-Upload-Content-Length': fileSize.toString(),
        },
        body: JSON.stringify({
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags || [],
            categoryId: metadata.categoryId || '17', // Sports
          },
          status: {
            privacyStatus: metadata.privacy || 'unlisted',
          },
        }),
      });

      console.log('YouTube API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube API error:', response.status, errorText);
        throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
      }

      const uploadUrl = response.headers.get('location');
      if (!uploadUrl) {
        throw new Error('No upload URL received from YouTube API');
      }

      console.log('YouTube upload session created:', uploadUrl);

      const youtubeSessionId = `session_${Date.now()}_${user.id}`;

      console.log('Creating database session:', {
        userId: user.id,
        fileName,
        fileSize,
        youtubeSessionId,
        uploadUrlPresent: !!uploadUrl,
        metadataKeys: Object.keys(metadata)
      });

      // データベースにセッションを記録
      const { data: session, error: dbError } = await supabase
        .from('upload_sessions')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_size: fileSize,
          youtube_session_id: youtubeSessionId,
          youtube_upload_url: uploadUrl,
          uploaded_bytes: 0, // 初期値は0
          youtube_video_id: '', // 初期値は空文字（後でアップロード完了時に更新）
          metadata,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間後をISO文字列に変換
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', {
          error: dbError,
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        return NextResponse.json(
          { error: `Failed to create upload session: ${dbError.message}` },
          { status: 500 }
        );
      }

      console.log('Upload session created successfully:', {
        sessionId: session.id,
        uploadUrl: uploadUrl ? 'Present' : 'Missing',
        expiresAt: session.expires_at
      });

      return NextResponse.json({
        sessionId: session.id,
        uploadUrl: uploadUrl,
        expiresAt: session.expires_at,
      });

    } catch (youtubeError) {
      console.error('YouTube upload session creation error:', youtubeError);
      return NextResponse.json(
        { error: `YouTube API error: ${youtubeError instanceof Error ? youtubeError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Initiate upload error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
