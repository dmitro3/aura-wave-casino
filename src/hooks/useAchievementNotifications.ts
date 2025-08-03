import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnlockedAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievements: {
    id: string;
    name: string;
    description: string;
    rarity: string;
    reward_amount: number;
    reward_type: string;
  };
}

export function useAchievementNotifications() {
  const { user } = useAuth();
  const [claimableAchievements, setClaimableAchievements] = useState<UnlockedAchievement[]>([]);
  const [hasNewClaimable, setHasNewClaimable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnlockedAchievements = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('unlocked_achievements')
        .select(`
          id,
          achievement_id,
          unlocked_at,
          achievements (
            id,
            name,
            description,
            rarity,
            reward_amount,
            reward_type
          )
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error('Error fetching unlocked achievements:', error);
        return;
      }

      const previousCount = claimableAchievements.length;
      setClaimableAchievements(data || []);
      
      // Show notification if new achievements are ready
      if ((data?.length || 0) > previousCount) {
        setHasNewClaimable(true);
      }


    } catch (error) {
      console.error('Error fetching unlocked achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnlockedAchievements();
  }, [user]);

  // Set up real-time subscription for unlocked_achievements
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('unlocked_achievements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unlocked_achievements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          fetchUnlockedAchievements();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const dismissNotification = () => {
    setHasNewClaimable(false);
  };

  return {
    claimableAchievements,
    hasNewClaimable,
    dismissNotification,
    isLoading,
    refetch: fetchUnlockedAchievements
  };
}