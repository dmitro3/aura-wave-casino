import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LevelUpNotification {
  id: string;
  oldLevel: number;
  newLevel: number;
  casesEarned: number;
  borderTierChanged: boolean;
  newBorderTier: number;
}

export function useLevelUpNotifications() {
  const { user } = useAuth();
  const [notification, setNotification] = useState<LevelUpNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for level-up notifications
    const subscription = supabase
      .channel('level_up_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new;
          
          // Handle both level-up notification types
          if ((notification.type === 'level_reward_case' || notification.type === 'level_up') && notification.data) {
            const data = notification.data;
            
            // For level_reward_case, we have case data
            if (notification.type === 'level_reward_case') {
              setNotification({
                id: notification.id,
                oldLevel: data.old_level || (data.new_level - 1),
                newLevel: data.new_level,
                casesEarned: data.cases_earned || 0,
                borderTierChanged: data.border_changed || false,
                newBorderTier: data.new_border_tier || 1
              });
            }
            // For general level_up, we don't have cases but still show celebration
            else if (notification.type === 'level_up') {
              setNotification({
                id: notification.id,
                oldLevel: data.old_level || (data.new_level - 1),
                newLevel: data.new_level,
                casesEarned: 0,
                borderTierChanged: data.border_changed || false,
                newBorderTier: data.new_border_tier || 1
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const dismissNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    dismissNotification
  };
}