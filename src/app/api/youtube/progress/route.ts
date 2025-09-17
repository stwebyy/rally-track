import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { youtubeClient } from '@/lib/youtubeClient';

export async function GET(request: NextRequest) {
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

    // URLからuploadIdを取得
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    // アップロード進捗を取得
    const progress = youtubeClient.getUploadProgress(uploadId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    // 動画情報も取得（完了している場合）
    let videoInfo = null;
    if (progress.status === 'completed' && progress.videoId) {
      videoInfo = await youtubeClient.getVideoInfo(progress.videoId);
    }

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        videoInfo,
      },
    });

  } catch (error) {
    console.error('Progress check error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 進捗をクリアするためのDELETEエンドポイント
export async function DELETE(request: NextRequest) {
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

    // URLからuploadIdを取得
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    // 進捗をクリア
    youtubeClient.clearUploadProgress(uploadId);

    return NextResponse.json({
      success: true,
      message: 'Upload progress cleared',
    });

  } catch (error) {
    console.error('Progress clear error:', error);

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
