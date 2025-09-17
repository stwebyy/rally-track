import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

export type VideoUploadParams = {
  title: string;
  description: string;
  privacy: 'public' | 'unlisted' | 'private';
  tags?: string[];
  categoryId?: string;
  thumbnailFile?: Buffer;
};

export type UploadProgress = {
  uploadId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoId?: string;
  error?: string;
};

class YouTubeClient {
  private oauth2Client: OAuth2Client;
  private youtube: youtube_v3.Youtube;
  private uploadProgresses = new Map<string, UploadProgress>();

  constructor() {
    const clientId = process.env.YT_CLIENT_ID;
    const clientSecret = process.env.YT_CLIENT_SECRET;
    const refreshToken = process.env.YT_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing YouTube API credentials. Please set YT_CLIENT_ID, YT_CLIENT_SECRET, and YT_REFRESH_TOKEN in environment variables.');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
      // 大容量ファイルアップロード用の設定
      timeout: 30 * 60 * 1000, // 30分のタイムアウト
    });
  }

  /**
   * アクセストークンを更新する
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw new Error('Failed to refresh YouTube API access token');
    }
  }

  /**
   * 動画をYouTubeにアップロードする
   */
  async uploadVideo(
    videoBuffer: Buffer,
    params: VideoUploadParams
  ): Promise<{ uploadId: string; videoId?: string }> {
    const uploadId = this.generateUploadId();

    try {
      // 初期ステータスを設定
      this.uploadProgresses.set(uploadId, {
        uploadId,
        status: 'uploading',
        progress: 0,
      });

      // アクセストークンの有効性を確認・更新
      await this.refreshAccessToken();

      const videoMetadata = {
        snippet: {
          title: params.title,
          description: params.description,
          tags: params.tags,
          categoryId: params.categoryId || '22', // デフォルトは「People & Blogs」
        },
        status: {
          privacyStatus: params.privacy,
        },
      };

      // BufferからReadableStreamを作成
      const videoStream = new Readable({
        read() {}
      });
      videoStream.push(videoBuffer);
      videoStream.push(null); // ストリーム終了

      // 動画アップロード実行（resumable upload使用）
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoMetadata,
        media: {
          mimeType: 'video/*',
          body: videoStream,
        },
        // Resumable uploadを使用（大容量ファイル用）
        uploadType: 'resumable',
      });

      const videoId = response.data.id;
      if (!videoId) {
        throw new Error('Video upload failed: No video ID returned');
      }

      // アップロード完了ステータスを更新
      this.uploadProgresses.set(uploadId, {
        uploadId,
        status: 'processing',
        progress: 100,
        videoId,
      });

      // サムネイルがある場合はアップロード
      if (params.thumbnailFile) {
        await this.uploadThumbnail(videoId, params.thumbnailFile);
      }

      // 最終ステータスを更新
      this.uploadProgresses.set(uploadId, {
        uploadId,
        status: 'completed',
        progress: 100,
        videoId,
      });

      return { uploadId, videoId };

    } catch (error) {
      console.error('Video upload failed:', error);

      // エラーステータスを更新
      this.uploadProgresses.set(uploadId, {
        uploadId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });

      throw error;
    }
  }

  /**
   * サムネイルをアップロードする
   */
  private async uploadThumbnail(videoId: string, thumbnailBuffer: Buffer): Promise<void> {
    try {
      await this.youtube.thumbnails.set({
        videoId,
        media: {
          body: thumbnailBuffer,
        },
      });
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      // サムネイルの失敗は動画アップロード全体を失敗させない
    }
  }

  /**
   * アップロード進捗を取得する
   */
  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.uploadProgresses.get(uploadId);
  }

  /**
   * アップロード進捗を削除する（クリーンアップ用）
   */
  clearUploadProgress(uploadId: string): void {
    this.uploadProgresses.delete(uploadId);
  }

  /**
   * ユニークなアップロードIDを生成する
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 動画情報を取得する
   */
  async getVideoInfo(videoId: string): Promise<youtube_v3.Schema$Video | null> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'status', 'statistics'],
        id: [videoId],
      });

      return response.data.items?.[0] || null;
    } catch {
      console.error('Failed to get video info');
      return null;
    }
  }

  /**
   * クライアントの認証状態を確認する
   */
  async checkAuthStatus(): Promise<boolean> {
    try {
      await this.refreshAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const youtubeClient = new YouTubeClient();
