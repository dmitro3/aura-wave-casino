import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Gift, DollarSign, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CaseOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  level: number;
  onCaseOpened: (reward: CaseReward) => void;
}

interface CaseReward {
  id: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  reward_amount: number;
  level_unlocked: number;
}

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-orange-400 to-orange-600'
};

const rarityDropRates = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3
};

const rewardRanges = {
  common: { min: 2, max: 5 },
  rare: { min: 6, max: 20 },
  epic: { min: 21, max: 100 },
  legendary: { min: 101, max: 500 }
};

export const CaseOpeningModal = ({ isOpen, onClose, caseId, level, onCaseOpened }: CaseOpeningModalProps) => {
  const [isOpening, setIsOpening] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState<CaseReward | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'spinning' | 'revealing' | 'complete'>('spinning');
  const { toast } = useToast();

  const generateReward = (): { rarity: CaseReward['rarity']; amount: number } => {
    const random = Math.random() * 100;
    let rarity: CaseReward['rarity'] = 'common';
    
    if (random <= rarityDropRates.legendary) {
      rarity = 'legendary';
    } else if (random <= rarityDropRates.legendary + rarityDropRates.epic) {
      rarity = 'epic';
    } else if (random <= rarityDropRates.legendary + rarityDropRates.epic + rarityDropRates.rare) {
      rarity = 'rare';
    } else {
      rarity = 'common';
    }

    const range = rewardRanges[rarity];
    const amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    
    return { rarity, amount };
  };

  const openCase = async () => {
    setIsOpening(true);
    setAnimationPhase('spinning');

    try {
      // Generate reward
      const { rarity, amount } = generateReward();

      // Simulate opening animation
      setTimeout(() => {
        setAnimationPhase('revealing');
      }, 2000);

      setTimeout(async () => {
        try {
          // Update case in database
          const { data: updatedCase, error: updateError } = await supabase
            .from('case_rewards')
            .update({
              rarity,
              reward_amount: amount,
              opened_at: new Date().toISOString()
            })
            .eq('id', caseId)
            .select()
            .single();

          if (updateError) throw updateError;

          // Update user balance directly
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // First get current balance
            const { data: profile } = await supabase
              .from('profiles')
              .select('balance, total_cases_opened, available_cases')
              .eq('id', user.id)
              .single();

            if (profile) {
              await supabase
                .from('profiles')
                .update({ 
                  balance: profile.balance + amount,
                  total_cases_opened: profile.total_cases_opened + 1,
                  available_cases: Math.max(0, profile.available_cases - 1)
                })
                .eq('id', user.id);
            }
          }

          setReward(updatedCase as CaseReward);
          setAnimationPhase('complete');
          setShowReward(true);
          onCaseOpened(updatedCase as CaseReward);

          toast({
            title: `${rarity.toUpperCase()} Reward!`,
            description: `You won $${amount}!`,
            variant: 'default'
          });

        } catch (error) {
          console.error('Error opening case:', error);
          toast({
            title: 'Error',
            description: 'Failed to open case. Please try again.',
            variant: 'destructive'
          });
        }
      }, 4000);

    } catch (error) {
      console.error('Error opening case:', error);
      toast({
        title: 'Error',
        description: 'Failed to open case. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsOpening(false);
    }
  };

  const handleClose = () => {
    setShowReward(false);
    setReward(null);
    setAnimationPhase('spinning');
    setIsOpening(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setShowReward(false);
      setReward(null);
      setAnimationPhase('spinning');
      setIsOpening(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto bg-background border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Gift className="w-5 h-5" />
            Level {level} Reward Case
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute top-2 right-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {!showReward ? (
            <div className="text-center space-y-4">
              {/* Case Animation */}
              <div className="relative mx-auto w-32 h-32">
                <Card className={`
                  w-full h-full flex items-center justify-center
                  ${animationPhase === 'spinning' ? 'animate-pulse' : ''}
                  ${animationPhase === 'revealing' ? 'animate-bounce' : ''}
                  bg-gradient-to-br from-purple-500 to-pink-500
                `}>
                  <CardContent className="p-0">
                    {animationPhase === 'spinning' && (
                      <Gift className="w-16 h-16 text-white animate-spin" />
                    )}
                    {animationPhase === 'revealing' && (
                      <Sparkles className="w-16 h-16 text-white animate-pulse" />
                    )}
                  </CardContent>
                </Card>
                
                {animationPhase === 'spinning' && (
                  <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-20 animate-pulse" />
                )}
              </div>

              {animationPhase === 'spinning' && !isOpening && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Open your Level {level} reward case!
                  </p>
                  <Button 
                    onClick={openCase}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Open Case
                  </Button>
                </div>
              )}

              {animationPhase === 'spinning' && isOpening && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Opening case...
                </p>
              )}

              {animationPhase === 'revealing' && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Revealing reward...
                </p>
              )}
            </div>
          ) : reward && (
            <div className="text-center space-y-4">
              {/* Reward Display */}
              <div className={`
                mx-auto w-32 h-32 rounded-full flex items-center justify-center
                bg-gradient-to-br ${rarityColors[reward.rarity]}
                border-4 border-white shadow-2xl animate-pulse
              `}>
                <div className="text-center text-white">
                  <DollarSign className="w-8 h-8 mx-auto mb-1" />
                  <div className="text-xl font-bold">${reward.reward_amount}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className={`
                  text-xl font-bold capitalize
                  ${reward.rarity === 'common' ? 'text-gray-600' : ''}
                  ${reward.rarity === 'rare' ? 'text-blue-600' : ''}
                  ${reward.rarity === 'epic' ? 'text-purple-600' : ''}
                  ${reward.rarity === 'legendary' ? 'text-orange-600' : ''}
                `}>
                  {reward.rarity} Reward!
                </h3>
                <p className="text-muted-foreground">
                  You won ${reward.reward_amount}!
                </p>
              </div>

              <Button 
                onClick={handleClose}
                className="w-full"
              >
                Continue Playing
              </Button>
            </div>
          )}

          {/* Drop Rates Info */}
          {!showReward && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-semibold">Drop Rates:</div>
              <div>🩶 Common (60%): $2-$5</div>
              <div>🔵 Rare (25%): $6-$20</div>
              <div>🟣 Epic (12%): $21-$100</div>
              <div>🟠 Legendary (3%): $101-$500+</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};