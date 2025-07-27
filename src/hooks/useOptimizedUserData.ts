import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface OptimizedUserData {
  id: string
  username: string
  registration_date: string
  balance: number
  badges: string[]
  last_claim_time: string
  created_at: string
  updated_at: string
  current_level: number
  lifetime_xp: number
  current_level_xp: number
  xp_to_next_level: number
  border_tier: number
  border_unlocked_at: string | null
  available_cases: number
  total_cases_opened: number
  total_case_value: number
  coinflip_games: number
  coinflip_wins: number
  coinflip_wagered: number
  coinflip_profit: number
  best_coinflip_streak: number
  current_coinflip_streak: number
  crash_games: number
  crash_wins: number
  crash_wagered: number
  crash_profit: number
  roulette_games: number
  roulette_wins: number
  roulette_wagered: number
  roulette_profit: number
  roulette_highest_win: number
  roulette_highest_loss: number
  roulette_green_wins: number
  roulette_red_wins: number
  roulette_black_wins: number
  roulette_favorite_color: string
  roulette_best_streak: number
  roulette_current_streak: number
  roulette_biggest_bet: number
  tower_games: number
  tower_wins: number
  tower_wagered: number
  tower_profit: number
  total_games: number
  total_wins: number
  total_wagered: number
  total_profit: number
  biggest_win: number
  biggest_loss: number
  chat_messages_count: number
  login_days_count: number
  biggest_single_bet: number
  account_created: string
  current_win_streak: number
  best_win_streak: number
  tower_highest_level: number
  tower_biggest_win: number
  tower_biggest_loss: number
  tower_best_streak: number
  tower_current_streak: number
  tower_perfect_games: number
}

