/**
 * Games Domain Schemas
 *
 * ゲーム・試合関連のスキーマ定義
 */

import { z } from 'zod';
import {
  IdSchema,
  TimestampSchema,
  PaginationRequestSchema,
  createListResponseSchema,
  createApiResponseSchema
} from '../../common';

// ===== Base Entities =====

export const PlayerSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, '選手名は必須です'),
});

export const GameScoreSchema = z.object({
  team_sets: z.number().int().min(0).nullable(),
  opponent_sets: z.number().int().min(0).nullable(),
});

// ===== External Game Schemas =====

export const ExternalGameSchema = z.object({
  id: IdSchema,
  player_name: z.string().nullable(),
  opponent_player_name: z.string().nullable(),
  youtube_url: z.string().regex(/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)$/).nullable(),
  match_result_id: IdSchema,
  ...GameScoreSchema.shape,
  ...TimestampSchema.shape,
});

export const CreateExternalGameRequestSchema = z.object({
  match_result_id: IdSchema,
  player_name: z.string().min(1, '選手名は必須です'),
  opponent_player_name: z.string().min(1, '対戦相手名は必須です'),
  team_sets: z.number().int().min(0, 'セット数は0以上である必要があります'),
  opponent_sets: z.number().int().min(0, 'セット数は0以上である必要があります'),
  youtube_url: z.string().regex(/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)$/, '有効なYouTube URLを入力してください').optional(),
});

// ===== Internal Game Schemas =====

export const InternalGameSchema = z.object({
  id: IdSchema,
  player: PlayerSchema,
  opponent: PlayerSchema,
  player_game_set: z.number().int().min(0).nullable(),
  opponent_game_set: z.number().int().min(0).nullable(),
  harataku_match_result_id: IdSchema,
  player_id: IdSchema,
  opponent_id: IdSchema,
  ...TimestampSchema.shape,
});

export const CreateInternalGameRequestSchema = z.object({
  harataku_match_result_id: IdSchema,
  player_id: IdSchema,
  opponent_id: IdSchema,
  player_game_set: z.number().int().min(0, 'ゲームセット数は0以上である必要があります'),
  opponent_game_set: z.number().int().min(0, 'ゲームセット数は0以上である必要があります'),
});

// ===== API Request/Response Schemas =====

export const GetGamesRequestSchema = z.object({
  type: z.enum(['external', 'internal']),
  matchId: IdSchema,
  ...PaginationRequestSchema.partial().shape,
});

export const GameDataUnionSchema = z.union([ExternalGameSchema, InternalGameSchema]);

export const GetGamesResponseSchema = createApiResponseSchema(
  z.object({
    games: z.array(GameDataUnionSchema),
    total: z.number().int().min(0),
    type: z.enum(['external', 'internal']),
  })
);

// ===== Match Result Schemas =====

export const MatchResultSchema = z.object({
  id: IdSchema,
  event_id: IdSchema,
  player_team_name: z.string().min(1, 'チーム名は必須です'),
  opponent_team_name: z.string().min(1, '対戦チーム名は必須です'),
  player_team_sets: z.number().int().min(0),
  opponent_sets: z.number().int().min(0),
  game_no: z.number().int().positive().optional(),
  notes: z.string().optional(),
  ...TimestampSchema.shape,
});

export const CreateMatchResultRequestSchema = z.object({
  event_id: IdSchema,
  player_team_name: z.string().min(1, 'チーム名は必須です'),
  opponent_team_name: z.string().min(1, '対戦チーム名は必須です'),
  player_team_sets: z.number().int().min(0, 'セット数は0以上である必要があります'),
  opponent_sets: z.number().int().min(0, 'セット数は0以上である必要があります'),
  game_no: z.number().int().positive('ゲーム番号は正の整数である必要があります').optional(),
  notes: z.string().max(1000, '備考は1000文字以内で入力してください').optional(),
});

// ===== List Response Schemas =====

export const GamesListResponseSchema = createListResponseSchema(GameDataUnionSchema);
export const MatchResultsListResponseSchema = createListResponseSchema(MatchResultSchema);

// ===== Type Exports =====

export type Player = z.infer<typeof PlayerSchema>;
export type GameScore = z.infer<typeof GameScoreSchema>;
export type ExternalGame = z.infer<typeof ExternalGameSchema>;
export type InternalGame = z.infer<typeof InternalGameSchema>;
export type GameData = z.infer<typeof GameDataUnionSchema>;

export type CreateExternalGameRequest = z.infer<typeof CreateExternalGameRequestSchema>;
export type CreateInternalGameRequest = z.infer<typeof CreateInternalGameRequestSchema>;

export type GetGamesRequest = z.infer<typeof GetGamesRequestSchema>;
export type GetGamesResponse = z.infer<typeof GetGamesResponseSchema>;

export type MatchResult = z.infer<typeof MatchResultSchema>;
export type CreateMatchResultRequest = z.infer<typeof CreateMatchResultRequestSchema>;

export type GamesListResponse = z.infer<typeof GamesListResponseSchema>;
export type MatchResultsListResponse = z.infer<typeof MatchResultsListResponseSchema>;
