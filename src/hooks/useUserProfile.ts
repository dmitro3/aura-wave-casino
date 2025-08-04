
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  id: string
  username: string
  registration_date: string
  balance: number
  last_claim_time: string
  badges: string[]
  avatar_url?: string | null
  // Level and XP data comes from user_level_stats
  levelStats?: {
    current_level: number
    current_level_xp: number
    lifetime_xp: number
    xp_to_next_level: number
    border_tier: number
  }
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

    // Set up real-time balance subscription for instant updates
            // Setting up real-time balance subscription
    
    fetchUserProfile()
    
    // Real-time subscription for instant balance updates
    const balanceSubscription = supabase
      .channel(`balance_updates_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new?.balance !== undefined) {
            console.log('💰 REAL-TIME BALANCE UPDATE:', payload);
            const newBalance = parseFloat(payload.new.balance);
            setUserData((prev) => {
              if (prev && prev.balance !== newBalance) {
                console.log('⚡ INSTANT BALANCE SYNC:', prev.balance, '→', newBalance);
                return { ...prev, balance: newBalance };
              }
              return prev;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Balance subscription status:', status);
      });

    return () => {
              // Cleaning up balance subscription
      supabase.removeChannel(balanceSubscription);
    };
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) {
      return;
    }

    try {
      // Fetching profile silently
      
      // Fetch profile (without level/XP data)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          registration_date,
          balance,
          last_claim_time,
          badges,
          created_at,
          updated_at
        `)
        .eq('id', user.id)
        .single();

      let finalProfile;
      
      if (profileError) {
        console.error('[useUserProfile] Error fetching profile:', profileError);
        
        // Try to create profile manually if it doesn't exist
        console.log('[useUserProfile] Attempting to create profile manually...');
        const { data: manualProfile, error: manualError } = await supabase
          .rpc('create_user_profile_manual', {
            user_id: user.id,
            username: user.user_metadata?.username || 'User' + user.id.substring(0, 8)
          });
        
        if (manualError) {
          console.error('[useUserProfile] Failed to create profile manually:', manualError);
          setUserData(null);
          setLoading(false);
          return;
        }
        
        // Try fetching profile again
        const { data: retryProfile, error: retryError } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            registration_date,
            balance,
            last_claim_time,
            badges,
            created_at,
            updated_at
          `)
          .eq('id', user.id)
          .single();
        
        if (retryError) {
          console.error('[useUserProfile] Still cannot fetch profile after creation:', retryError);
          setUserData(null);
          setLoading(false);
          return;
        }
        
        // Use the retry profile
        finalProfile = retryProfile;
        console.log('[useUserProfile] Profile created and fetched successfully');
      } else {
        console.log('[useUserProfile] Profile fetched successfully');
        finalProfile = profile;
      }

      // Ensure user_level_stats exists for this user
      // Ensuring user_level_stats exists...
      const { error: ensureError } = await supabase
        .rpc('ensure_user_level_stats', { user_uuid: user.id });
      
      if (ensureError) {
        // Handle duplicate key constraint error gracefully
        if (ensureError.code === '23505' && ensureError.message?.includes('user_level_stats_user_id_key')) {
          // User level stats already exists
        } else {
          console.error('[useUserProfile] Error ensuring user level stats:', ensureError);
        }
              }
        // User level stats ensured

      // Fetch level stats
      let { data: levelStats, error: levelStatsError } = await supabase
        .from('user_level_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (levelStatsError) {
        console.error('[useUserProfile] Error fetching level stats:', levelStatsError);
        
        // Try to create stats if they don't exist
        if (levelStatsError.code === 'PGRST116') { // No rows returned
          console.log('[useUserProfile] No stats found, attempting to create...');
          const { data: statsResult, error: statsCreateError } = await supabase
            .rpc('ensure_user_level_stats', { user_uuid: user.id });
          
          if (statsCreateError) {
            console.error('[useUserProfile] Failed to create stats:', statsCreateError);
          } else {
            console.log('[useUserProfile] Stats created successfully');
            // Try fetching stats again
            const { data: retryStats, error: retryError } = await supabase
              .from('user_level_stats')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (!retryError && retryStats) {
              levelStats = retryStats;
            }
          }
        }
        
        // If still no stats, create a default profile with game stats
        if (!levelStats) {
          const profileWithGameStats = {
            ...finalProfile,
            levelStats: {
              current_level: 1,
              current_level_xp: 0,
              xp_to_next_level: 100,
              lifetime_xp: 0,
              border_tier: 1
            },
            gameStats: {
              coinflip: { wins: 0, losses: 0, profit: 0 },
              crash: { wins: 0, losses: 0, profit: 0 },
              roulette: { wins: 0, losses: 0, profit: 0 },
              tower: { wins: 0, losses: 0, profit: 0 },
            }
          };
          setUserData(profileWithGameStats);
          setLoading(false);
          return;
        }
      }

      // Level stats fetched successfully

      const combinedData = {
        ...finalProfile,
        levelStats: {
          current_level: levelStats?.current_level || 1,
          current_level_xp: levelStats?.current_level_xp || 0,
          lifetime_xp: levelStats?.lifetime_xp || 0,
          xp_to_next_level: levelStats?.xp_to_next_level || 100,
          border_tier: levelStats?.border_tier || 1
        },
        gameStats: {
          coinflip: {
            wins: levelStats?.coinflip_wins || 0,
            losses: Math.max(0, (levelStats?.coinflip_games || 0) - (levelStats?.coinflip_wins || 0)),
            profit: levelStats?.coinflip_profit || 0,
          },
          crash: {
            wins: levelStats?.crash_wins || 0,
            losses: Math.max(0, (levelStats?.crash_games || 0) - (levelStats?.crash_wins || 0)),
            profit: levelStats?.crash_profit || 0,
          },
          roulette: {
            wins: levelStats?.roulette_wins || 0,
            losses: Math.max(0, (levelStats?.roulette_games || 0) - (levelStats?.roulette_wins || 0)),
            profit: levelStats?.roulette_profit || 0,
          },
          tower: {
            wins: levelStats?.tower_wins || 0,
            losses: Math.max(0, (levelStats?.tower_games || 0) - (levelStats?.tower_wins || 0)),
            profit: levelStats?.tower_profit || 0,
          },
        }
      };

      // Combined data created successfully
      setUserData(combinedData);
      setLoading(false);
    } catch (error) {
      console.error('[useUserProfile] Unexpected error:', error);
      setUserData(null);
      setLoading(false);
    }
  };

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
