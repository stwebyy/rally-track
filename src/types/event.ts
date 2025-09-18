export type Event = {
  id: number;
  name: string;
  date: string;
  location: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MatchGame = {
  id?: number;
  match_result_id?: number;
  game_no: number | null;
  player_name?: string; // For display
  player_name_id: number; // For database
  player_style?: string;
  opponent_player_name: string;
  opponent_player_style: string;
  team_sets: number;
  opponent_sets: number;
  player_name_2?: string;
  player_name_2_id?: number | null;
  player_style_2?: string;
  opponent_player_name_2?: string | null;
  opponent_player_style_2?: string | null;
  is_doubles: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MatchResult = {
  id?: number;
  event_id: number;
  game_no: number | null;
  player_team_name: string;
  opponent_team_name: string;
  player_team_sets: number;
  opponent_sets: number;
  match_games: MatchGame[];
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type EventWithMatchResults = Event & {
  match_results: MatchResult[];
}
