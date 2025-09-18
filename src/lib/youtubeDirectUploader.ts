import {
  VideoMetadata,
  UploadProgress,
  YouTubeUploadResponse,
  UploadError,
  UploadErrorType
} from '@/types/youtube-upload';
import { YouTubeQuotaTracker } from './youtubeQuotaTracker';

export class YouTubeDirectUploader {
  // 最適化されたチャンクサイズ（32MB）- YouTube APIの推奨に従い大きくして効率化
  private static readonly CHUNK_SIZE = 32 * 1024 * 1024; // 32MB（最大効率化）
  private static readonly MIN_CHUNK_SIZE = 256 * 1024; // 256KB（最小サイズ）
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒
  private static readonly PROGRESS_UPDATE_INTERVAL = 10000; // 10秒（プログレス更新間隔）
  private static readonly CHUNK_UPLOAD_INTERVAL = 500; // 0.5秒（チャンクアップロード間隔 - 高速化）

  private progressCallback?: (progress: UploadProgress) => void;
  private abortController?: AbortController;

  constructor(onProgress?: (progress: UploadProgress) => void) {
    this.progressCallback = onProgress;
  }

  /**
   * 新しいアップロードセッションを開始
   */
  async startUpload(file: File, metadata: VideoMetadata): Promise<string> {
    try {
      // クォータチェック
      if (!YouTubeQuotaTracker.canUpload()) {
        const quota = YouTubeQuotaTracker.getRemainingQuota();
        throw new Error(`本日のYouTube APIクォータを超過しています。残り: ${quota.remaining} units (最大 ${quota.maxUploads} アップロード可能)`);
      }

      // 1. サーバーでYouTube Upload セッション作成
      const session = await this.initiateUploadSession(file, metadata);

      // 2. YouTube Resumable Upload API を使用して直接アップロード
      const result = await this.uploadToYouTube(file, session);

      // 3. 完了時にサーバーに通知
      await this.finalizeUpload(session.sessionId, result.videoId);

      return result.videoId;
    } catch (error) {
      this.handleUploadError(error as Error);
      throw error;
    }
  }

