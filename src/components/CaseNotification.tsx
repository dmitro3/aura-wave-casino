import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Sparkles, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CaseOpeningModal } from './CaseOpeningModal';
import { useToast } from '@/hooks/use-toast';

interface CaseNotificationProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    created_at: string;
    is_read: boolean;
  };
  onRefresh: () => void;
}

interface CaseReward {
  id: string;
  level_unlocked: number;
  rarity: string;
  reward_amount: number;
  opened_at: string | null;
  user_id: string;
}

export function CaseNotification({ notification, onRefresh }: CaseNotificationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [availableCases, setAvailableCases] = useState<CaseReward[]>([]);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseReward | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAvailableCases = async () => {
    if (!user || !notification.data?.new_level) return;

    try {
      const { data: cases, error } = await supabase
        .from('case_rewards')
        .select('*')
        .eq('user_id', user.id)
        .eq('level_unlocked', notification.data.new_level)
        .is('opened_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAvailableCases(cases || []);
    } catch (error) {
      console.error('Error fetching available cases:', error);
    }
  };

  useEffect(() => {
    fetchAvailableCases();
  }, [user, notification]);

  const handleOpenCase = (caseReward: CaseReward) => {
    setSelectedCase(caseReward);
    setShowCaseModal(true);
  };

  const handleCaseOpened = async () => {
    // Refresh the available cases and notification list
    await fetchAvailableCases();
    onRefresh();
    setShowCaseModal(false);
    setSelectedCase(null);
    
    toast({
      title: "Case Opened!",
      description: "Your reward has been added to your balance.",
    });
  };

  const handleOpenAllCases = async () => {
    if (availableCases.length === 0) return;
    
    setLoading(true);
    try {
      let totalReward = 0;
      const openedCases = [];

      for (const caseReward of availableCases) {
        // Generate random reward for each case
        const rarityRandom = Math.random() * 100;
        let rarity = 'common';
        let rewardRange = { min: 2, max: 5 };

        if (rarityRandom <= 3) {
          rarity = 'legendary';
          rewardRange = { min: 101, max: 500 };
        } else if (rarityRandom <= 15) {
          rarity = 'epic';
          rewardRange = { min: 21, max: 100 };
        } else if (rarityRandom <= 40) {
          rarity = 'rare';
          rewardRange = { min: 6, max: 20 };
        }

        const amount = Math.floor(Math.random() * (rewardRange.max - rewardRange.min + 1)) + rewardRange.min;
        totalReward += amount;

        // Update case in database
        const { error: updateError } = await supabase
          .from('case_rewards')
          .update({
            rarity,
            reward_amount: amount,
            opened_at: new Date().toISOString()
          })
          .eq('id', caseReward.id);

        if (updateError) throw updateError;
        openedCases.push({ ...caseReward, rarity, reward_amount: amount });
      }

      // Update user balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, total_cases_opened, available_cases')
        .eq('id', user!.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ 
            balance: profile.balance + totalReward,
            total_cases_opened: profile.total_cases_opened + availableCases.length,
            available_cases: Math.max(0, profile.available_cases - availableCases.length)
          })
          .eq('id', user!.id);
      }

      await fetchAvailableCases();
      onRefresh();

      toast({
        title: `All Cases Opened! 🎉`,
        description: `You won a total of $${totalReward} from ${availableCases.length} cases!`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Error opening all cases:', error);
      toast({
        title: 'Error',
        description: 'Failed to open cases. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (notification.type !== 'level_reward_case') return null;

  const levelData = notification.data;
  const hasAvailableCases = availableCases.length > 0;

  return (
    <>
      <Card className="glass border-primary/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <Gift className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium flex items-center gap-1">
                  {notification.title}
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </p>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Level {levelData.new_level}
            </Badge>
          </div>

          {hasAvailableCases ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Available cases: {availableCases.length}
                </span>
                <Badge variant="outline" className="border-green-500 text-green-700">
                  <Star className="w-3 h-3 mr-1" />
                  Ready to open
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleOpenCase(availableCases[0])}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-primary/80 to-accent/80 hover:from-primary hover:to-accent text-white shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                >
                  <Gift className="w-4 h-4 mr-1" />
                  Open Case
                </Button>
                
                {availableCases.length > 1 && (
                  <Button
                    onClick={handleOpenAllCases}
                    size="sm"
                    variant="outline"
                    disabled={loading}
                    className="border-primary/50 text-primary hover:text-primary/80 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                  >
                    Open All ({availableCases.length})
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <Badge variant="outline" className="border-gray-400 text-gray-600">
                All cases opened
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {showCaseModal && selectedCase && (
        <CaseOpeningModal
          isOpen={showCaseModal}
          onClose={() => setShowCaseModal(false)}
          caseId={selectedCase.id}
          level={selectedCase.level_unlocked}
          onCaseOpened={handleCaseOpened}
        />
      )}
    </>
  );
}