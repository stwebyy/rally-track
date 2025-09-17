// YouTube直接アップロード関連の型定義

export interface UploadSession {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  youtube_session_id: string | null;
  youtube_upload_url: string | null;
  uploaded_bytes: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'expired';
  youtube_video_id: string | null;
  metadata: VideoMetadata;
  error_message: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacy?: 'private' | 'public' | 'unlisted';
  matchType?: string;
  gameResultId?: string;
}

export interface UploadProgress {
  percentage: number;           // 0-100
  uploadedBytes: number;       // アップロード済みバイト数
  totalBytes: number;          // 総バイト数
  speed: number;               // アップロード速度 (bytes/sec)
  eta: number;                 // 推定残り時間 (seconds)
  isStalled: boolean;          // 停滞中かどうか
  lastUpdate: Date;            // 最終更新時刻
}

export interface YouTubeUploadResponse {
  sessionId: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface UploadProgressResponse {
  success: boolean;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  status: string;
}

export interface UploadCompleteResponse {
  success: boolean;
  sessionId: string;
  youtubeVideoId: string;
  status: string;
  message: string;
}

export interface SessionStatusResponse {
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  status: string;
  youtubeVideoId: string | null;
  youtubeUploadUrl: string | null;
  metadata: VideoMetadata;
  errorMessage: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
}

export interface PendingSessionsResponse {
  sessions: Array<SessionStatusResponse & {
    canResume: boolean;
  }>;
  stats: {
    total: number;
    pending: number;
    uploading: number;
    processing: number;
    expired: number;
    resumable: number;
  };
  timestamp: string;
}

export interface SessionResumeResponse {
  success: boolean;
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  uploadUrl: string;
  metadata: VideoMetadata;
  expiresAt: string;
  status: string;
  message: string;
}

export interface YouTubeUploadError {
  error: string;
  message?: string;
  canCreateNew?: boolean;
  canRetry?: boolean;
  errorMessage?: string;
}

// YouTube API関連
export interface YouTubeVideoResource {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
  };
  status?: {
    privacyStatus?: 'private' | 'public' | 'unlisted';
    uploadStatus?: string;
  };
}

// ローカルストレージ用の型
export interface LocalUploadState {
  sessionId: string;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  lastUpdate: number;
  uploadUrl: string;
}

// エラーハンドリング用
export type UploadErrorType =
  | 'network_error'
  | 'session_expired'
  | 'quota_exceeded'
  | 'file_too_large'
  | 'invalid_file'
  | 'server_error'
  | 'unauthorized'
  | 'unknown_error';

export interface UploadError extends Error {
  type: UploadErrorType;
  retryable: boolean;
  sessionId?: string;
}
