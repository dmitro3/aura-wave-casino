
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  id: string
  username: string
  registration_date: string
  balance: number
  level: number
  xp: number
  current_level: number
  current_xp: number
  xp_to_next_level: number
  lifetime_xp: number
  total_wagered: number
  total_profit: number
  last_claim_time: string
  badges: string[]
  gameStats: {
    coinflip: { wins: number; losses: number; profit: number }
    crash: { wins: number; losses: number; profit: number }
    tower: { wins: number; losses: number; profit: number }
  }
}

export function useUserProfile() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setUserData(null)
      setLoading(false)
      return
    }

    fetchUserProfile()
    
    // Set up real-time subscription for profile changes (including balance updates)
    const profileChannel = supabase
      .channel('user_profile_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time profile update received:', payload.new);
          // Update the user data with the new profile data
          if (payload.new) {
            setUserData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                balance: payload.new.balance,
                total_profit: payload.new.total_profit,
                total_wagered: payload.new.total_wagered,
                current_level: payload.new.current_level,
                current_xp: payload.new.current_xp,
                xp_to_next_level: payload.new.xp_to_next_level,
                lifetime_xp: payload.new.lifetime_xp,
              };
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('💰 Profile subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up profile subscription');
      supabase.removeChannel(profileChannel);
    };
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Fetch game stats
      const { data: gameStats, error: gameStatsError } = await supabase
        .from('game_stats')
        .select('*')
        .eq('user_id', user.id)

      if (gameStatsError) throw gameStatsError

      const coinflipStats = gameStats.find(stat => stat.game_type === 'coinflip') || {
        wins: 0,
        losses: 0,
        total_profit: 0,
      }

      const crashStats = gameStats.find(stat => stat.game_type === 'crash') || {
        wins: 0,
        losses: 0,
        total_profit: 0,
      }

      const towerStats = gameStats.find(stat => stat.game_type === 'tower') || {
        wins: 0,
        losses: 0,
        total_profit: 0,
      }

      const userProfile: UserProfile = {
        ...profile,
        gameStats: {
          coinflip: {
            wins: coinflipStats.wins,
            losses: coinflipStats.losses,
            profit: coinflipStats.total_profit,
          },
          crash: {
            wins: crashStats.wins,
            losses: crashStats.losses,
            profit: crashStats.total_profit,
          },
          tower: {
            wins: towerStats.wins,
            losses: towerStats.losses,
            profit: towerStats.total_profit,
          },
        },
      }

      setUserData(userProfile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userData) return

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          balance: updates.balance,
          level: updates.level,
          xp: updates.xp,
          total_wagered: updates.total_wagered,
          total_profit: updates.total_profit,
          last_claim_time: updates.last_claim_time,
          badges: updates.badges,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update game stats if provided
      if (updates.gameStats) {
        for (const [gameType, stats] of Object.entries(updates.gameStats)) {
          await supabase
            .from('game_stats')
            .upsert({
              user_id: user.id,
              game_type: gameType,
              wins: stats.wins,
              losses: stats.losses,
              total_profit: stats.profit,
              updated_at: new Date().toISOString(),
            })
        }
      }

      // Refresh profile data
      await fetchUserProfile()
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  return {
    userData,
    loading,
    updateUserProfile,
    refetch: fetchUserProfile,
  }
}
