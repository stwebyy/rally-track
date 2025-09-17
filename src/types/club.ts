export type Member = {
  id: number;
  name: string;
  auth_id: string;
  created_at?: string;
  updated_at?: string;
}

export type GameResult = {
  id?: number;
  match_result_id?: number;
  player_id: number;
  opponent_id: number;
  player_game_set: number;
  opponent_game_set: number;
  created_at?: string;
  updated_at?: string;
  // Join用
  player?: Member;
  opponent?: Member;
}

export type MatchResult = {
  id?: number;
  date: string;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
  game_results?: GameResult[];
}

export type MatchResultWithGameResults = MatchResult & {
  game_results: GameResult[];
}
