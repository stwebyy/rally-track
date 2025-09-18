export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          date: string
          id: number
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_movies: {
        Row: {
          created_at: string
          id: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      harataku_game_movies: {
        Row: {
          created_at: string
          harataku_game_results_id: number
          id: number
          movie_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          harataku_game_results_id: number
          id?: number
          movie_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          harataku_game_results_id?: number
          id?: number
          movie_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "harataku_game_movies_harataku_game_results_id_fkey"
            columns: ["harataku_game_results_id"]
            isOneToOne: false
            referencedRelation: "harataku_game_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harataku_game_movies_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "game_movies"
            referencedColumns: ["id"]
          },
        ]
      }
      harataku_game_results: {
        Row: {
          created_at: string
          harataku_match_result_id: number | null
          id: number
          opponent_game_set: number
          opponent_id: number
          player_game_set: number
          player_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          harataku_match_result_id?: number | null
          id?: number
          opponent_game_set: number
          opponent_id: number
          player_game_set: number
          player_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          harataku_match_result_id?: number | null
          id?: number
          opponent_game_set?: number
          opponent_id?: number
          player_game_set?: number
          player_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "harataku_game_results_harataku_match_result_id_fkey"
            columns: ["harataku_match_result_id"]
            isOneToOne: false
            referencedRelation: "harataku_match_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harataku_game_results_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "harataku_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harataku_game_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "harataku_members"
            referencedColumns: ["id"]
          },
        ]
      }
      harataku_match_results: {
        Row: {
          created_at: string
          date: string
          id: number
          location: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          location?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          location?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      harataku_members: {
        Row: {
          auth_id: string
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          auth_id: string
          created_at?: string
          id?: number
          name: string
          updated_at: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_game_movies: {
        Row: {
          created_at: string
          id: number
          match_game_id: number
          movie_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          match_game_id: number
          movie_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          match_game_id?: number
          movie_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_game_movies_match_game_id_fkey"
            columns: ["match_game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_game_movies_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "game_movies"
            referencedColumns: ["id"]
          },
        ]
      }
      match_games: {
        Row: {
          created_at: string
          game_no: number | null
          id: number
          is_doubles: boolean
          match_result_id: number
          notes: string | null
          opponent_player_name: string
          opponent_player_name_2: string | null
          opponent_player_style: string
          opponent_player_style_2: string | null
          opponent_sets: number
          player_name_2_id: number | null
          player_name_id: number
          team_sets: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_no?: number | null
          id?: number
          is_doubles?: boolean
          match_result_id: number
          notes?: string | null
          opponent_player_name: string
          opponent_player_name_2?: string | null
          opponent_player_style: string
          opponent_player_style_2?: string | null
          opponent_sets: number
          player_name_2_id?: number | null
          player_name_id: number
          team_sets: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_no?: number | null
          id?: number
          is_doubles?: boolean
          match_result_id?: number
          notes?: string | null
          opponent_player_name?: string
          opponent_player_name_2?: string | null
          opponent_player_style?: string
          opponent_player_style_2?: string | null
          opponent_sets?: number
          player_name_2_id?: number | null
          player_name_id?: number
          team_sets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_games_match_result_id_fkey"
            columns: ["match_result_id"]
            isOneToOne: false
            referencedRelation: "match_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_player_name_2_id_fkey"
            columns: ["player_name_2_id"]
            isOneToOne: false
            referencedRelation: "harataku_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_player_name_id_fkey"
            columns: ["player_name_id"]
            isOneToOne: false
            referencedRelation: "harataku_members"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          created_at: string
          event_id: number
          game_no: number | null
          id: number
          notes: string | null
          opponent_sets: number
          opponent_team_name: string
          player_team_name: string
          player_team_sets: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: number
          game_no?: number | null
          id?: number
          notes?: string | null
          opponent_sets: number
          opponent_team_name: string
          player_team_name: string
          player_team_sets: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: number
          game_no?: number | null
          id?: number
          notes?: string | null
          opponent_sets?: number
          opponent_team_name?: string
          player_team_name?: string
          player_team_sets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_id: string
          created_at: string
          display_name: string
          id: number
          updated_at: string
        }
        Insert: {
          auth_id?: string
          created_at?: string
          display_name: string
          id?: number
          updated_at?: string
        }
        Update: {
          auth_id?: string
          created_at?: string
          display_name?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      upload_sessions: {
        Row: {
          created_at: string
          error_message: string | null
          expires_at: string | null
          file_name: string
          file_size: number
          id: number
          metadata: Json
          status: Database["public"]["Enums"]["status"]
          updated_at: string | null
          uploaded_bytes: number
          user_id: string
          video_id_status: string | null
          youtube_session_id: string
          youtube_upload_url: string | null
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_name: string
          file_size: number
          id?: number
          metadata: Json
          status?: Database["public"]["Enums"]["status"]
          updated_at?: string | null
          uploaded_bytes?: number
          user_id: string
          video_id_status?: string | null
          youtube_session_id: string
          youtube_upload_url?: string | null
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          file_name?: string
          file_size?: number
          id?: number
          metadata?: Json
          status?: Database["public"]["Enums"]["status"]
          updated_at?: string | null
          uploaded_bytes?: number
          user_id?: string
          video_id_status?: string | null
          youtube_session_id?: string
          youtube_upload_url?: string | null
          youtube_video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      status: "pending" | "uploading" | "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      status: ["pending", "uploading", "processing", "completed", "failed"],
    },
  },
} as const
