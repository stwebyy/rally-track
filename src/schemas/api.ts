/**
 * API Schema Definitions with Zod
 *
 * このファイルはAPIエンドポイントのリクエスト・レスポンススキーマを定義します。
 * Zodスキーマから型定義を自動生成し、ランタイムバリデーションも提供します。
 */

import { z } from 'zod';

// ===== Common Schemas =====

// 共通のパラメータ
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// エラーレスポンス
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});

// 成功レスポンス
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// ===== Games API Schemas =====

// Games APIのリクエストパラメータ
export const GetGamesRequestSchema = z.object({
  type: z.enum(['external', 'internal']),
  matchId: z.string(),
});

// Game Data Schema（既存の型構造に基づく - IDはstring）
export const GamePlayerSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
});

// 外部試合データ（実際のDBスキーマに合わせる）
export const ExternalGameDataSchema = z.object({
  id: z.string(),
  player_name: z.string().nullable(),
  opponent_player_name: z.string().nullable(),
  team_sets: z.number().nullable(),
  opponent_sets: z.number().nullable(),
  match_result_id: z.string(),
  youtube_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// 内部試合データ（実際のDBスキーマに合わせる）
export const InternalGameDataSchema = z.object({
  id: z.string(),
  player: GamePlayerSchema,
  opponent: GamePlayerSchema,
  player_game_set: z.number().nullable(),
  opponent_game_set: z.number().nullable(),
  harataku_match_result_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  player_id: z.string(),
  opponent_id: z.string(),
});

export const GameDataSchema = z.union([
  ExternalGameDataSchema,
  InternalGameDataSchema,
]);

export const GetGamesResponseSchema = z.object({
  games: z.array(GameDataSchema),
  total: z.number(),
  type: z.enum(['external', 'internal']),
});

// ===== Members API Schemas =====

export const CreateMemberRequestSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください").optional(),
});

export const CreateMemberResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});

// ===== Movies API Schemas =====

export const GetMoviesRequestSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  search: z.string().optional(),
});

export const MovieDataSchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const GetMoviesResponseSchema = z.object({
  movies: z.array(MovieDataSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

// ===== YouTube Upload API Schemas =====

export const UploadInitiateRequestSchema = z.object({
  fileName: z.string(),
  fileSize: z.number().int().positive(),
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
});

export const UploadInitiateResponseSchema = z.object({
  sessionId: z.string(),
  uploadUrl: z.string(),
});

export const UploadProgressResponseSchema = z.object({
  sessionId: z.string(),
  status: z.enum(['pending', 'uploading', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  videoId: z.string().optional(),
  error: z.string().optional(),
});

// ===== API Endpoints Definition =====

export const apiEndpoints = {
  'GET /api/games': {
    query: GetGamesRequestSchema,
    response: GetGamesResponseSchema,
    errorResponse: ErrorResponseSchema,
  },
  'GET /api/movies': {
    query: GetMoviesRequestSchema,
    response: GetMoviesResponseSchema,
    errorResponse: ErrorResponseSchema,
  },
  'POST /api/members/create': {
    body: CreateMemberRequestSchema,
    response: CreateMemberResponseSchema,
    errorResponse: ErrorResponseSchema,
  },
  'POST /api/youtube/upload/initiate': {
    body: UploadInitiateRequestSchema,
    response: UploadInitiateResponseSchema,
    errorResponse: ErrorResponseSchema,
  },
  'GET /api/youtube/upload/progress': {
    query: z.object({ sessionId: z.string() }),
    response: UploadProgressResponseSchema,
    errorResponse: ErrorResponseSchema,
  },
} as const;

// ===== Type Inference =====

export type ApiEndpoints = typeof apiEndpoints;

// 型推論ヘルパー
export type ApiRequest<T extends keyof ApiEndpoints> =
  'body' extends keyof ApiEndpoints[T]
    ? z.infer<ApiEndpoints[T]['body']>
    : 'query' extends keyof ApiEndpoints[T]
      ? z.infer<ApiEndpoints[T]['query']>
      : never;

export type ApiResponse<T extends keyof ApiEndpoints> = z.infer<ApiEndpoints[T]['response']>;
export type ApiError<T extends keyof ApiEndpoints> = z.infer<ApiEndpoints[T]['errorResponse']>;

// 個別の型エクスポート
export type GetGamesRequest = z.infer<typeof GetGamesRequestSchema>;
export type GetGamesResponse = z.infer<typeof GetGamesResponseSchema>;
export type ExternalGameData = z.infer<typeof ExternalGameDataSchema>;
export type InternalGameData = z.infer<typeof InternalGameDataSchema>;
export type GameData = z.infer<typeof GameDataSchema>;
export type CreateMemberRequest = z.infer<typeof CreateMemberRequestSchema>;
export type CreateMemberResponse = z.infer<typeof CreateMemberResponseSchema>;
export type GetMoviesRequest = z.infer<typeof GetMoviesRequestSchema>;
export type GetMoviesResponse = z.infer<typeof GetMoviesResponseSchema>;
export type MovieData = z.infer<typeof MovieDataSchema>;
export type UploadInitiateRequest = z.infer<typeof UploadInitiateRequestSchema>;
export type UploadInitiateResponse = z.infer<typeof UploadInitiateResponseSchema>;
export type UploadProgressResponse = z.infer<typeof UploadProgressResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
