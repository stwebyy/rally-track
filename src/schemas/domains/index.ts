/**
 * Domains Index
 *
 * 全ドメインのスキーマを統合するインデックス
 */

// All domain exports
export * from './games';
export * from './users';

// Convenient re-exports for commonly used schemas
// (Optional - for frequently used schemas only)
export {
  GetGamesRequestSchema,
  GetGamesResponseSchema,
  type GetGamesRequest,
  type GetGamesResponse,
} from './games';

export {
  LoginRequestSchema,
  RegisterRequestSchema,
  CreateMemberRequestSchema,
  type LoginRequest,
  type RegisterRequest,
  type CreateMemberRequest,
} from './users';
