export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          permissions: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          permissions?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          permissions?: string[]
          user_id?: string
        }
        Relationships: []
      }
      crash_bets: {
        Row: {
          auto_cashout_at: number | null
          bet_amount: number
          cashed_out_at: number | null
          cashout_time: string | null
          created_at: string
          id: string
          profit: number | null
          round_id: string
          status: string
          user_id: string
        }
        Insert: {
          auto_cashout_at?: number | null
          bet_amount: number
          cashed_out_at?: number | null
          cashout_time?: string | null
          created_at?: string
          id?: string
          profit?: number | null
          round_id: string
          status?: string
          user_id: string
        }
        Update: {
          auto_cashout_at?: number | null
          bet_amount?: number
          cashed_out_at?: number | null
          cashout_time?: string | null
          created_at?: string
          id?: string
          profit?: number | null
          round_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crash_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "crash_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      crash_rounds: {
        Row: {
          countdown_end_time: string | null
          crash_point: number | null
          crash_time: string | null
          created_at: string
          id: string
          multiplier: number
          round_number: number
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          countdown_end_time?: string | null
          crash_point?: number | null
          crash_time?: string | null
          created_at?: string
          id?: string
          multiplier?: number
          round_number?: number
          start_time?: string
          status?: string
          updated_at?: string
        }
        Update: {
          countdown_end_time?: string | null
          crash_point?: number | null
          crash_time?: string | null
          created_at?: string
          id?: string
          multiplier?: number
          round_number?: number
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          bet_amount: number
          created_at: string
          game_data: Json | null
          game_type: string
          id: string
          profit: number
          result: string
          user_id: string
        }
        Insert: {
          bet_amount: number
          created_at?: string
          game_data?: Json | null
          game_type: string
          id?: string
          profit: number
          result: string
          user_id: string
        }
        Update: {
          bet_amount?: number
          created_at?: string
          game_data?: Json | null
          game_type?: string
          id?: string
          profit?: number
          result?: string
          user_id?: string
        }
        Relationships: []
      }
      game_stats: {
        Row: {
          created_at: string
          game_type: string
          id: string
          losses: number
          total_profit: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          losses?: number
          total_profit?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          losses?: number
          total_profit?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: []
      }
      level_rewards: {
        Row: {
          bonus_amount: number
          level: number
          xp_required: number
        }
        Insert: {
          bonus_amount: number
          level: number
          xp_required: number
        }
        Update: {
          bonus_amount?: number
          level?: number
          xp_required?: number
        }
        Relationships: []
      }
      live_bet_feed: {
        Row: {
          bet_amount: number
          created_at: string
          game_data: Json | null
          game_type: string
          id: string
          multiplier: number | null
          profit: number
          result: string
          user_id: string
          username: string
        }
        Insert: {
          bet_amount: number
          created_at?: string
          game_data?: Json | null
          game_type: string
          id?: string
          multiplier?: number | null
          profit: number
          result: string
          user_id: string
          username: string
        }
        Update: {
          bet_amount?: number
          created_at?: string
          game_data?: Json | null
          game_type?: string
          id?: string
          multiplier?: number | null
          profit?: number
          result?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          badges: string[]
          balance: number
          created_at: string
          current_level: number
          current_xp: number
          id: string
          last_claim_time: string
          level: number
          lifetime_xp: number
          registration_date: string
          total_profit: number
          total_wagered: number
          updated_at: string
          username: string
          xp: number
          xp_to_next_level: number
        }
        Insert: {
          badges?: string[]
          balance?: number
          created_at?: string
          current_level?: number
          current_xp?: number
          id: string
          last_claim_time?: string
          level?: number
          lifetime_xp?: number
          registration_date?: string
          total_profit?: number
          total_wagered?: number
          updated_at?: string
          username: string
          xp?: number
          xp_to_next_level?: number
        }
        Update: {
          badges?: string[]
          balance?: number
          created_at?: string
          current_level?: number
          current_xp?: number
          id?: string
          last_claim_time?: string
          level?: number
          lifetime_xp?: number
          registration_date?: string
          total_profit?: number
          total_wagered?: number
          updated_at?: string
          username?: string
          xp?: number
          xp_to_next_level?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_to_live_feed: {
        Args: {
          p_user_id: string
          p_game_type: string
          p_bet_amount: number
          p_result: string
          p_profit: number
          p_multiplier?: number
          p_game_data?: Json
        }
        Returns: undefined
      }
      add_xp_and_check_levelup: {
        Args: { user_uuid: string; xp_amount: number }
        Returns: {
          leveled_up: boolean
          new_level: number
          bonus_earned: number
        }[]
      }
      calculate_level_from_xp: {
        Args: { total_xp: number }
        Returns: {
          level: number
          current_level_xp: number
          xp_to_next: number
        }[]
      }
      test_realtime_feed: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
