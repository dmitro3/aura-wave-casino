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
          
          // Check if this is a level-up notification with case rewards
          if (notification.type === 'level_reward_case' && notification.data) {
            const data = notification.data;
            setNotification({
              id: notification.id,
              oldLevel: data.level - 1, // Approximate old level
              newLevel: data.level,
              casesEarned: data.cases_earned || 0,
              borderTierChanged: data.border_changed || false,
              newBorderTier: data.border_tier || 1
            });
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