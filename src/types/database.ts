/**
 * Database Schema Type Definitions
 *
 * このファイルはSupabaseデータベースのスキーマに基づいた型定義を提供します。
 * テーブル構造の変更時は、このファイルを更新してください。
 */

// ===== Base Table Types =====

export type GameMovie = {
  id: number;
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
};

export type HaratakuMember = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  auth_id: string;
};

export type Event = {
  id: number;
  name: string;
  date: string;
  location?: string;
  created_at: string;
  updated_at: string;
};

export type MatchResult = {
  id: number;
  event_id: number;
  player_team_name: string;
  opponent_team_name: string;
  player_team_sets: number;
  opponent_sets: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  game_no?: number;
};

export type MatchGame = {
  id: number;
  match_result_id: number;
  game_no?: number;
  player_name_id: number;
  opponent_player_name: string;
  opponent_player_style: string;
  team_sets: number;
  opponent_sets: number;
  created_at: string;
  updated_at: string;
  player_name_2_id?: number;
  opponent_player_name_2?: string;
  opponent_player_style_2?: string;
  is_doubles: boolean;
  notes?: string;
};

export type HaratakuMatchResult = {
  id: number;
  date: string;
  location?: string;
  created_at: string;
  updated_at: string;
};

export type HaratakuGameResult = {
  id: number;
  player_id: number;
  opponent_id: number;
  player_game_set: number;
  opponent_game_set: number;
  created_at: string;
  updated_at: string;
  harataku_match_result_id?: number;
};

// ===== Junction Table Types =====

export type MatchGameMovies = {
  id: number;
  match_game_id: number;
  movie_id: number;
  created_at: string;
  updated_at: string;
};

export type HaratakuGameMovies = {
  id: number;
  movie_id: number;
  harataku_game_results_id: number;
  created_at: string;
  updated_at: string;
};

// ===== Joined/Related Types =====

export type MatchGameWithMovies = MatchGame & {
  match_game_movies: Array<{
    game_movies: GameMovie;
  }>;
};

export type MatchGameWithDetails = MatchGame & {
  match_result?: MatchResult & {
    events?: Array<{ event_date: string }>;
  };
  event_date?: string;
  player_names?: string[];
};

export type HaratakuGameResultWithMovies = HaratakuGameResult & {
  harataku_game_movies: Array<{
    game_movies: GameMovie;
  }>;
  harataku_match_results?: Array<{
    date: string;
  }>;
};

export type HaratakuGameResultWithDetails = HaratakuGameResult & {
  player: { name: string };
  opponent: { name: string };
  match_date?: string;
};

// ===== API Response Types =====

export type VideoResponse = {
  id: string;
  title: string;
  youtube_url: string;
  created_at: string;
  match_date: string;
  match_type: 'external' | 'internal' | 'standalone';
};

export type VideosListResponse = {
  videos: VideoResponse[];
  count: number;
};

// ===== Insert Types (for database operations) =====

export type GameMovieInsert = Omit<GameMovie, 'id' | 'created_at' | 'updated_at'>;

export type MatchGameInsert = Omit<MatchGame, 'id' | 'created_at' | 'updated_at'>;

export type MatchGameMoviesInsert = Omit<MatchGameMovies, 'id' | 'created_at' | 'updated_at'>;

export type HaratakuGameMoviesInsert = Omit<HaratakuGameMovies, 'id' | 'created_at' | 'updated_at'>;

// ===== Database Collections Type =====

export type DatabaseTables = {
  game_movies: GameMovie;
  harataku_members: HaratakuMember;
  events: Event;
  match_results: MatchResult;
  match_games: MatchGame;
  harataku_match_results: HaratakuMatchResult;
  harataku_game_results: HaratakuGameResult;
  match_game_movies: MatchGameMovies;
  harataku_game_movies: HaratakuGameMovies;
};

// ===== Type Guards =====

export const isMatchGameWithMovies = (obj: unknown): obj is MatchGameWithMovies => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'match_game_movies' in obj &&
    Array.isArray((obj as MatchGameWithMovies).match_game_movies)
  );
}

export const isHaratakuGameResultWithMovies = (obj: unknown): obj is HaratakuGameResultWithMovies => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'harataku_game_movies' in obj &&
    Array.isArray((obj as HaratakuGameResultWithMovies).harataku_game_movies)
  );
}
