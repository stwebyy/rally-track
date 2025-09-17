import {
  VideoMetadata,
  UploadProgress,
  YouTubeUploadResponse,
  LocalUploadState,
  UploadError,
  UploadErrorType
} from '@/types/youtube-upload';
import { YouTubeQuotaTracker } from './youtubeQuotaTracker';
import { FileMismatchError } from '@/types/upload-errors';

export class YouTubeDirectUploader {
  private static readonly CHUNK_SIZE = 2 * 1024 * 1024; // 2MB（高速化のため）
  private static readonly MIN_CHUNK_SIZE = 256 * 1024; // 256KB（最小サイズ）
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒
  private static readonly PROGRESS_UPDATE_INTERVAL = 10000; // 10秒（プログレス更新間隔）
  private static readonly CHUNK_UPLOAD_INTERVAL = 1000; // 1秒（チャンクアップロード間隔）

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
   * 既存のアップロードセッションを再開
   */
  async resumeUpload(sessionId: string, file?: File): Promise<string> {
    try {
      // 1. サーバーからセッション情報を取得
      const resumeResponse = await fetch(`/api/youtube/upload/resume/${sessionId}`, {
        method: 'POST',
      });

      if (!resumeResponse.ok) {
        const errorData = await resumeResponse.json();
        throw new Error(errorData.error || 'Failed to resume upload session');
      }

      const sessionData = await resumeResponse.json();

      // 2. ローカルストレージからファイル情報を取得
      const localState = this.getLocalUploadState(sessionId);

      // 3. ファイルが提供されていない場合はエラー
      if (!file) {
        throw new Error('File is required to resume upload. Please select the file again.');
      }

      // 4. ファイル整合性チェック
      if (localState && (file.name !== localState.fileName || file.size !== localState.totalBytes)) {
        const originalName = localState.fileName;
        const originalSize = Math.round(localState.totalBytes / 1024 / 1024 * 100) / 100; // MB
        const selectedSize = Math.round(file.size / 1024 / 1024 * 100) / 100; // MB

        throw new FileMismatchError(
          originalName,
          originalSize,
          file.name,
          selectedSize,
          sessionId
        );
      }

      // 5. アップロード再開
      console.log('Resuming upload from:', sessionData.uploadedBytes, 'bytes');

      return await this.continueUpload(file, {
        sessionId: sessionData.sessionId,
        uploadUrl: sessionData.uploadUrl,
        uploadedBytes: sessionData.uploadedBytes
      });

    } catch (error) {
      this.handleUploadError(error as Error);
      throw error;
    }
  }

