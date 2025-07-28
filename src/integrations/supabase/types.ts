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
      achievements: {
        Row: {
          category: string
          created_at: string | null
          criteria: Json
          description: string
          difficulty: string
          icon: string
          id: string
          name: string
          rarity: string
          reward_amount: number | null
          reward_type: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          criteria: Json
          description: string
          difficulty?: string
          icon?: string
          id?: string
          name: string
          rarity?: string
          reward_amount?: number | null
          reward_type?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          criteria?: Json
          description?: string
          difficulty?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          reward_amount?: number | null
          reward_type?: string | null
        }
        Relationships: []
      }
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      border_tiers: {
        Row: {
          animation_type: string | null
          css_classes: string
          description: string
          max_level: number
          min_level: number
          name: string
          tier: number
        }
        Insert: {
          animation_type?: string | null
          css_classes: string
          description: string
          max_level: number
          min_level: number
          name: string
          tier: number
        }
        Update: {
          animation_type?: string | null
          css_classes?: string
          description?: string
          max_level?: number
          min_level?: number
          name?: string
          tier?: number
        }
        Relationships: []
      }
      case_rewards: {
        Row: {
          created_at: string
          id: string
          level_unlocked: number
          opened_at: string | null
          rarity: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_unlocked: number
          opened_at?: string | null
          rarity: string
          reward_amount?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level_unlocked?: number
          opened_at?: string | null
          rarity?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
          user_level: number
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
          user_level?: number
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
          user_level?: number
          username?: string
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
      daily_seeds: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_revealed: boolean | null
          lotto: string
          lotto_hash: string
          revealed_at: string | null
          server_seed: string
          server_seed_hash: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_revealed?: boolean | null
          lotto: string
          lotto_hash: string
          revealed_at?: string | null
          server_seed: string
          server_seed_hash: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_revealed?: boolean | null
          lotto?: string
          lotto_hash?: string
          revealed_at?: string | null
          server_seed?: string
          server_seed_hash?: string
        }
        Relationships: []
      }
      free_case_claims: {
        Row: {
          amount: number
          case_type: string
          claimed_at: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          case_type: string
          claimed_at?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          case_type?: string
          claimed_at?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          action: string | null
          bet_amount: number
          created_at: string
          final_multiplier: number | null
          game_data: Json | null
          game_type: string
          id: string
          profit: number
          result: string
          streak_length: number | null
          user_id: string
        }
        Insert: {
          action?: string | null
          bet_amount: number
          created_at?: string
          final_multiplier?: number | null
          game_data?: Json | null
          game_type: string
          id?: string
          profit: number
          result: string
          streak_length?: number | null
          user_id: string
        }
        Update: {
          action?: string | null
          bet_amount?: number
          created_at?: string
          final_multiplier?: number | null
          game_data?: Json | null
          game_type?: string
          id?: string
          profit?: number
          result?: string
          streak_length?: number | null
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
          action: string | null
          avatar_url: string | null
          bet_amount: number
          bet_color: string | null
          created_at: string
          game_data: Json | null
          game_type: string
          id: string
          multiplier: number | null
          profit: number
          result: string
          round_id: string | null
          streak_length: number | null
          user_id: string
          username: string
        }
        Insert: {
          action?: string | null
          avatar_url?: string | null
          bet_amount: number
          bet_color?: string | null
          created_at?: string
          game_data?: Json | null
          game_type: string
          id?: string
          multiplier?: number | null
          profit: number
          result: string
          round_id?: string | null
          streak_length?: number | null
          user_id: string
          username: string
        }
        Update: {
          action?: string | null
          avatar_url?: string | null
          bet_amount?: number
          bet_color?: string | null
          created_at?: string
          game_data?: Json | null
          game_type?: string
          id?: string
          multiplier?: number | null
          profit?: number
          result?: string
          round_id?: string | null
          streak_length?: number | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_data_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_cases: number | null
          badges: string[]
          balance: number
          border_tier: number | null
          created_at: string
          current_level: number
          current_xp: number
          id: string
          last_claim_time: string
          level: number
          lifetime_xp: number
          registration_date: string
          total_cases_opened: number | null
          total_profit: number
          total_wagered: number
          updated_at: string
          username: string
          xp: number
          xp_to_next_level: number
        }
        Insert: {
          available_cases?: number | null
          badges?: string[]
          balance?: number
          border_tier?: number | null
          created_at?: string
          current_level?: number
          current_xp?: number
          id: string
          last_claim_time?: string
          level?: number
          lifetime_xp?: number
          registration_date?: string
          total_cases_opened?: number | null
          total_profit?: number
          total_wagered?: number
          updated_at?: string
          username: string
          xp?: number
          xp_to_next_level?: number
        }
        Update: {
          available_cases?: number | null
          badges?: string[]
          balance?: number
          border_tier?: number | null
          created_at?: string
          current_level?: number
          current_xp?: number
          id?: string
          last_claim_time?: string
          level?: number
          lifetime_xp?: number
          registration_date?: string
          total_cases_opened?: number | null
          total_profit?: number
          total_wagered?: number
          updated_at?: string
          username?: string
          xp?: number
          xp_to_next_level?: number
        }
        Relationships: []
      }
      roulette_bets: {
        Row: {
          actual_payout: number | null
          bet_amount: number
          bet_color: string
          client_seed: string | null
          created_at: string
          id: string
          ip_address: string | null
          is_winner: boolean | null
          potential_payout: number
          profit: number | null
          round_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          actual_payout?: number | null
          bet_amount: number
          bet_color: string
          client_seed?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_winner?: boolean | null
          potential_payout: number
          profit?: number | null
          round_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          actual_payout?: number | null
          bet_amount?: number
          bet_color?: string
          client_seed?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_winner?: boolean | null
          potential_payout?: number
          profit?: number | null
          round_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roulette_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "roulette_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      roulette_client_seeds: {
        Row: {
          client_seed: string
          created_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          client_seed: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          client_seed?: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      roulette_results: {
        Row: {
          created_at: string
          id: string
          result_color: string
          result_slot: number
          round_id: string
          round_number: number
          total_bets_amount: number
          total_bets_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          result_color: string
          result_slot: number
          round_id: string
          round_number: number
          total_bets_amount?: number
          total_bets_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          result_color?: string
          result_slot?: number
          round_id?: string
          round_number?: number
          total_bets_amount?: number
          total_bets_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "roulette_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "roulette_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      roulette_rounds: {
        Row: {
          betting_end_time: string
          betting_start_time: string
          created_at: string
          daily_seed_id: string | null
          id: string
          nonce: number
          nonce_id: number | null
          reel_position: number | null
          result_color: string | null
          result_multiplier: number | null
          result_slot: number | null
          round_number: number
          server_seed: string
          server_seed_hash: string
          spinning_end_time: string
          status: string
          updated_at: string
        }
        Insert: {
          betting_end_time: string
          betting_start_time?: string
          created_at?: string
          daily_seed_id?: string | null
          id?: string
          nonce: number
          nonce_id?: number | null
          reel_position?: number | null
          result_color?: string | null
          result_multiplier?: number | null
          result_slot?: number | null
          round_number?: number
          server_seed: string
          server_seed_hash: string
          spinning_end_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          betting_end_time?: string
          betting_start_time?: string
          created_at?: string
          daily_seed_id?: string | null
          id?: string
          nonce?: number
          nonce_id?: number | null
          reel_position?: number | null
          result_color?: string | null
          result_multiplier?: number | null
          result_slot?: number | null
          round_number?: number
          server_seed?: string
          server_seed_hash?: string
          spinning_end_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roulette_rounds_daily_seed_id_fkey"
            columns: ["daily_seed_id"]
            isOneToOne: false
            referencedRelation: "daily_seeds"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount: number
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          to_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          to_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "user_data_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "user_data_view"
            referencedColumns: ["id"]
          },
        ]
      }
      tower_games: {
        Row: {
          bet_amount: number
          created_at: string
          current_level: number
          current_multiplier: number
          difficulty: string
          final_payout: number | null
          id: string
          max_level: number
          mine_positions: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_amount: number
          created_at?: string
          current_level?: number
          current_multiplier?: number
          difficulty: string
          final_payout?: number | null
          id?: string
          max_level: number
          mine_positions: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_amount?: number
          created_at?: string
          current_level?: number
          current_multiplier?: number
          difficulty?: string
          final_payout?: number | null
          id?: string
          max_level?: number
          mine_positions?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tower_levels: {
        Row: {
          created_at: string
          game_id: string
          id: string
          level_number: number
          multiplier_at_level: number
          tile_selected: number
          was_safe: boolean
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          level_number: number
          multiplier_at_level: number
          tile_selected: number
          was_safe: boolean
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          level_number?: number
          multiplier_at_level?: number
          tile_selected?: number
          was_safe?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tower_levels_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "tower_games"
            referencedColumns: ["id"]
          },
        ]
      }
      unlocked_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          claimed: boolean | null
          claimed_at: string | null
          id: string
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_data_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_logins: {
        Row: {
          created_at: string | null
          id: string
          login_date: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          login_date?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          login_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_logins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_logins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_data_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_level_stats: {
        Row: {
          account_created: string | null
          available_cases: number | null
          best_coinflip_streak: number | null
          best_win_streak: number | null
          biggest_loss: number | null
          biggest_single_bet: number | null
          biggest_win: number | null
          border_tier: number | null
          border_unlocked_at: string | null
          chat_messages_count: number | null
          coinflip_games: number | null
          coinflip_profit: number | null
          coinflip_wagered: number | null
          coinflip_wins: number | null
          crash_games: number | null
          crash_profit: number | null
          crash_wagered: number | null
          crash_wins: number | null
          created_at: string | null
          current_coinflip_streak: number | null
          current_level: number | null
          current_level_xp: number | null
          current_win_streak: number | null
          id: string
          lifetime_xp: number | null
          login_days_count: number | null
          roulette_best_streak: number | null
          roulette_biggest_bet: number | null
          roulette_black_wins: number | null
          roulette_current_streak: number | null
          roulette_favorite_color: string | null
          roulette_games: number | null
          roulette_green_wins: number | null
          roulette_highest_loss: number | null
          roulette_highest_win: number | null
          roulette_profit: number | null
          roulette_red_wins: number | null
          roulette_wagered: number | null
          roulette_wins: number | null
          total_case_value: number | null
          total_cases_opened: number | null
          total_games: number | null
          total_profit: number | null
          total_wagered: number | null
          total_wins: number | null
          tower_best_streak: number | null
          tower_biggest_loss: number | null
          tower_biggest_win: number | null
          tower_current_streak: number | null
          tower_games: number | null
          tower_highest_level: number | null
          tower_perfect_games: number | null
          tower_profit: number | null
          tower_wagered: number | null
          tower_wins: number | null
          updated_at: string | null
          user_id: string | null
          xp_to_next_level: number | null
        }
        Insert: {
          account_created?: string | null
          available_cases?: number | null
          best_coinflip_streak?: number | null
          best_win_streak?: number | null
          biggest_loss?: number | null
          biggest_single_bet?: number | null
          biggest_win?: number | null
          border_tier?: number | null
          border_unlocked_at?: string | null
          chat_messages_count?: number | null
          coinflip_games?: number | null
          coinflip_profit?: number | null
          coinflip_wagered?: number | null
          coinflip_wins?: number | null
          crash_games?: number | null
          crash_profit?: number | null
          crash_wagered?: number | null
          crash_wins?: number | null
          created_at?: string | null
          current_coinflip_streak?: number | null
          current_level?: number | null
          current_level_xp?: number | null
          current_win_streak?: number | null
          id?: string
          lifetime_xp?: number | null
          login_days_count?: number | null
          roulette_best_streak?: number | null
          roulette_biggest_bet?: number | null
          roulette_black_wins?: number | null
          roulette_current_streak?: number | null
          roulette_favorite_color?: string | null
          roulette_games?: number | null
          roulette_green_wins?: number | null
          roulette_highest_loss?: number | null
          roulette_highest_win?: number | null
          roulette_profit?: number | null
          roulette_red_wins?: number | null
          roulette_wagered?: number | null
          roulette_wins?: number | null
          total_case_value?: number | null
          total_cases_opened?: number | null
          total_games?: number | null
          total_profit?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          tower_best_streak?: number | null
          tower_biggest_loss?: number | null
          tower_biggest_win?: number | null
          tower_current_streak?: number | null
          tower_games?: number | null
          tower_highest_level?: number | null
          tower_perfect_games?: number | null
          tower_profit?: number | null
          tower_wagered?: number | null
          tower_wins?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp_to_next_level?: number | null
        }
        Update: {
          account_created?: string | null
          available_cases?: number | null
          best_coinflip_streak?: number | null
          best_win_streak?: number | null
          biggest_loss?: number | null
          biggest_single_bet?: number | null
          biggest_win?: number | null
          border_tier?: number | null
          border_unlocked_at?: string | null
          chat_messages_count?: number | null
          coinflip_games?: number | null
          coinflip_profit?: number | null
          coinflip_wagered?: number | null
          coinflip_wins?: number | null
          crash_games?: number | null
          crash_profit?: number | null
          crash_wagered?: number | null
          crash_wins?: number | null
          created_at?: string | null
          current_coinflip_streak?: number | null
          current_level?: number | null
          current_level_xp?: number | null
          current_win_streak?: number | null
          id?: string
          lifetime_xp?: number | null
          login_days_count?: number | null
          roulette_best_streak?: number | null
          roulette_biggest_bet?: number | null
          roulette_black_wins?: number | null
          roulette_current_streak?: number | null
          roulette_favorite_color?: string | null
          roulette_games?: number | null
          roulette_green_wins?: number | null
          roulette_highest_loss?: number | null
          roulette_highest_win?: number | null
          roulette_profit?: number | null
          roulette_red_wins?: number | null
          roulette_wagered?: number | null
          roulette_wins?: number | null
          total_case_value?: number | null
          total_cases_opened?: number | null
          total_games?: number | null
          total_profit?: number | null
          total_wagered?: number | null
          total_wins?: number | null
          tower_best_streak?: number | null
          tower_biggest_loss?: number | null
          tower_biggest_win?: number | null
          tower_current_streak?: number | null
          tower_games?: number | null
          tower_highest_level?: number | null
          tower_perfect_games?: number | null
          tower_profit?: number | null
          tower_wagered?: number | null
          tower_wins?: number | null
          updated_at?: string | null
          user_id?: string | null
          xp_to_next_level?: number | null
        }
        Relationships: []
      }
      user_rate_limits: {
        Row: {
          bet_count: number
          created_at: string
          id: string
          last_bet_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_count?: number
          created_at?: string
          id?: string
          last_bet_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_count?: number
          created_at?: string
          id?: string
          last_bet_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_data_view: {
        Row: {
          account_created: string | null
          available_cases: number | null
          badges: string[] | null
          balance: number | null
          best_coinflip_streak: number | null
          best_win_streak: number | null
          biggest_loss: number | null
          biggest_single_bet: number | null
          biggest_win: number | null
          border_tier: number | null
          border_unlocked_at: string | null
          chat_messages_count: number | null
          coinflip_games: number | null
          coinflip_profit: number | null
          coinflip_wagered: number | null
          coinflip_wins: number | null
          crash_games: number | null
          crash_profit: number | null
          crash_wagered: number | null
          crash_wins: number | null
          created_at: string | null
          current_coinflip_streak: number | null
          current_level: number | null
          current_level_xp: number | null
          current_win_streak: number | null
          id: string | null
          last_claim_time: string | null
          lifetime_xp: number | null
          login_days_count: number | null
          registration_date: string | null
          roulette_best_streak: number | null
          roulette_biggest_bet: number | null
          roulette_black_wins: number | null
          roulette_current_streak: number | null
          roulette_favorite_color: string | null
          roulette_games: number | null
          roulette_green_wins: number | null
          roulette_highest_loss: number | null
          roulette_highest_win: number | null
          roulette_profit: number | null
          roulette_red_wins: number | null
          roulette_wagered: number | null
          roulette_wins: number | null
          total_case_value: number | null
          total_cases_opened: number | null
          total_games: number | null
          total_profit: number | null
          total_wagered: number | null
          total_wins: number | null
          tower_best_streak: number | null
          tower_biggest_loss: number | null
          tower_biggest_win: number | null
          tower_current_streak: number | null
          tower_games: number | null
          tower_highest_level: number | null
          tower_perfect_games: number | null
          tower_profit: number | null
          tower_wagered: number | null
          tower_wins: number | null
          updated_at: string | null
          username: string | null
          xp_to_next_level: number | null
        }
        Relationships: []
      }
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
          cases_earned: number
        }[]
      }
      atomic_bet_balance_check: {
        Args:
          | { p_user_id: string; p_amount: number }
          | { p_user_id: string; p_bet_amount: number; p_round_id: string }
        Returns: Json
      }
      award_achievement_reward: {
        Args: { p_user_id: string; p_achievement_id: string }
        Returns: undefined
      }
      calculate_level_from_xp: {
        Args: { total_xp: number }
        Returns: {
          level: number
          current_level_xp: number
          xp_to_next: number
        }[]
      }
      calculate_level_from_xp_new: {
        Args: { total_xp: number }
        Returns: {
          level: number
          current_level_xp: number
          xp_to_next: number
        }[]
      }
      calculate_total_xp_for_level: {
        Args: { target_level: number }
        Returns: number
      }
      calculate_xp_for_level: {
        Args: { target_level: number }
        Returns: number
      }
      calculate_xp_for_level_new: {
        Args: { target_level: number }
        Returns: number
      }
      can_claim_free_case: {
        Args: { p_user_id: string; p_case_type: string }
        Returns: boolean
      }
      check_for_ready_achievements: {
        Args: { p_user_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args:
          | { p_user_id: string }
          | {
              p_user_id: string
              p_action: string
              p_limit_count?: number
              p_limit_window?: unknown
            }
        Returns: boolean
      }
      claim_achievement_manual: {
        Args: { p_user_id: string; p_achievement_id: string }
        Returns: Json
      }
      cleanup_old_security_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_user_level_stats: {
        Args: { user_id: string }
        Returns: Json
      }
      create_user_profile: {
        Args: { user_id: string; user_email: string }
        Returns: Json
      }
      enforce_rate_limit: {
        Args: {
          p_user_id: string
          p_action: string
          p_limit_per_minute?: number
        }
        Returns: boolean
      }
      ensure_user_level_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ensure_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_next_free_case_claim_time: {
        Args: { p_user_id: string; p_case_type: string }
        Returns: string
      }
      get_user_bet_stats: {
        Args: { p_user_id: string } | { p_user_id: string; p_round_id: string }
        Returns: Json
      }
      initialize_user_level_stats: {
        Args: { user_id: string }
        Returns: undefined
      }
      process_tip: {
        Args: {
          p_from_user_id: string
          p_to_user_id: string
          p_amount: number
          p_message?: string
        }
        Returns: boolean
      }
      rollback_bet_balance: {
        Args: { p_user_id: string; p_amount: number }
        Returns: undefined
      }
      secure_balance_check: {
        Args: { p_user_id: string; p_amount: number }
        Returns: Json
      }
      test_realtime_feed: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_service_role_access: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      track_bet_amount: {
        Args: { p_user_id: string; p_amount: number }
        Returns: undefined
      }
      track_chat_message: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      track_daily_login: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      track_game_result: {
        Args:
          | {
              p_user_id: string
              p_game_type: string
              p_amount: number
              p_result: string
              p_profit: number
            }
          | {
              p_user_id: string
              p_game_type: string
              p_is_win: boolean
              p_profit: number
            }
        Returns: undefined
      }
      update_user_stats_and_level: {
        Args: {
          p_user_id: string
          p_game_type: string
          p_bet_amount: number
          p_result: string
          p_profit: number
          p_streak_length?: number
          p_winning_color?: string
          p_bet_color?: string
        }
        Returns: {
          leveled_up: boolean
          new_level: number
          old_level: number
          cases_earned: number
          border_tier_changed: boolean
          new_border_tier: number
        }[]
      }
      validate_bet_amount: {
        Args: { p_amount: number }
        Returns: boolean
      }
      validate_bet_limits: {
        Args:
          | { p_user_id: string; p_amount: number; p_game_type: string }
          | { p_user_id: string; p_round_id: string; p_bet_amount: number }
        Returns: Json
      }
      validate_user_input: {
        Args: { p_input_type: string; p_input_value: string }
        Returns: Json
      }
      validate_username: {
        Args: { p_username: string }
        Returns: boolean
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
