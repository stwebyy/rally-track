import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import type { VideoIdStatus } from '@/types/youtube-upload';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log('=== syncVideoId API called ===');
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('User authenticated:', user.id);

    const { sessionId } = await request.json();
    console.log('Session ID received:', sessionId);

    if (!sessionId) {
      console.error('Missing sessionId parameter');
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    // セッション情報を取得
    console.log('Fetching session from database...');
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }
    console.log('Session found:', {
      id: session.id,
      youtube_video_id: session.youtube_video_id,
      video_id_status: session.video_id_status,
      created_at: session.created_at,
      metadata: session.metadata
    });

    // プレースホルダーIDでない場合はエラー
    if (!session.youtube_video_id?.startsWith('placeholder_')) {
      console.error('Session does not have placeholder video ID:', session.youtube_video_id);
      return NextResponse.json(
        { error: 'Invalid session - not a placeholder video ID' },
        { status: 400 }
      );
    }
    console.log('Session has valid placeholder video ID');

    // メタデータを解析
    const metadata = session.metadata as Record<string, unknown>;
    console.log('Session metadata:', metadata);
    if (!metadata?.title || typeof metadata.title !== 'string') {
      console.error('Invalid or missing title in metadata:', metadata?.title);
      return NextResponse.json(
        { error: 'Invalid session - missing video metadata' },
        { status: 400 }
      );
    }
    console.log('Video title for search:', metadata.title);

    // YouTube APIで動画を検索
    console.log('Starting YouTube video search...');
    const matchedVideoId = await searchForUploadedVideo({
      title: metadata.title,
      description: typeof metadata.description === 'string' ? metadata.description : '',
      uploadTime: session.created_at,
      userId: user.id
    });

    console.log('Search result - matched video ID:', matchedVideoId);

    if (matchedVideoId) {
      console.log('Updating database with matched video ID...');
      // 実際のvideo IDで更新
      const { error: updateError } = await supabase
        .from('upload_sessions')
        .update({
          youtube_video_id: matchedVideoId,
          video_id_status: 'completed' as VideoIdStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update video ID:', updateError);
        return NextResponse.json(
          { error: 'Failed to update video ID' },
          { status: 500 }
        );
      }

      console.log('Database updated successfully');

      // 同期が成功したら、game_moviesテーブルに恒久的に保存
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${matchedVideoId}`;

        // game_moviesテーブルに挿入
        const { data: gameMovie, error: insertError } = await supabase
          .from('game_movies')
          .insert({
            title: metadata.title,
            url: videoUrl
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to insert into game_movies:', insertError);
          // この処理が失敗してもupload_sessionの更新は既に成功しているので、
          // エラーはログに記録するだけで処理を継続
        } else {
          console.log('Successfully saved to game_movies:', gameMovie);

          // upload_sessionsから削除（既に同期済みなので不要）
          const { error: deleteError } = await supabase
            .from('upload_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', user.id);

          if (deleteError) {
            console.error('Failed to delete upload_session:', deleteError);
            // 削除に失敗してもエラーはログ記録のみ
          } else {
            console.log('Successfully deleted upload_session');
          }
        }
      } catch (saveError) {
        console.error('Error saving to game_movies:', saveError);
        // エラーはログ記録のみで処理継続
      }

      return NextResponse.json({
        success: true,
        videoId: matchedVideoId
      });
    } else {
      console.error('No matching video found - returning 404');
      return NextResponse.json({
        success: false,
        error: 'Video not found in recent uploads'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Video sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * YouTube APIクライアントを初期化
 */
async function createYouTubeClient() {
  console.log('Creating YouTube API client...');
  const clientId = process.env.YT_CLIENT_ID;
  const clientSecret = process.env.YT_CLIENT_SECRET;
  const refreshToken = process.env.YT_REFRESH_TOKEN;
  const channelId = process.env.YT_CHANNEL_ID;

  console.log('Environment variables check:', {
    clientId: clientId ? '***set***' : 'MISSING',
    clientSecret: clientSecret ? '***set***' : 'MISSING',
    refreshToken: refreshToken ? '***set***' : 'MISSING',
    channelId: channelId ? '***set***' : 'MISSING'
  });

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing YouTube API credentials');
    throw new Error('YouTube API credentials not configured');
  }

  if (!channelId) {
    console.error('Missing YouTube channel ID');
    throw new Error('YouTube channel ID not configured');
  }

  // 適切なスコープを設定してOAuth2Clientを作成
  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: 'urn:ietf:wg:oauth:2.0:oob'
  });

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    console.log('Refreshing access token...');
    // アクセストークンを更新
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('Token refresh successful, scopes:', credentials.scope);
    oauth2Client.setCredentials(credentials);
    console.log('Access token refreshed successfully');

    // YouTube APIクライアントを作成（スコープ確認のため）
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // 簡単なテスト用APIを呼んでスコープ確認
    try {
      console.log('Testing API access with a simple call...');
      const testResponse = await youtube.search.list({
        part: ['snippet'],
        q: 'test',
        type: ['video'],
        maxResults: 1
      });
      console.log('Test search successful, found', testResponse.data.items?.length, 'items');
      return youtube;
    } catch (testError: unknown) {
      const error = testError as { message?: string; status?: number; code?: number; errors?: unknown; error?: unknown };
      console.error('Test search failed:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.errors || error.error
      });

      // 403エラーの場合、スコープ不足の詳細を表示
      if (error.status === 403 || error.code === 403) {
        console.error('Insufficient authentication scopes detected!');
        console.error('Current token scopes:', credentials.scope);
        console.error('Required scopes for search: https://www.googleapis.com/auth/youtube.readonly or https://www.googleapis.com/auth/youtube');
      }

      throw testError;
    }

  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw error;
  }
}

/**
 * YouTube APIで最近のアップロード動画を検索してマッチング
 */
async function searchForUploadedVideo(metadata: {
  title: string;
  description: string;
  uploadTime: string;
  userId: string;
}): Promise<string | null> {
  console.log('=== searchForUploadedVideo START ===');
  try {
    const youtube = await createYouTubeClient();
    console.log('YouTube client created successfully');

    // アップロード時刻の前後3日間で検索範囲を設定（より広い範囲）
    const uploadDate = new Date(metadata.uploadTime);
    const searchAfter = new Date(uploadDate.getTime() - 3 * 24 * 60 * 60 * 1000);
    const searchBefore = new Date(uploadDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    console.log('YouTube video search parameters:', {
      title: metadata.title,
      titleLength: metadata.title.length,
      uploadTime: metadata.uploadTime,
      searchAfter: searchAfter.toISOString(),
      searchBefore: searchBefore.toISOString(),
      searchRangeHours: 3 * 24 * 2  // 前後3日ずつ、計6日間
    });

    // 短いタイトルの場合の特別処理
    const isShortTitle = metadata.title.length <= 5;
    if (isShortTitle) {
      console.log('Short title detected, adjusting search strategy...');
    }

    // 複数の検索方法を試行
    let response;

    // 限定公開動画も含めてチャンネルのアップロード動画一覧から検索
    console.log('Searching in channel uploads (including unlisted videos)...');

    // 環境変数からチャンネルIDを取得
    const channelId = process.env.YT_CHANNEL_ID;
    if (!channelId) {
      console.error('YT_CHANNEL_ID environment variable is not set');
      throw new Error('YouTube channel ID not configured');
    }

    console.log('Getting uploads from channel ID:', channelId);

    try {
      // まずチャンネル情報を取得してアップロードプレイリストIDを取得
      const channelResponse = await youtube.channels.list({
        part: ['contentDetails'],
        id: [channelId]
      });

      if (!channelResponse.data.items?.length) {
        console.error('Channel not found:', channelId);
        throw new Error('Channel not found');
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        console.error('Uploads playlist not found for channel:', channelId);
        throw new Error('Uploads playlist not found');
      }

      console.log('Uploads playlist ID:', uploadsPlaylistId);

      // アップロードプレイリストから最近の動画一覧を取得（限定公開も含む）
      response = await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: 50 // より多くの動画を取得
      });

      console.log('Channel uploads search result:', response.data.items?.length, 'videos found');

      // 日付でフィルタリング
      if (response.data.items) {
        const filteredItems = response.data.items.filter(item => {
          if (!item.snippet?.publishedAt) return false;
          const publishedDate = new Date(item.snippet.publishedAt);
          return publishedDate >= searchAfter && publishedDate <= searchBefore;
        });

        console.log('Videos in date range:', filteredItems.length);

        // フィルタリング後の結果に置き換え
        response.data.items = filteredItems;
      }
    } catch (error) {
      console.log('Channel uploads search failed:', error);
      console.log('=== searchForUploadedVideo END (search error) ===');
      return null;
    }

    if (!response?.data.items?.length) {
      console.log('No videos found in search results');
      console.log('=== searchForUploadedVideo END (no results) ===');
      return null;
    }

    // デバッグ: 見つかった動画のタイトルをログ出力
    console.log('Found videos:', response.data.items.map(item => ({
      videoId: item.snippet?.resourceId?.videoId,
      title: item.snippet?.title,
      publishedAt: item.snippet?.publishedAt
    })));

    // 厳密な完全一致のみでマッチング
    let bestMatch = null;
    const targetTitle = metadata.title.toLowerCase().trim();

    for (const video of response.data.items) {
      if (!video.snippet?.title || !video.snippet?.resourceId?.videoId) continue;

      const videoTitle = video.snippet.title.toLowerCase().trim();

      console.log('Video match check:', {
        videoId: video.snippet.resourceId.videoId,
        videoTitle: video.snippet.title,
        targetTitle: metadata.title,
        publishedAt: video.snippet.publishedAt,
        exactMatch: videoTitle === targetTitle
      });

      // 完全一致のみ
      if (videoTitle === targetTitle) {
        bestMatch = video;
        console.log('Exact match found:', {
          videoId: video.snippet.resourceId.videoId,
          title: video.snippet.title
        });
        break; // 完全一致が見つかったら即座に終了
      }
    }

    if (bestMatch) {
      console.log('Exact match found:', {
        videoId: bestMatch.snippet?.resourceId?.videoId,
        title: bestMatch.snippet?.title
      });
      console.log('=== searchForUploadedVideo END (success) ===');
      return bestMatch.snippet?.resourceId?.videoId || null;
    } else {
      console.log('No exact match found.');
      console.log('=== searchForUploadedVideo END (no match) ===');
      return null;
    }
  } catch (error) {
    console.error('YouTube search error:', error);
    console.log('=== searchForUploadedVideo END (error) ===');
    return null;
  }
}
