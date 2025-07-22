import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CaseReward {
  id: string;
  user_id: string;
  level_unlocked: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'pending';
  reward_amount: number;
  opened_at: string | null;
  created_at: string;
}

export function useCaseRewards() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseReward[]>([]);
  const [availableCases, setAvailableCases] = useState<CaseReward[]>([]);
  const [openedCases, setOpenedCases] = useState<CaseReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCases([]);
      setAvailableCases([]);
      setOpenedCases([]);
      setLoading(false);
      return;
    }

    fetchCases();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('case_rewards_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_rewards',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const fetchCases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('case_rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCases(data as CaseReward[] || []);
      setAvailableCases((data as CaseReward[] || []).filter(c => c.rarity === 'pending'));
      setOpenedCases((data as CaseReward[] || []).filter(c => c.rarity !== 'pending' && c.opened_at));
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCase = async (caseId: string, rarity: 'common' | 'rare' | 'epic' | 'legendary', rewardAmount: number) => {
    try {
      const { error } = await supabase
        .from('case_rewards')
        .update({
          rarity,
          reward_amount: rewardAmount,
          opened_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (error) throw error;

      // Update user balance and case counts
      if (user) {
        // First get current values
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance, total_cases_opened, available_cases')
          .eq('id', user.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              balance: profile.balance + rewardAmount,
              total_cases_opened: profile.total_cases_opened + 1,
              available_cases: Math.max(0, profile.available_cases - 1)
            })
            .eq('id', user.id);
        }
      }

      // Refresh cases
      await fetchCases();
    } catch (error) {
      console.error('Error opening case:', error);
      throw error;
    }
  };

  return {
    cases,
    availableCases,
    openedCases,
    loading,
    openCase,
    refetch: fetchCases
  };
}