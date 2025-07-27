
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gift, Clock, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/hooks/useUserProfile';

interface RewardsPanelProps {
  userData: UserProfile;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

export default function RewardsPanel({ userData, onUpdateUser }: RewardsPanelProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const CLAIM_COOLDOWN = 20000; // 20 seconds
  const CLAIM_AMOUNT = 100;

  useEffect(() => {
    const updateTimer = () => {
      if (!userData) return;

      const now = Date.now();
      const lastClaim = new Date(userData.last_claim_time).getTime();
      const timeSinceClaim = now - lastClaim;
      
      if (timeSinceClaim >= CLAIM_COOLDOWN) {
        setCanClaim(true);
        setTimeLeft(0);
      } else {
        setCanClaim(false);
        setTimeLeft(CLAIM_COOLDOWN - timeSinceClaim);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  const handleClaim = async () => {
    if (!canClaim || !userData || isUpdating) return;

    const bonusMessages = [
      "You've earned your coffee bonus! ☕",
      "Digital coins rain from the sky! 🌧️",
      "The casino vault opens up! 💰",
      "Your patience has been rewarded! ⏰",
      "Lucky you! Free credits incoming! 🍀"
    ];

    const randomMessage = bonusMessages[Math.floor(Math.random() * bonusMessages.length)];

    setIsUpdating(true);
    try {
      await onUpdateUser({
        balance: userData.balance + CLAIM_AMOUNT,
        last_claim_time: new Date().toISOString(),
        xp: userData.xp + 10 // Small XP bonus for claiming
      });

      toast({
        title: "Reward Claimed!",
        description: `${randomMessage} +$${CLAIM_AMOUNT}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const progressPercentage = timeLeft > 0 ? ((CLAIM_COOLDOWN - timeLeft) / CLAIM_COOLDOWN) * 100 : 100;

  return (
    <Card className="glass border-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Gift className="w-5 h-5 text-primary" />
          <span>Daily Rewards</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
            ${CLAIM_AMOUNT}
          </div>
          <p className="text-sm text-muted-foreground">
            Free credits every 20 seconds
          </p>
        </div>

        {!canClaim && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Next claim in:</span>
              </span>
              <span className="font-mono text-primary">{formatTime(timeLeft)}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        <Button
          onClick={handleClaim}
          disabled={!canClaim || isUpdating}
          className={`w-full transition-smooth ${
            canClaim && !isUpdating
              ? 'gradient-primary hover:glow-primary animate-pulse-glow'
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <Coins className="w-4 h-4 mr-2" />
          {isUpdating ? 'Claiming...' : canClaim ? 'Claim Reward' : `Wait ${formatTime(timeLeft)}`}
        </Button>

        <div className="text-xs text-center text-muted-foreground">
          Claiming rewards also gives you +10 XP!
        </div>
      </CardContent>
    </Card>
  );
}
