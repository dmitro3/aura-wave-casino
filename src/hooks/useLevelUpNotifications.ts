import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LevelUpNotification {
  id: string;
  oldLevel: number;
  newLevel: number;
  casesEarned: number;
  borderTierChanged: boolean;
  newBorderTier: number;
}

interface CaseReward {
  id: string;
  level_unlocked: number;
  rarity: string;
  reward_amount: number;
  opened_at: string | null;
}

export function useLevelUpNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notification, setNotification] = useState<LevelUpNotification | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Listen for level-up notifications
    const subscription = supabase
      .channel(`level_up_live_${user.id}`)
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
          
          // Avoid duplicate processing
          if (processedIds.has(notification.id)) return;
          
          if (notification.type === 'level_up' || notification.type === 'level_reward_case') {
            setProcessedIds(prev => new Set([...prev, notification.id]));
            
            const data = notification.data || {};
            
            // Show live toast notification for level up
            if (notification.type === 'level_up') {
              toast({
                title: `🎉 Level Up!`,
                description: `Congratulations! You reached level ${data.new_level}!`,
                duration: 4000,
              });
            }
            
            // Show live toast notification for case rewards
            if (notification.type === 'level_reward_case') {
              toast({
                title: `📦 Case Reward!`,
                description: `You earned a Level ${data.new_level} reward case! Check your notifications to open it.`,
                duration: 5000,
              });
              
              // Set notification for modal display
              setNotification({
                id: notification.id,
                oldLevel: data.old_level || (data.new_level - 1),
                newLevel: data.new_level,
                casesEarned: data.cases_earned || 1,
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
  }, [user, toast, processedIds]);

  const dismissNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    dismissNotification
  };
}