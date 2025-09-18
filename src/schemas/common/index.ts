/**
 * Common Schemas
 *
 * アプリケーション全体で共有される基本的なスキーマ定義
 */

import { z } from 'zod';

// ===== Pagination =====
export const PaginationRequestSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional(),
});

export const PaginationResponseSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});

// ===== Response Wrappers =====
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
  timestamp: z.string().datetime().optional(),
});

// ===== Validation Helpers =====
export const IdSchema = z.string().uuid('有効なIDを入力してください');
export const EmailSchema = z.string().email('有効なメールアドレスを入力してください');
export const DateTimeSchema = z.string().datetime('有効な日時を入力してください');
export const UrlSchema = z.string().url('有効なURLを入力してください');

// ===== Common Field Schemas =====
export const TimestampSchema = z.object({
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

export const SoftDeleteSchema = z.object({
  deleted_at: DateTimeSchema.nullable(),
});

// ===== Generic List Response =====
export function createListResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: PaginationResponseSchema,
  });
}

// ===== Generic API Response =====
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime().optional(),
  });
}

// ===== Type Exports =====
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type SoftDelete = z.infer<typeof SoftDeleteSchema>;
