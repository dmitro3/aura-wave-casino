
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
    roulette: { wins: number; losses: number; profit: number }
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
    
    // Set up real-time subscription for user_level_stats (primary data source)
    console.log('🔗 Setting up comprehensive stats subscription for user:', user.id);
    
    const statsChannel = supabase
      .channel(`user_stats_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_level_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 USER STATS UPDATE RECEIVED:', payload);
          
          if (payload.new) {
            const newStats = payload.new as any;
            setUserData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                // Update all level/XP/stats data from user_level_stats
                current_level: newStats.current_level,
                current_xp: newStats.current_level_xp,
                xp_to_next_level: newStats.xp_to_next_level,
                lifetime_xp: newStats.lifetime_xp,
                total_wagered: newStats.total_wagered,
                total_profit: newStats.total_profit,
                gameStats: {
                  coinflip: {
                    wins: newStats.coinflip_wins,
                    losses: Math.max(0, newStats.coinflip_games - newStats.coinflip_wins),
                    profit: newStats.coinflip_profit,
                  },
                  crash: {
                    wins: newStats.crash_wins,
                    losses: Math.max(0, newStats.crash_games - newStats.crash_wins),
                    profit: newStats.crash_profit,
                  },
                  roulette: {
                    wins: newStats.roulette_wins,
                    losses: Math.max(0, newStats.roulette_games - newStats.roulette_wins),
                    profit: newStats.roulette_profit,
                  },
                  tower: {
                    wins: newStats.tower_wins,
                    losses: Math.max(0, newStats.tower_games - newStats.tower_wins),
                    profit: newStats.tower_profit,
                  },
                },
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('👤 PROFILE UPDATE RECEIVED:', payload);
          console.log('👤 Old balance:', payload.old?.balance, 'New balance:', payload.new?.balance);
          
          if (payload.new && payload.old) {
            // Only update profile-specific data (balance, username, etc.)
            if (payload.new.balance !== payload.old.balance) {
              console.log('✅ UPDATING BALANCE FROM', payload.old.balance, 'TO', payload.new.balance);
              console.log('💰 Balance change detected - updating user data');
              setUserData(prev => {
                if (!prev) return null;
                const updated = {
                  ...prev,
                  balance: payload.new.balance,
                  username: payload.new.username,
                  badges: payload.new.badges,
                };
                console.log('💰 Updated user data:', { oldBalance: prev.balance, newBalance: updated.balance });
                return updated;
              });
            } else {
              console.log('ℹ️ Profile update received but balance unchanged');
            }
          } else {
            console.log('⚠️ Profile update missing old or new data');
          }
        }
      )
      .subscribe((status) => {
        console.log('📊 Comprehensive stats subscription status:', status);
      });

    // Additional dedicated balance subscription for maximum reliability
    const balanceChannel = supabase
      .channel(`balance_updates_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('🏦 DEDICATED BALANCE UPDATE:', payload);
          
          if (payload.new && payload.new.balance !== undefined) {
            console.log('💰 BALANCE SYNC: Updating balance to', payload.new.balance);
            setUserData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                balance: payload.new.balance,
                username: payload.new.username || prev.username,
                badges: payload.new.badges || prev.badges,
              };
            });
          }
        }
      )
      .subscribe();

    // Periodic balance refresh to ensure sync (every 10 seconds)
    const balanceRefreshInterval = setInterval(async () => {
      try {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        if (currentProfile) {
          setUserData(prev => {
            if (!prev) return null;
            if (prev.balance !== currentProfile.balance) {
              console.log('🔄 PERIODIC BALANCE SYNC:', prev.balance, '→', currentProfile.balance);
              return {
                ...prev,
                balance: currentProfile.balance,
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error in periodic balance refresh:', error);
      }
    }, 5000); // Every 5 seconds

    return () => {
      console.log('🧹 Cleaning up comprehensive stats subscription');
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(balanceChannel);
      clearInterval(balanceRefreshInterval);
    };
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) return

    console.log('🔍 Fetching user profile for user ID:', user.id);

    try {
      // Fetch profile for basic info and balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('📊 Profile fetch result:', { profile, profileError });

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        // Don't throw error, just return null to prevent crashes
        setUserData(null);
        setLoading(false);
        return;
      }

      // Fetch comprehensive level stats from user_level_stats (primary source of truth)
      const { data: levelStats, error: levelStatsError } = await supabase
        .from('user_level_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('📈 Level stats fetch result:', { levelStats, levelStatsError });

      // If no level stats exist, create them
      if (levelStatsError && levelStatsError.code === 'PGRST116') {
        console.log('🆕 Creating initial user level stats for user:', user.id);
        const { data: newLevelStats, error: createError } = await supabase
          .from('user_level_stats')
          .insert({ user_id: user.id })
          .select('*')
          .single();
        
        if (createError) {
          console.error('Error creating level stats:', createError);
          throw createError;
        }
        
        // Use the newly created stats
        const userProfile: UserProfile = {
          ...profile,
          // Use level stats as primary source for level/XP data
          current_level: newLevelStats.current_level,
          current_xp: newLevelStats.current_level_xp,
          xp_to_next_level: newLevelStats.xp_to_next_level,
          lifetime_xp: newLevelStats.lifetime_xp,
          total_wagered: newLevelStats.total_wagered,
          total_profit: newLevelStats.total_profit,
          gameStats: {
            coinflip: {
              wins: newLevelStats.coinflip_wins,
              losses: Math.max(0, newLevelStats.coinflip_games - newLevelStats.coinflip_wins),
              profit: newLevelStats.coinflip_profit,
            },
            crash: {
              wins: newLevelStats.crash_wins,
              losses: Math.max(0, newLevelStats.crash_games - newLevelStats.crash_wins),
              profit: newLevelStats.crash_profit,
            },
            roulette: {
              wins: newLevelStats.roulette_wins,
              losses: Math.max(0, newLevelStats.roulette_games - newLevelStats.roulette_wins),
              profit: newLevelStats.roulette_profit,
            },
            tower: {
              wins: newLevelStats.tower_wins,
              losses: Math.max(0, newLevelStats.tower_games - newLevelStats.tower_wins),
              profit: newLevelStats.tower_profit,
            },
          },
        };
        
        setUserData(userProfile);
        return;
      }

      if (levelStatsError) {
        console.error('❌ Error fetching level stats:', levelStatsError);
        // Don't throw error, just continue with profile data only
        console.log('⚠️ Continuing with profile data only');
      }

      // Combine profile data with level stats (level stats takes precedence)
      const userProfile: UserProfile = {
        ...profile,
        // Use level stats as primary source for level/XP data
        current_level: levelStats.current_level,
        current_xp: levelStats.current_level_xp,
        xp_to_next_level: levelStats.xp_to_next_level,
        lifetime_xp: levelStats.lifetime_xp,
        total_wagered: levelStats.total_wagered,
        total_profit: levelStats.total_profit,
        gameStats: {
          coinflip: {
            wins: levelStats.coinflip_wins,
            losses: Math.max(0, levelStats.coinflip_games - levelStats.coinflip_wins),
            profit: levelStats.coinflip_profit,
          },
          crash: {
            wins: levelStats.crash_wins,
            losses: Math.max(0, levelStats.crash_games - levelStats.crash_wins),
            profit: levelStats.crash_profit,
          },
          roulette: {
            wins: levelStats.roulette_wins,
            losses: Math.max(0, levelStats.roulette_games - levelStats.roulette_wins),
            profit: levelStats.roulette_profit,
          },
          tower: {
            wins: levelStats.tower_wins,
            losses: Math.max(0, levelStats.tower_games - levelStats.tower_wins),
            profit: levelStats.tower_profit,
          },
        },
      };

      setUserData(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userData) return

    try {
      // Only update profile table for profile-specific data (balance, username, badges)
      const profileUpdates: any = {};
      if (updates.balance !== undefined) profileUpdates.balance = updates.balance;
      if (updates.username !== undefined) profileUpdates.username = updates.username;
      if (updates.badges !== undefined) profileUpdates.badges = updates.badges;
      if (updates.last_claim_time !== undefined) profileUpdates.last_claim_time = updates.last_claim_time;
      
      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString();
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Note: Level, XP, and game stats are now managed by the trigger system
      // They are automatically updated in user_level_stats when games are played
      // No manual updates needed here

      // Refresh profile data to get latest state
      await fetchUserProfile();
      
      // Additional force balance sync if balance was updated
      if (updates.balance !== undefined) {
        console.log('💰 Force syncing balance after manual update');
        setTimeout(async () => {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', user.id)
            .single();

          if (currentProfile) {
            setUserData(prev => {
              if (!prev) return null;
              if (prev.balance !== currentProfile.balance) {
                console.log('🔄 POST-UPDATE BALANCE SYNC:', prev.balance, '→', currentProfile.balance);
                return {
                  ...prev,
                  balance: currentProfile.balance,
                };
              }
              return prev;
            });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  return {
    userData,
    loading,
    updateUserProfile,
    refetch: fetchUserProfile,
  }
}
