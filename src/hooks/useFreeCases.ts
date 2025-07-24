import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FreeCaseConfig {
  type: 'common' | 'rare' | 'epic';
  minAmount: number;
  maxAmount: number;
  cooldownMinutes: number;
  color: string;
  bgColor: string;
  icon: string;
  name: string;
}

export interface FreeCaseStatus {
  config: FreeCaseConfig;
  canClaim: boolean;
  nextClaimTime: Date | null;
  timeUntilClaim: number;
}

const FREE_CASE_CONFIGS: FreeCaseConfig[] = [
  {
    type: 'common',
    minAmount: 500,
    maxAmount: 2500,
    cooldownMinutes: 1,
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-100',
    icon: '💰',
    name: 'Common Case'
  },
  {
    type: 'rare',
    minAmount: 2500,
    maxAmount: 10000,
    cooldownMinutes: 5,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-100',
    icon: '💎',
    name: 'Rare Case'
  },
  {
    type: 'epic',
    minAmount: 10000,
    maxAmount: 50000,
    cooldownMinutes: 15,
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-100',
    icon: '⭐',
    name: 'Epic Case'
  }
];

export const useFreeCases = () => {
  const [caseStatuses, setCaseStatuses] = useState<FreeCaseStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCaseStatuses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const promises = FREE_CASE_CONFIGS.map(async (config) => {
        const { data: nextClaimTime } = await supabase.rpc(
          'get_next_free_case_claim_time',
          { p_user_id: user.id, p_case_type: config.type }
        );

        const now = new Date();
        const claimTime = nextClaimTime ? new Date(nextClaimTime) : now;
        const canClaim = claimTime <= now;
        const timeUntilClaim = Math.max(0, claimTime.getTime() - now.getTime());

        return {
          config,
          canClaim,
          nextClaimTime: canClaim ? null : claimTime,
          timeUntilClaim
        };
      });

      const statuses = await Promise.all(promises);
      setCaseStatuses(statuses);
    } catch (error) {
      console.error('Error fetching case statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimFreeCase = async (caseType: 'common' | 'rare' | 'epic') => {
    if (claiming) return;

    setClaiming(caseType);
    try {
      const { data, error } = await supabase.functions.invoke('claim-free-case', {
        body: { caseType }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: '🎉 Free Case Claimed!',
          description: `You received $${data.amount}! Added to your balance.`,
        });
        
        // Refresh case statuses
        await fetchCaseStatuses();
      } else {
        toast({
          title: 'Claim Failed',
          description: data.error || 'Unable to claim case at this time.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error claiming free case:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim free case. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setClaiming(null);
    }
  };

  const formatTimeUntil = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Ready!';
    
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  useEffect(() => {
    fetchCaseStatuses();
    
    // Update every second to show countdown
    const interval = setInterval(() => {
      setCaseStatuses(prev => 
        prev.map(status => {
          if (status.canClaim) return status;
          
          const now = new Date();
          const timeUntilClaim = Math.max(0, 
            (status.nextClaimTime?.getTime() || 0) - now.getTime()
          );
          
          return {
            ...status,
            timeUntilClaim,
            canClaim: timeUntilClaim <= 0
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    caseStatuses,
    loading,
    claiming,
    claimFreeCase,
    formatTimeUntil,
    refetch: fetchCaseStatuses
  };
};