/**
 * Media Domain Schemas
 *
 * 動画・映画・YouTube関連のスキーマ定義
 */

import { z } from 'zod';
import {
  UrlSchema,
  TimestampSchema,
  PaginationRequestSchema,
  createApiResponseSchema,
  createListResponseSchema
} from '../../common';

// ===== Base Media Entities =====

export const MovieSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  url: UrlSchema,
}).merge(TimestampSchema);

export const VideoMetadataSchema = z.object({
  duration: z.number().positive('再生時間は正の数である必要があります').optional(),
  thumbnail_url: z.string().url('有効なサムネイルURLを入力してください').optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  file_size: z.number().int().positive().optional(),
  format: z.enum(['mp4', 'webm', 'avi', 'mov', 'mkv']).optional(),
});

// ===== Movies API Schemas =====

export const GetMoviesRequestSchema = z.object({
  search: z.string().max(100, '検索キーワードは100文字以内で入力してください').optional(),
  title_contains: z.string().max(100).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'title']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
}).merge(PaginationRequestSchema);

export const CreateMovieRequestSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内で入力してください'),
  url: UrlSchema,
  description: z.string().max(1000, '説明は1000文字以内で入力してください').optional(),
}).merge(VideoMetadataSchema.partial());

export const UpdateMovieRequestSchema = CreateMovieRequestSchema.partial();

// ===== YouTube Upload Schemas =====

export const YouTubeUploadInitiateRequestSchema = z.object({
  fileName: z.string().min(1, 'ファイル名は必須です'),
  fileSize: z.number().int().positive('ファイルサイズは正の数である必要があります'),
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().max(5000, '説明は5000文字以内で入力してください').optional(),
  privacy: z.enum(['public', 'unlisted', 'private']).default('unlisted'),
  category_id: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10, 'タグは10個まで設定できます').optional(),
});

export const YouTubeUploadInitiateResponseSchema = z.object({
  sessionId: z.string(),
  uploadUrl: z.string().url(),
  expires_at: z.string().datetime(),
});

export const YouTubeUploadProgressSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100),
  uploaded_bytes: z.number().int().min(0).optional(),
  total_bytes: z.number().int().positive().optional(),
  video_id: z.string().optional(),
  video_url: z.string().url().optional(),
  error_message: z.string().optional(),
  error_code: z.string().optional(),
});

export const YouTubeUploadStatusRequestSchema = z.object({
  sessionId: z.string().min(1, 'セッションIDは必須です'),
});

// ===== YouTube Video Management =====

export const YouTubeVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  thumbnail_url: z.string().url(),
  duration: z.string(), // YouTube API format: PT4M13S
  view_count: z.number().int().min(0).optional(),
  like_count: z.number().int().min(0).optional(),
  privacy_status: z.enum(['public', 'unlisted', 'private']),
  upload_status: z.enum(['uploaded', 'processed', 'failed']),
  published_at: z.string().datetime(),
});

export const GetYouTubeVideosRequestSchema = z.object({
  channel_id: z.string().optional(),
  status: z.enum(['uploaded', 'processed', 'failed']).optional(),
  privacy: z.enum(['public', 'unlisted', 'private']).optional(),
  uploaded_after: z.string().datetime().optional(),
  uploaded_before: z.string().datetime().optional(),
}).merge(PaginationRequestSchema);

// ===== File Upload Schemas =====

export const FileUploadMetadataSchema = z.object({
  filename: z.string().min(1, 'ファイル名は必須です'),
  content_type: z.string().min(1, 'コンテンツタイプは必須です'),
  file_size: z.number().int().positive('ファイルサイズは正の数である必要があります'),
  checksum: z.string().optional(),
});

export const FileUploadRequestSchema = z.object({
  file: FileUploadMetadataSchema,
  destination: z.enum(['movies', 'thumbnails', 'avatars']),
  public: z.boolean().default(false),
});

export const FileUploadResponseSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  public_url: z.string().url().optional(),
  expires_at: z.string().datetime().optional(),
});

// ===== API Response Schemas =====

export const MoviesListResponseSchema = createListResponseSchema(MovieSchema);
export const MovieResponseSchema = createApiResponseSchema(MovieSchema);

export const YouTubeUploadInitiateResponseSchemaWrapped = createApiResponseSchema(YouTubeUploadInitiateResponseSchema);
export const YouTubeUploadProgressResponseSchema = createApiResponseSchema(YouTubeUploadProgressSchema);
export const YouTubeVideosListResponseSchema = createListResponseSchema(YouTubeVideoSchema);

export const FileUploadResponseSchemaWrapped = createApiResponseSchema(FileUploadResponseSchema);

// ===== Type Exports =====

export type Movie = z.infer<typeof MovieSchema>;
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

export type GetMoviesRequest = z.infer<typeof GetMoviesRequestSchema>;
export type CreateMovieRequest = z.infer<typeof CreateMovieRequestSchema>;
export type UpdateMovieRequest = z.infer<typeof UpdateMovieRequestSchema>;

export type YouTubeUploadInitiateRequest = z.infer<typeof YouTubeUploadInitiateRequestSchema>;
export type YouTubeUploadInitiateResponse = z.infer<typeof YouTubeUploadInitiateResponseSchema>;
export type YouTubeUploadProgress = z.infer<typeof YouTubeUploadProgressSchema>;
export type YouTubeUploadStatusRequest = z.infer<typeof YouTubeUploadStatusRequestSchema>;

export type YouTubeVideo = z.infer<typeof YouTubeVideoSchema>;
export type GetYouTubeVideosRequest = z.infer<typeof GetYouTubeVideosRequestSchema>;

export type FileUploadMetadata = z.infer<typeof FileUploadMetadataSchema>;
export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

export type MoviesListResponse = z.infer<typeof MoviesListResponseSchema>;
export type MovieResponse = z.infer<typeof MovieResponseSchema>;
export type YouTubeUploadInitiateResponseWrapped = z.infer<typeof YouTubeUploadInitiateResponseSchemaWrapped>;
export type YouTubeUploadProgressResponse = z.infer<typeof YouTubeUploadProgressResponseSchema>;
export type YouTubeVideosListResponse = z.infer<typeof YouTubeVideosListResponseSchema>;
export type FileUploadResponseWrapped = z.infer<typeof FileUploadResponseSchemaWrapped>;
