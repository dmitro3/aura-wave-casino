
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          registration_date: string
          balance: number
          level: number
          xp: number
          total_wagered: number
          total_profit: number
          last_claim_time: string
          badges: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          registration_date?: string
          balance?: number
          level?: number
          xp?: number
          total_wagered?: number
          total_profit?: number
          last_claim_time?: string
          badges?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          registration_date?: string
          balance?: number
          level?: number
          xp?: number
          total_wagered?: number
          total_profit?: number
          last_claim_time?: string
          badges?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      game_stats: {
        Row: {
          id: string
          user_id: string
          game_type: string
          wins: number
          losses: number
          total_profit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_type: string
          wins?: number
          losses?: number
          total_profit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_type?: string
          wins?: number
          losses?: number
          total_profit?: number
          created_at?: string
          updated_at?: string
        }
      }
      game_history: {
        Row: {
          id: string
          user_id: string
          game_type: string
          bet_amount: number
          result: string
          profit: number
          game_data: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_type: string
          bet_amount: number
          result: string
          profit: number
          game_data?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_type?: string
          bet_amount?: number
          result?: string
          profit?: number
          game_data?: any
          created_at?: string
        }
      }
    }
  }
}
