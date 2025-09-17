import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { youtubeClient, VideoUploadParams } from '@/lib/youtubeClient';

// ファイルサイズの制限（5GB - YouTube の推奨最大サイズ）
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

// 対応する動画フォーマット（より包括的なMIMEタイプリスト）
const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/quicktime', // MOVファイルの一般的なMIMEタイプ
  'video/wmv',
  'video/flv',
  'video/webm',
  'video/mkv',
  'video/m4v',
  'video/x-msvideo', // AVIファイルの別のMIMEタイプ
  'video/x-ms-wmv', // WMVファイルの別のMIMEタイプ
  '', // 一部のシステムでMIMEタイプが取得できない場合
];

// 大容量ファイルアップロード用の設定
export const maxDuration = 300; // 5分（Vercel Hobby プランの上限）
export const dynamic = 'force-dynamic'; // 動的レンダリングを強制
export const runtime = 'nodejs'; // Node.jsランタイムを使用

// DBに動画情報を保存する非同期関数
async function saveVideoToDatabase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  videoId: string,
  matchType?: 'external' | 'internal',
  gameResultId?: number
): Promise<void> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // まずgame_moviesテーブルに動画情報を保存
    const { data: movieData, error: movieError } = await supabase
      .from('game_movies')
      .insert({
        title,
        url: videoUrl
      })
      .select('id')
      .single();

    if (movieError) {
      console.error('Movie insert error:', movieError);
      throw movieError;
    }

    const movieId = movieData.id;
    console.log(`Created movie record with ID: ${movieId}`);

    // 試合情報がある場合は、中間テーブルに関連を保存
    if (matchType && gameResultId) {
      if (matchType === 'external') {
        // 対外試合の中間テーブルに関連を保存
        const { error } = await supabase
          .from('match_game_movies')
          .insert({
            match_game_id: gameResultId,
            movie_id: movieId
          });

        if (error) {
          console.error('External match relation insert error:', error);
          throw error;
        }
      } else if (matchType === 'internal') {
        // 部内試合の中間テーブルに関連を保存
        const { error } = await supabase
          .from('harataku_game_movies')
          .insert({
            harataku_game_results_id: gameResultId,
            movie_id: movieId
          });

        if (error) {
          console.error('Internal match relation insert error:', error);
          throw error;
        }
      }

      console.log(`Successfully linked movie ${movieId} to ${matchType} game ${gameResultId}`);
    } else {
      console.log(`Created standalone movie record: ${movieId}`);
    }
  } catch (error) {
    console.error('Database save failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log('YouTube upload API called');

  try {
    // Supabase認証チェック
    console.log('Checking authentication...');
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

    // FormDataを取得
    console.log('Parsing form data...');
    const formData = await request.formData();

    // 必要なフィールドを取得
    const videoFile = formData.get('video') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tagsString = formData.get('tags') as string;
    const categoryId = formData.get('categoryId') as string;
    const thumbnailFile = formData.get('thumbnail') as File;

    // マッチ関連の情報を取得（任意）
    const matchType = formData.get('matchType') as 'external' | 'internal' | null;
    const matchResultId = formData.get('matchResultId') as string | null;
    const gameResultId = formData.get('gameResultId') as string | null;

    // バリデーション
    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      );
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // 試合情報はセットの場合のみバリデーション
    const hasMatchInfo = matchType && matchResultId && gameResultId;
    if ((matchType || matchResultId || gameResultId) && !hasMatchInfo) {
      return NextResponse.json(
        { error: 'If providing match information, all match fields (type, match ID, game ID) are required' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // ファイル形式チェック（MIMEタイプと拡張子の両方でチェック）
    const fileName = videoFile.name.toLowerCase();
    const supportedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));

    if (!SUPPORTED_VIDEO_FORMATS.includes(videoFile.type) && !hasValidExtension) {
      console.log('Unsupported video format:', {
        fileName: videoFile.name,
        mimeType: videoFile.type,
        size: videoFile.size
      });

      return NextResponse.json(
        { error: `Unsupported video format (MIME: ${videoFile.type || 'unknown'}, File: ${videoFile.name})` },
        { status: 400 }
      );
    }

    // 動画は限定公開のみに固定
    const privacy = 'unlisted';

    // プライバシー設定のバリデーション
    const validPrivacyValues = ['unlisted'];
    if (!validPrivacyValues.includes(privacy)) {
      return NextResponse.json(
        { error: 'Invalid privacy setting' },
        { status: 400 }
      );
    }

    // ファイルをBufferに変換
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    // タグの処理
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()) : undefined;

    // サムネイル処理
    let thumbnailBuffer: Buffer | undefined;
    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
    }

    // アップロードパラメータの準備
    const uploadParams: VideoUploadParams = {
      title,
      description,
      privacy,
      tags,
      categoryId,
      thumbnailFile: thumbnailBuffer,
    };

    // YouTube認証状態確認
    const authStatus = await youtubeClient.checkAuthStatus();
    if (!authStatus) {
      return NextResponse.json(
        { error: 'YouTube API authentication failed' },
        { status: 500 }
      );
    }

    // 動画アップロード実行
    const result = await youtubeClient.uploadVideo(videoBuffer, uploadParams);

    // 非同期でDBに動画情報を保存（試合情報がある場合は紐付けも行う）
    if (result.videoId) {
      // バックグラウンドでDB保存処理を実行
      saveVideoToDatabase(
        supabase,
        title,
        result.videoId,
        hasMatchInfo ? matchType : undefined,
        hasMatchInfo ? parseInt(gameResultId!) : undefined
      ).catch((error: Error) => {
        console.error('Database save error:', error);
      });
    }

    const response: {
      success: boolean;
      uploadId: string;
      videoId: string | null | undefined;
      message: string;
      matchType?: 'external' | 'internal';
      matchResultId?: number;
      gameResultId?: number;
    } = {
      success: true,
      uploadId: result.uploadId,
      videoId: result.videoId,
      message: 'Video upload started successfully',
    };

    // 試合情報がある場合のみレスポンスに追加
    if (hasMatchInfo && matchType && matchResultId && gameResultId) {
      response.matchType = matchType;
      response.matchResultId = parseInt(matchResultId);
      response.gameResultId = parseInt(gameResultId);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Video upload error:', error);

    // エラーの詳細をログ出力
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

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