  /**
   * アップロードを中断
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * YouTube Upload セッション開始API呼び出し
   */
  private async initiateUploadSession(
    file: File,
    metadata: VideoMetadata
  ): Promise<YouTubeUploadResponse> {
    try {
      const response = await fetch('/api/youtube/upload/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          metadata,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to initiate upload session';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON パースエラーの場合、レスポンステキストを取得
          try {
            errorMessage = await response.text();
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }

        console.error('Initiate upload session failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage
        });

        throw this.createUploadError('server_error', errorMessage);
      }

      const result = await response.json();
      console.log('Upload session initiated successfully:', {
        sessionId: result.sessionId,
        uploadUrl: result.uploadUrl ? 'Present' : 'Missing'
      });

      return result;

    } catch (error) {
      console.error('Failed to initiate upload session:', error);
      if (error instanceof Error && error.message.includes('fetch')) {
        throw this.createUploadError('network_error', 'Network connection failed');
      }
      throw error;
    }
  }

  /**
   * YouTube直接アップロード実行
   */
  private async uploadToYouTube(
    file: File,
    session: YouTubeUploadResponse
  ): Promise<{ videoId: string }> {
    this.abortController = new AbortController();
    const uploadUrl = session.uploadUrl;
    let uploadedBytes = 0;
    let lastProgressUpdate = Date.now();
    let lastServerUpdate = 0; // サーバーへの最後の更新時刻
    let lastChunkUpload = 0; // 最後のチャンクアップロード時刻
    let currentChunkSize = YouTubeDirectUploader.CHUNK_SIZE; // 適応的チャンクサイズ
    let consecutiveFailures = 0; // 連続失敗回数
    const speedHistory: number[] = [];

    // チャンクごとにアップロード
    while (uploadedBytes < file.size) {
      if (this.abortController.signal.aborted) {
        throw this.createUploadError('network_error', 'Upload aborted by user');
      }

      // 1秒間隔制御（最初のチャンクは除く）
      const currentTime = Date.now();
      if (lastChunkUpload > 0 && currentTime - lastChunkUpload < YouTubeDirectUploader.CHUNK_UPLOAD_INTERVAL) {
        const waitTime = YouTubeDirectUploader.CHUNK_UPLOAD_INTERVAL - (currentTime - lastChunkUpload);
        console.log(`Waiting ${waitTime}ms before next chunk upload...`);
        await this.delay(waitTime);
      }

      const start = uploadedBytes;
      const end = Math.min(start + currentChunkSize, file.size);
      const chunk = file.slice(start, end);

      console.log(`Uploading chunk: ${start}-${end} (size: ${(currentChunkSize / 1024 / 1024).toFixed(1)}MB)`);

      try {
        const response = await this.uploadChunk(uploadUrl, chunk, start, end, file.size, session.sessionId);
        lastChunkUpload = Date.now(); // チャンクアップロード時刻を記録
        consecutiveFailures = 0; // 成功時はカウンターリセット

        if (response.status === 308) {
          // 継続アップロード
          const range = response.headers.get('Range');
          uploadedBytes = this.parseUploadedBytes(range);

          // 速度計算
          const now = Date.now();
          const timeDiff = (now - lastProgressUpdate) / 1000;
          if (timeDiff > 0) {
            const bytesDiff = uploadedBytes - (uploadedBytes - (end - start));
            const speed = bytesDiff / timeDiff;
            speedHistory.push(speed);
            if (speedHistory.length > 10) speedHistory.shift();
          }

          // 10秒間隔でサーバーに進行状況を報告
          if (now - lastServerUpdate >= YouTubeDirectUploader.PROGRESS_UPDATE_INTERVAL) {
            await this.updateProgress(session.sessionId, uploadedBytes);
            lastServerUpdate = now;
          }

          // コールバック呼び出し（UIの更新は頻繁に行う）
          this.notifyProgress({
            percentage: (uploadedBytes / file.size) * 100,
            uploadedBytes,
            totalBytes: file.size,
            speed: this.calculateAverageSpeed(speedHistory),
            eta: this.calculateETA(uploadedBytes, file.size, speedHistory),
            isStalled: speedHistory.length > 5 && speedHistory.every(s => s < 1000),
            lastUpdate: new Date()
          });

          lastProgressUpdate = now;

        } else if (response.status === 200 || response.status === 201) {
          // アップロード完了
          try {
            const result = await response.json();
            console.log('Upload completed successfully:', { videoId: result?.id });

            // クォータ使用量を記録
            YouTubeQuotaTracker.recordUpload();

            if (result?.id) {
              return { videoId: result.id };
            } else {
              throw this.createUploadError('server_error', 'Upload completed but no video ID received');
            }
          } catch (jsonError) {
            console.error('Failed to parse completion response:', jsonError);
            console.error('Response status:', response.status);
            console.error('Response headers:', Object.fromEntries([...response.headers]));

            // プロキシ経由の場合、レスポンスは既に処理されている可能性が高い
            // アップロードが完了したと仮定して、別の方法でvideo IDを取得を試行
            console.log('Attempting to retrieve video ID from upload session...');

            // アップロード成功の可能性が高いので、クォータを記録
            YouTubeQuotaTracker.recordUpload();

            // レスポンスヘッダーから情報を取得を試行
            const locationHeader = response.headers.get('location');
            if (locationHeader) {
              const videoIdMatch = locationHeader.match(/[?&]v=([^&]+)/);
              if (videoIdMatch) {
                console.log('Video ID extracted from Location header:', videoIdMatch[1]);
                return { videoId: videoIdMatch[1] };
              }
            }

            // エタグヘッダーやその他のヘッダーから情報取得を試行
            const etagHeader = response.headers.get('etag');
            if (etagHeader) {
              console.log('ETag found, upload likely successful:', etagHeader);
            }

            // エラーを投げる代わりに、成功として扱うが詳細情報を付与
            console.warn('Upload likely completed but video ID extraction failed');
            throw this.createUploadError('server_error', 'アップロードは完了しましたが、動画IDの取得に失敗しました。YouTubeの管理画面で確認してください。');
          }

        } else {
          throw this.createUploadError('server_error', `Upload failed with status ${response.status}`);
        }
      } catch (error) {
        console.error('Chunk upload failed:', error);
        consecutiveFailures++;

        // 2回連続失敗した場合、チャンクサイズを半分にする
        if (consecutiveFailures >= 2 && currentChunkSize > YouTubeDirectUploader.MIN_CHUNK_SIZE) {
          currentChunkSize = Math.max(currentChunkSize / 2, YouTubeDirectUploader.MIN_CHUNK_SIZE);
          console.log(`Reducing chunk size to ${(currentChunkSize / 1024 / 1024).toFixed(1)}MB due to failures`);
          consecutiveFailures = 0; // リセット
          continue; // 同じ位置から再試行
        }

        // リトライ可能なエラーの場合はリトライ
        if (this.isRetryableError(error as Error) && uploadedBytes > 0) {
          await this.delay(YouTubeDirectUploader.RETRY_DELAY);
          continue; // リトライ
        }

        throw error;
      }
    }

    throw this.createUploadError('unknown_error', 'Upload completed but no video ID received');
  }

  /**
   * 個別チャンクのアップロード（プロキシ経由）
   */
  private async uploadChunk(
    uploadUrl: string,
    chunk: Blob,
    start: number,
    end: number,
    totalSize: number,
    sessionId?: string
  ): Promise<Response> {
    let retries = 0;

    while (retries < YouTubeDirectUploader.MAX_RETRIES) {
      try {
        // CORSエラーを回避するため、サーバープロキシ経由でアップロード
        // URLが長い場合はヘッダーで送信
        const proxyUrl = `/api/youtube/upload/proxy?sessionId=${sessionId || 'unknown'}`;

        const response = await fetch(proxyUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${start}-${end-1}/${totalSize}`,
            'Content-Type': 'application/octet-stream',
            'X-Upload-Url': uploadUrl, // 長いURLはヘッダーで送信
            'X-Session-Id': sessionId || 'unknown',
          },
          body: chunk,
          signal: this.abortController?.signal,
        });

        console.log(`Chunk upload response: ${response.status} ${response.statusText}`);
        return response;
      } catch (error) {
        retries++;

        // CORSエラーやネットワークエラーの特別な処理
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          console.log(`Network/CORS error detected on retry ${retries}/${YouTubeDirectUploader.MAX_RETRIES}`);

          // 最終チャンクでネットワークエラーが発生した場合、アップロードが実際に完了している可能性がある
          if (start + chunk.size >= totalSize) {
            console.log('Final chunk error - attempting to verify upload completion...');

            // アップロード状況確認のためのリトライ
            try {
              await this.delay(2000); // 2秒待機
              const statusResponse = await this.checkUploadStatus(uploadUrl, sessionId);
              if (statusResponse && statusResponse.status === 200) {
                console.log('Upload actually completed despite error');
                return statusResponse;
              }
            } catch (statusError) {
              console.log('Status check failed:', statusError);
            }
          }
        }

        if (retries >= YouTubeDirectUploader.MAX_RETRIES) {
          throw error;
        }
        await this.delay(YouTubeDirectUploader.RETRY_DELAY * retries);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * アップロード状況を確認（プロキシ経由）
   */
  private async checkUploadStatus(uploadUrl: string, sessionId?: string): Promise<Response | null> {
    try {
      const proxyUrl = `/api/youtube/upload/proxy?sessionId=${sessionId || 'unknown'}`;

      const response = await fetch(proxyUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': 'bytes */*',  // 状況確認用のヘッダー
          'X-Upload-Url': uploadUrl, // ヘッダーでURL送信
          'X-Session-Id': sessionId || 'unknown',
        },
        signal: this.abortController?.signal,
      });
      return response;
    } catch (error) {
      console.log('Upload status check failed:', error);
      return null;
    }
  }  /**
   * アップロード完了をサーバーに通知
   */
  private async finalizeUpload(sessionId: string, youtubeVideoId: string): Promise<void> {
    const response = await fetch('/api/youtube/upload/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        youtubeVideoId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw this.createUploadError('server_error', errorData.error);
    }
  }

  /**
   * 進行状況をサーバーに報告
   */
  private async updateProgress(sessionId: string, uploadedBytes: number): Promise<void> {
    try {
      await fetch('/api/youtube/upload/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          uploadedBytes,
        }),
      });
    } catch (error) {
      // 進行状況更新のエラーは警告レベル（アップロード継続）
      console.warn('Progress update failed:', error);
    }
  }

  /**
   * Range ヘッダーからアップロード済みバイト数を解析
   */
  private parseUploadedBytes(range: string | null): number {
    if (!range) return 0;
    const match = range.match(/bytes=0-(\d+)/);
    return match ? parseInt(match[1]) + 1 : 0;
  }

  /**
   * 平均速度計算
   */
  private calculateAverageSpeed(speedHistory: number[]): number {
    if (speedHistory.length === 0) return 0;
    return speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
  }

  /**
   * 推定残り時間計算
   */
  private calculateETA(uploadedBytes: number, totalBytes: number, speedHistory: number[]): number {
    const avgSpeed = this.calculateAverageSpeed(speedHistory);
    if (avgSpeed === 0) return Infinity;
    return (totalBytes - uploadedBytes) / avgSpeed;
  }

  /**
   * 進行状況コールバック呼び出し
   */
  private notifyProgress(progress: UploadProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * エラーがリトライ可能かチェック
   */
  private isRetryableError(error: Error): boolean {
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('503') ||
           error.message.includes('502') ||
           error.message.includes('Failed to fetch') ||
           error.message.includes('CORS');
  }

  /**
   * アップロードエラーを作成
   */
  private createUploadError(type: UploadErrorType, message: string): UploadError {
    const error = new Error(message) as UploadError;
    error.type = type;
    error.retryable = this.isRetryableError(error);

    // CORSエラーの場合はより親切なメッセージに変更
    if (message.includes('Failed to fetch') || message.includes('CORS')) {
      error.message = 'ネットワーク接続またはブラウザ設定の問題でアップロードに失敗しました。しばらく時間をおいて再試行してください。';
      error.type = 'network_error';
    }

    return error;
  }

  /**
   * エラーハンドリング
   */
  private handleUploadError(error: Error): void {
    console.error('Upload error:', error);
    // 必要に応じて分析ツールに送信
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
