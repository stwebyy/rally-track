export interface Event {
  id: number;
  name: string;
  date: string;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MatchGame {
  id?: number;
  match_result_id?: number;
  game_no: number;
  player_name: string;
  player_style: string;
  opponent_player_name: string;
  opponent_player_style: string;
  team_sets: number;
  opponent_sets: number;
}

export interface MatchResult {
  id?: number;
  event_id: number;
  game_no: number;
  player_team_name: string;
  opponent_team_name: string;
  player_team_sets: number;
  opponent_sets: number;
  notes: string;
  match_games: MatchGame[];
  created_at?: string;
  updated_at?: string;
}

export interface EventWithMatchResults extends Event {
  match_results: MatchResult[];
}
