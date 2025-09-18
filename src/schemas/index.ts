/**
 * Schemas Main Index
 *
 * 全体のスキーマエクスポートポイント
 * プロジェクト全体からのスキーマインポートはここから行う
 */

// Common schemas (base utilities)
export * from './common';

// Domain-specific schemas
export * from './domains';

// Legacy compatibility (optional - for gradual migration)
export {
  // Most commonly used schemas for easy access
  type GetGamesRequest,
  type GetGamesResponse,
  type LoginRequest,
  type CreateMemberRequest,
  type GetMoviesRequest,

  // Most commonly used schema validators
  GetGamesRequestSchema,
  LoginRequestSchema,
  CreateMemberRequestSchema,
  GetMoviesRequestSchema,
} from './domains';

// Common utilities re-export
export {
  type PaginationRequest,
  type PaginationResponse,
  type ErrorResponse,
  type SuccessResponse,
  PaginationRequestSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
  createApiResponseSchema,
  createListResponseSchema,
} from './common';

// API endpoint definitions (if using centralized endpoint registry)
export const apiEndpointsRegistry = {
  'GET /api/games': {
    query: 'GetGamesRequestSchema',
    response: 'GetGamesResponseSchema',
  },
  'POST /api/auth/login': {
    body: 'LoginRequestSchema',
    response: 'LoginResponseSchema',
  },
  'POST /api/members/create': {
    body: 'CreateMemberRequestSchema',
    response: 'MemberResponseSchema',
  },
  'GET /api/movies': {
    query: 'GetMoviesRequestSchema',
    response: 'MoviesListResponseSchema',
  },
} as const;