export function useOptimizedUserData() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<OptimizedUserData | null>(null)
  const [loading, setLoading] = useState(true)
  const subscriptionRef = useRef<any>(null)
  const mountedRef = useRef(true)

  // Single optimized fetch using the database view
  const fetchUserData = useCallback(async () => {
    if (!user) return

    try {
      console.log('🚀 Fetching optimized user data for:', user.id)
      
      // Single query to get all user data
      const { data, error } = await supabase
        .from('user_data_view')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!mountedRef.current) return

      if (error) {
        if (error.code === 'PGRST116') {
          // User doesn't exist in the view, create initial data
          console.log('🆕 Creating initial user data for:', user.id)
          
          // Create profile first
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: user.user_metadata?.username || `User_${user.id.slice(0, 8)}`,
              balance: 0,
              badges: ['welcome']
            })
            .select('*')
            .single()

          if (profileError) throw profileError

          // Create level stats
          const { data: levelStats, error: levelStatsError } = await supabase
            .from('user_level_stats')
            .insert({ user_id: user.id })
            .select('*')
            .single()

          if (levelStatsError) throw levelStatsError

          // Fetch the combined data again
          const { data: combinedData, error: combinedError } = await supabase
            .from('user_data_view')
            .select('*')
            .eq('id', user.id)
            .single()

          if (combinedError) throw combinedError
          
          if (mountedRef.current) {
            setUserData(combinedData)
          }
        } else {
          throw error
        }
      } else {
        if (mountedRef.current) {
          setUserData(data)
        }
      }
    } catch (error) {
      console.error('Error fetching optimized user data:', error)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [user])

  useEffect(() => {
    mountedRef.current = true

    if (!user) {
      setUserData(null)
      setLoading(false)
      return
    }

    fetchUserData()
    
    // Single optimized subscription for all user data updates
    console.log('🔗 Setting up optimized user data subscription for user:', user.id)
    
    subscriptionRef.current = supabase
      .channel(`optimized_user_data_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('👤 PROFILE UPDATE RECEIVED:', payload)
          
          if (payload.new && mountedRef.current) {
            // Update only profile-specific fields
            setUserData(prev => {
              if (!prev) return null
              return {
                ...prev,
                balance: payload.new.balance,
                username: payload.new.username,
                badges: payload.new.badges,
                last_claim_time: payload.new.last_claim_time,
                updated_at: payload.new.updated_at
              }
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_level_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 LEVEL STATS UPDATE RECEIVED:', payload)
          
          if (payload.new && mountedRef.current) {
            const newStats = payload.new as any
            setUserData(prev => {
              if (!prev) return null
              return {
                ...prev,
                current_level: newStats.current_level,
                lifetime_xp: newStats.lifetime_xp,
                current_level_xp: newStats.current_level_xp,
                xp_to_next_level: newStats.xp_to_next_level,
                border_tier: newStats.border_tier,
                border_unlocked_at: newStats.border_unlocked_at,
                available_cases: newStats.available_cases,
                total_cases_opened: newStats.total_cases_opened,
                total_case_value: newStats.total_case_value,
                coinflip_games: newStats.coinflip_games,
                coinflip_wins: newStats.coinflip_wins,
                coinflip_wagered: newStats.coinflip_wagered,
                coinflip_profit: newStats.coinflip_profit,
                best_coinflip_streak: newStats.best_coinflip_streak,
                current_coinflip_streak: newStats.current_coinflip_streak,
                crash_games: newStats.crash_games,
                crash_wins: newStats.crash_wins,
                crash_wagered: newStats.crash_wagered,
                crash_profit: newStats.crash_profit,
                roulette_games: newStats.roulette_games,
                roulette_wins: newStats.roulette_wins,
                roulette_wagered: newStats.roulette_wagered,
                roulette_profit: newStats.roulette_profit,
                roulette_highest_win: newStats.roulette_highest_win,
                roulette_highest_loss: newStats.roulette_highest_loss,
                roulette_green_wins: newStats.roulette_green_wins,
                roulette_red_wins: newStats.roulette_red_wins,
                roulette_black_wins: newStats.roulette_black_wins,
                roulette_favorite_color: newStats.roulette_favorite_color,
                roulette_best_streak: newStats.roulette_best_streak,
                roulette_current_streak: newStats.roulette_current_streak,
                roulette_biggest_bet: newStats.roulette_biggest_bet,
                tower_games: newStats.tower_games,
                tower_wins: newStats.tower_wins,
                tower_wagered: newStats.tower_wagered,
                tower_profit: newStats.tower_profit,
                total_games: newStats.total_games,
                total_wins: newStats.total_wins,
                total_wagered: newStats.total_wagered,
                total_profit: newStats.total_profit,
                biggest_win: newStats.biggest_win,
                biggest_loss: newStats.biggest_loss,
                chat_messages_count: newStats.chat_messages_count,
                login_days_count: newStats.login_days_count,
                biggest_single_bet: newStats.biggest_single_bet,
                current_win_streak: newStats.current_win_streak,
                best_win_streak: newStats.best_win_streak,
                tower_highest_level: newStats.tower_highest_level,
                tower_biggest_win: newStats.tower_biggest_win,
                tower_biggest_loss: newStats.tower_biggest_loss,
                tower_best_streak: newStats.tower_best_streak,
                tower_current_streak: newStats.tower_current_streak,
                tower_perfect_games: newStats.tower_perfect_games
              }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📊 Optimized user data subscription status:', status)
      })

    return () => {
      mountedRef.current = false
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up optimized user data subscription')
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [user, fetchUserData])

  const updateUserData = async (updates: Partial<OptimizedUserData>) => {
    if (!user || !userData) return

    try {
      // Only update profile table for profile-specific data
      const profileUpdates: any = {}
      if (updates.balance !== undefined) profileUpdates.balance = updates.balance
      if (updates.username !== undefined) profileUpdates.username = updates.username
      if (updates.badges !== undefined) profileUpdates.badges = updates.badges
      if (updates.last_claim_time !== undefined) profileUpdates.last_claim_time = updates.last_claim_time
      
      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString()
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id)

        if (profileError) throw profileError
      }

      // Refresh user data to get latest state
      await fetchUserData()
    } catch (error) {
      console.error('Error updating user data:', error)
      throw error
    }
  }

  return {
    userData,
    loading,
    updateUserData,
    refetch: fetchUserData,
  }
}