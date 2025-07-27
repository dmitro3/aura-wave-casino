import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Star, Sparkles, Gift, X } from 'lucide-react';
import { EnhancedLevelBadge } from './EnhancedLevelBadge';
import { ProfileBorder } from './ProfileBorder';

interface LevelUpNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  oldLevel: number;
  casesEarned: number;
  borderTierChanged: boolean;
  newBorderTier?: number;
}

export const LevelUpNotificationModal = ({ 
  isOpen, 
  onClose, 
  newLevel, 
  oldLevel, 
  casesEarned,
  borderTierChanged,
  newBorderTier
}: LevelUpNotificationModalProps) => {
  const [show, setShow] = useState(false);
  const [currentDisplayLevel, setCurrentDisplayLevel] = useState(oldLevel);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setCurrentDisplayLevel(oldLevel);
      
      // Animate level counting up
      const levelDiff = newLevel - oldLevel;
      const duration = Math.min(levelDiff * 100, 2000); // Max 2 seconds
      const steps = Math.min(levelDiff, 20); // Max 20 steps
      const stepDuration = duration / steps;
      
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const progress = step / steps;
        const displayLevel = Math.floor(oldLevel + (levelDiff * progress));
        setCurrentDisplayLevel(Math.min(displayLevel, newLevel));
        
        if (step >= steps) {
          clearInterval(interval);
          setCurrentDisplayLevel(newLevel);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [isOpen, newLevel, oldLevel]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getSpecialMessage = (level: number) => {
    if (level >= 1000) return "🌟 ULTIMATE ASCENSION! 🌟";
    if (level >= 900) return "🔥 SUPREME BEING! 🔥";
    if (level >= 800) return "⚡ TRANSCENDENT! ⚡";
    if (level >= 700) return "🌌 UNIVERSAL GUARDIAN! 🌌";
    if (level >= 600) return "🌀 DIMENSIONAL LORD! 🌀";
    if (level >= 500) return "👑 INFERNAL OVERLORD! 👑";
    if (level >= 400) return "🔥 PHOENIX RISING! 🔥";
    if (level >= 300) return "✨ MITHRIL LIGHT! ✨";
    if (level >= 200) return "💎 DIAMOND RADIANCE! 💎";
    if (level >= 100) return "💚 EMERALD SHINE! 💚";
    if (level >= 75) return "🔥 GOLD FLAME! 🔥";
    if (level >= 50) return "⚡ STEEL GLOW! ⚡";
    if (level >= 25) return "✨ CHROME SILVER! ✨";
    return "🎉 LEVEL UP! 🎉";
  };

  const getLevelMilestoneReward = (level: number) => {
    if (level % 100 === 0) return "🎁 Century Milestone!";
    if (level % 50 === 0) return "⭐ Half-Century Achievement!";
    if (level % 25 === 0) return "🎯 Quarter-Century Reward!";
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`
          max-w-md mx-auto bg-gradient-to-br from-purple-900/95 to-pink-900/95 
          border-2 border-gradient-to-r from-purple-500 to-pink-500
          text-white backdrop-blur-sm
          ${show ? 'animate-scale-in' : 'animate-scale-out'}
        `}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-2 right-2 text-white hover:bg-white/20"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="space-y-6 p-4 text-center">
          {/* Celebration Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              {getSpecialMessage(newLevel)}
            </h1>
            
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
              <span className="text-lg">Level Up!</span>
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
          </div>

          {/* Level Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-300 mb-1">From</div>
                <EnhancedLevelBadge level={oldLevel} size="md" />
              </div>
              
              <Crown className="w-8 h-8 text-yellow-300 animate-pulse" />
              
              <div className="text-center">
                <div className="text-sm text-gray-300 mb-1">To</div>
                <EnhancedLevelBadge level={currentDisplayLevel} size="md" />
              </div>
            </div>

            {/* Current Level Animation */}
            <div className="text-3xl font-bold animate-pulse">
              Level {currentDisplayLevel.toLocaleString()}
            </div>
          </div>

          {/* Border Tier Upgrade */}
          {borderTierChanged && (
            <Card className="bg-gradient-to-r from-purple-800/50 to-pink-800/50 border-purple-400">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ProfileBorder level={newLevel} size="md">
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />
                  </ProfileBorder>
                  <div className="text-left">
                    <div className="font-semibold">Border Upgraded!</div>
                    <div className="text-sm text-gray-300">New exclusive border unlocked</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rewards Section */}
          {(casesEarned > 0 || getLevelMilestoneReward(newLevel)) && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Gift className="w-5 h-5" />
                Rewards Earned!
              </h3>

              {casesEarned > 0 && (
                <Card className="bg-gradient-to-r from-orange-800/50 to-red-800/50 border-orange-400">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Gift className="w-6 h-6 text-orange-300" />
                      <span className="font-semibold">
                        {casesEarned} Reward Case{casesEarned > 1 ? 's' : ''}!
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mt-1">
                      Check your notifications to open
                    </div>
                  </CardContent>
                </Card>
              )}

              {getLevelMilestoneReward(newLevel) && (
                <Card className="bg-gradient-to-r from-yellow-800/50 to-orange-800/50 border-yellow-400">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Star className="w-6 h-6 text-yellow-300" />
                      <span className="font-semibold">
                        {getLevelMilestoneReward(newLevel)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Floating Particles Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`
                  absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping
                  ${i % 4 === 0 ? 'top-1/4 left-1/4' : ''}
                  ${i % 4 === 1 ? 'top-1/4 right-1/4' : ''}
                  ${i % 4 === 2 ? 'bottom-1/4 left-1/4' : ''}
                  ${i % 4 === 3 ? 'bottom-1/4 right-1/4' : ''}
                `}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>

          {/* Continue Button */}
          <Button 
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-0"
          >
            Continue Playing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};