  /**
   * アップロード継続処理
   */
  private async continueUpload(
    file: File,
    resumeData: { sessionId: string; uploadUrl: string; uploadedBytes: number }
  ): Promise<string> {
    this.abortController = new AbortController();
    const { sessionId, uploadUrl, uploadedBytes: initialUploadedBytes } = resumeData;

    let uploadedBytes = initialUploadedBytes;
    let lastProgressUpdate = Date.now();
    let lastServerUpdate = 0;
    let lastChunkUpload = 0; // 最後のチャンクアップロード時刻
    let currentChunkSize = YouTubeDirectUploader.CHUNK_SIZE; // 適応的チャンクサイズ
    let consecutiveFailures = 0; // 連続失敗回数
    const speedHistory: number[] = [];

    console.log(`Continuing upload from ${uploadedBytes} bytes of ${file.size} total`);

    // チャンクごとにアップロード継続
    while (uploadedBytes < file.size) {
      if (this.abortController.signal.aborted) {
        throw this.createUploadError('network_error', 'Upload aborted by user');
      }

      // 1秒間隔制御（最初のチャンクは除く）
      const now = Date.now();
      if (lastChunkUpload > 0 && now - lastChunkUpload < YouTubeDirectUploader.CHUNK_UPLOAD_INTERVAL) {
        const waitTime = YouTubeDirectUploader.CHUNK_UPLOAD_INTERVAL - (now - lastChunkUpload);
        console.log(`Waiting ${waitTime}ms before next chunk upload...`);
        await this.delay(waitTime);
      }

      const start = uploadedBytes;
      const end = Math.min(start + currentChunkSize, file.size);
      const chunk = file.slice(start, end);

      console.log(`Uploading chunk: ${start}-${end} (size: ${(currentChunkSize / 1024 / 1024).toFixed(1)}MB)`);

      try {
        const response = await this.uploadChunk(uploadUrl, chunk, start, end, file.size);
        lastChunkUpload = Date.now(); // チャンクアップロード時刻を記録
        consecutiveFailures = 0; // 成功時はカウンターリセット

        if (response.status === 308) {
          // 継続アップロード
          const range = response.headers.get('Range');
          uploadedBytes = this.parseUploadedBytes(range);

          // 速度計算とプログレス更新
          const now = Date.now();
          const timeDiff = (now - lastProgressUpdate) / 1000;
          if (timeDiff > 0) {
            const bytesDiff = end - start;
            const speed = bytesDiff / timeDiff;
            speedHistory.push(speed);
            if (speedHistory.length > 10) speedHistory.shift();
          }

          // 10秒間隔でサーバーに進行状況を報告
          if (now - lastServerUpdate >= YouTubeDirectUploader.PROGRESS_UPDATE_INTERVAL) {
            await this.updateProgress(sessionId, uploadedBytes);
            lastServerUpdate = now;
          }

          // プログレス通知
          this.notifyProgress({
            percentage: (uploadedBytes / file.size) * 100,
            uploadedBytes,
            totalBytes: file.size,
            speed: this.calculateAverageSpeed(speedHistory),
            eta: this.calculateETA(uploadedBytes, file.size, speedHistory),
            isStalled: false,
            lastUpdate: new Date()
          });

          // ローカル状態更新
          this.saveLocalUploadState({
            sessionId: sessionId,
            fileName: file.name,
            uploadedBytes,
            totalBytes: file.size,
            lastUpdate: now,
            uploadUrl: uploadUrl
          });

          lastProgressUpdate = now;

        } else if (response.status === 200 || response.status === 201) {
          // アップロード完了
          console.log('Upload completed successfully');

          try {
            const result = await response.json();

            // クォータ使用量を記録
            YouTubeQuotaTracker.recordUpload();

            // ローカルストレージをクリア
            this.clearLocalUploadState(sessionId);

            return result.id;
          } catch (jsonError) {
            console.error('Failed to parse completion response, but upload likely succeeded:', jsonError);

            // JSON解析に失敗してもアップロードは成功している可能性が高い
            // クォータ使用量を記録
            YouTubeQuotaTracker.recordUpload();

            // ローカルストレージをクリア
            this.clearLocalUploadState(sessionId);

            // 代替として、アップロード完了の推測値を返す
            console.log('Returning fallback success indicator due to JSON parse error');
            return 'upload_completed_cors_error';
          }
        } else {
          throw new Error(`Unexpected response status: ${response.status}`);
        }

      } catch (error) {
        console.error('Chunk upload failed:', error);
        consecutiveFailures++;

        // CORSエラーの特別な処理 - 最終チャンクでCORSエラーが発生した場合
        if (error instanceof Error && error.message.includes('Failed to fetch') &&
            uploadedBytes + currentChunkSize >= file.size) {
          console.log('Final chunk CORS error detected - upload might have completed');

          // 少し待ってアップロード状況を確認
          try {
            await this.delay(3000);
            const statusCheck = await this.checkUploadStatus(uploadUrl);
            if (statusCheck && (statusCheck.status === 200 || statusCheck.status === 201)) {
              console.log('Upload confirmed completed despite CORS error');

              // アップロード成功処理
              YouTubeQuotaTracker.recordUpload();
              this.clearLocalUploadState(sessionId);
              return 'upload_completed_cors_recovery';
            }
          } catch (statusError) {
            console.log('Status check after CORS error failed:', statusError);
          }
        }

        // 2回連続失敗した場合、チャンクサイズを半分にする
        if (consecutiveFailures >= 2 && currentChunkSize > YouTubeDirectUploader.MIN_CHUNK_SIZE) {
          currentChunkSize = Math.max(currentChunkSize / 2, YouTubeDirectUploader.MIN_CHUNK_SIZE);
          console.log(`Reducing chunk size to ${(currentChunkSize / 1024 / 1024).toFixed(1)}MB due to failures`);
          consecutiveFailures = 0; // リセット
          continue; // 同じ位置から再試行
        }

        throw this.createUploadError('network_error', `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error('Upload loop ended unexpectedly');
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

    // ローカルストレージに状態保存
    this.saveLocalUploadState({
      sessionId: session.sessionId,
      fileName: file.name,
      uploadedBytes: 0,
      totalBytes: file.size,
      lastUpdate: Date.now(),
      uploadUrl: uploadUrl
    });

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
        const response = await this.uploadChunk(uploadUrl, chunk, start, end, file.size);
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

          // ローカル状態更新
          this.saveLocalUploadState({
            sessionId: session.sessionId,
            fileName: file.name,
            uploadedBytes,
            totalBytes: file.size,
            lastUpdate: now,
            uploadUrl: uploadUrl
          });

          lastProgressUpdate = now;

        } else if (response.status === 200 || response.status === 201) {
          // アップロード完了
          const result = await response.json();

          // クォータ使用量を記録
          YouTubeQuotaTracker.recordUpload();

          // ローカル状態クリア
          this.clearLocalUploadState(session.sessionId);

          return { videoId: result.id };

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

        // エラー時は状態を保存して再開可能にする
        this.saveLocalUploadState({
          sessionId: session.sessionId,
          fileName: file.name,
          uploadedBytes,
          totalBytes: file.size,
          lastUpdate: Date.now(),
          uploadUrl: uploadUrl
        });

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
   * 個別チャンクのアップロード
   */
  private async uploadChunk(
    uploadUrl: string,
    chunk: Blob,
    start: number,
    end: number,
    totalSize: number
  ): Promise<Response> {
    let retries = 0;

    while (retries < YouTubeDirectUploader.MAX_RETRIES) {
      try {
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${start}-${end-1}/${totalSize}`,
            'Content-Length': chunk.size.toString(),
            // CORS対策のヘッダー追加
            'Access-Control-Request-Method': 'PUT',
            'Access-Control-Request-Headers': 'Content-Range, Content-Length',
          },
          body: chunk,
          signal: this.abortController?.signal,
          // CORS対策のオプション
          mode: 'cors',
          credentials: 'omit'
        });

        return response;
      } catch (error) {
        retries++;

        // CORSエラーの特別な処理
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          console.log(`Potential CORS error detected on retry ${retries}/${YouTubeDirectUploader.MAX_RETRIES}`);

          // 最終チャンクでCORSエラーが発生した場合、アップロードが実際に完了している可能性がある
          if (start + chunk.size >= totalSize) {
            console.log('Final chunk CORS error - attempting to verify upload completion...');

            // アップロード状況確認のためのリトライ
            try {
              await this.delay(2000); // 2秒待機
              const statusResponse = await this.checkUploadStatus(uploadUrl);
              if (statusResponse && statusResponse.status === 200) {
                console.log('Upload actually completed despite CORS error');
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
   * アップロード状況を確認
   */
  private async checkUploadStatus(uploadUrl: string): Promise<Response | null> {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': 'bytes */*',  // 状況確認用のヘッダー
        },
        signal: this.abortController?.signal,
        mode: 'cors',
        credentials: 'omit'
      });
      return response;
    } catch (error) {
      console.log('Upload status check failed:', error);
      return null;
    }
  }

  /**
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
   * ローカルストレージに状態保存
   */
  private saveLocalUploadState(state: LocalUploadState): void {
    try {
      localStorage.setItem(`upload_state_${state.sessionId}`, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save upload state to localStorage:', error);
    }
  }

  /**
   * ローカルストレージから状態取得
   */
  private getLocalUploadState(sessionId: string): LocalUploadState | null {
    try {
      const saved = localStorage.getItem(`upload_state_${sessionId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to get upload state from localStorage:', error);
      return null;
    }
  }

  /**
   * ローカルストレージから状態削除
   */
  private clearLocalUploadState(sessionId: string): void {
    try {
      localStorage.removeItem(`upload_state_${sessionId}`);
    } catch (error) {
      console.warn('Failed to clear upload state from localStorage:', error);
    }
  }

  /**
   * エラーがリトライ可能かチェック
   */
  private isRetryableError(error: Error): boolean {
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('503') ||
           error.message.includes('502');
  }

  /**
   * アップロードエラーを作成
   */
  private createUploadError(type: UploadErrorType, message: string): UploadError {
    const error = new Error(message) as UploadError;
    error.type = type;
    error.retryable = this.isRetryableError(error);
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
