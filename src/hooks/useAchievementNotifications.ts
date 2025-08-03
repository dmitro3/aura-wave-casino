import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLevelStats } from './useUserLevelStats';
import { useToast } from '@/hooks/use-toast';

interface ClaimableAchievement {
  id: string;
  name: string;
  description: string;
  rarity: string;
  reward_amount: number;
  reward_type: string;
}

export function useAchievementNotifications() {
  const { user } = useAuth();
  const { stats } = useUserLevelStats();
  const { toast } = useToast();
  const [claimableAchievements, setClaimableAchievements] = useState<ClaimableAchievement[]>([]);
  const [hasNewClaimable, setHasNewClaimable] = useState(false);
  const [fullStats, setFullStats] = useState<any>(null);
  const lastStatsRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateProgress = (achievement: any, userStats: any): number => {
    if (!userStats) return 0;
    
    const criteria = achievement.criteria; // Use 'criteria' field from database
    const criteriaType = criteria?.type;
    const targetValue = criteria?.value || 0;

    let currentValue = 0;
    
    switch (criteriaType) {
      case 'total_games': currentValue = userStats.total_games || 0; break;
      case 'total_wins': currentValue = userStats.total_wins || 0; break;
      case 'total_profit': currentValue = userStats.total_profit || 0; break;
      case 'total_wagered': currentValue = userStats.total_wagered || 0; break;
      case 'roulette_games': currentValue = userStats.roulette_games || 0; break;
      case 'roulette_wins': currentValue = userStats.roulette_wins || 0; break;
      case 'roulette_green_wins': currentValue = userStats.roulette_green_wins || 0; break;
      case 'roulette_biggest_win': currentValue = userStats.roulette_highest_win || 0; break;
      case 'tower_games': currentValue = userStats.tower_games || 0; break;
      case 'tower_highest_level': currentValue = userStats.tower_highest_level || 0; break;
      case 'tower_perfect_games': currentValue = userStats.tower_perfect_games || 0; break;
      case 'coinflip_wins': currentValue = userStats.coinflip_wins || 0; break;
      case 'total_cases_opened': currentValue = userStats.total_cases_opened || 0; break;
      default: currentValue = 0;
    }

    return Math.min(100, (currentValue / targetValue) * 100);
  };

  // Fetch comprehensive stats for achievement checking
  const fetchFullStats = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_level_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching full stats for achievements:', error);
      return null;
    }
  };

  const checkForClaimableAchievements = async (useFullStats?: any) => {
    const statsToUse = useFullStats || fullStats || stats;
    if (!user || !statsToUse) return;

    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*');

      if (achievementsError) throw achievementsError;

      // Fetch user's unlocked achievements
      const { data: unlockedAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (userError) throw userError;

      // Find achievements that are ready to claim
      const claimable = (allAchievements || []).filter(achievement => {
        const isAlreadyUnlocked = (unlockedAchievements || []).some(ua => ua.achievement_id === achievement.id);
        if (isAlreadyUnlocked) return false;
        
        const progress = calculateProgress(achievement, statsToUse);
        return progress >= 100;
      });

      const previousCount = claimableAchievements.length;
      const newlyClaimable = claimable.filter(achievement => 
        !claimableAchievements.some(existing => existing.id === achievement.id)
      );

      setClaimableAchievements(claimable);
      
      // Show notification and toast if new achievements are ready
      if (newlyClaimable.length > 0) {
        setHasNewClaimable(true);
        
        // Show toast notification for new achievements
        newlyClaimable.forEach(achievement => {
          toast({
            title: "🏆 Achievement Ready!",
            description: `"${achievement.name}" is ready to claim! Check your profile.`,
            duration: 6000,
          });
        });
      }
    } catch (error) {
      console.error('Error checking claimable achievements:', error);
    }
  };

  // Polling function to check for stats changes
  const pollForStatsChanges = async () => {
    if (!user) return;

    const newFullStats = await fetchFullStats();
    if (!newFullStats) return;

    const newStatsString = JSON.stringify(newFullStats);
    if (newStatsString !== lastStatsRef.current) {
      // Stats changed, update and check achievements
      setFullStats(newFullStats);
      lastStatsRef.current = newStatsString;
      
      // Check for claimable achievements with the new stats
      await checkForClaimableAchievements(newFullStats);
    }
  };

  useEffect(() => {
    if (!user) {
      setFullStats(null);
      setClaimableAchievements([]);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch and check
    const initializeAchievements = async () => {
      const initialStats = await fetchFullStats();
      if (initialStats) {
        setFullStats(initialStats);
        lastStatsRef.current = JSON.stringify(initialStats);
        await checkForClaimableAchievements(initialStats);
      }
    };

    initializeAchievements();

    // Set up polling every 3 seconds to check for stats changes
    intervalRef.current = setInterval(pollForStatsChanges, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);

  // Also check when basic stats change (from the existing hook)
  useEffect(() => {
    if (stats && fullStats) {
      checkForClaimableAchievements();
    }
  }, [stats]);

  const dismissNotification = () => {
    setHasNewClaimable(false);
  };

  return {
    claimableAchievements,
    hasNewClaimable,
    dismissNotification,
    checkForClaimableAchievements
  };
}