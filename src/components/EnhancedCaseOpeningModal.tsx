import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Gift, DollarSign, X, Crown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnhancedCaseOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  level: number;
  onCaseOpened: (reward: CaseReward) => void;
}

interface CaseReward {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  amount: number;
  level: number;
  animationType: string;
  caseId: string;
}

interface SpinnerItem {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  glow: string;
}

const rarityConfig = {
  common: {
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-600',
    glow: 'shadow-gray-500/50',
    bgColor: 'bg-gray-100',
    particles: '✨'
  },
  rare: {
    color: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-600',
    glow: 'shadow-blue-500/50',
    bgColor: 'bg-blue-100',
    particles: '💫'
  },
  epic: {
    color: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-600',
    glow: 'shadow-purple-500/50',
    bgColor: 'bg-purple-100',
    particles: '🌟'
  },
  legendary: {
    color: 'from-orange-400 to-orange-600',
    textColor: 'text-orange-600',
    glow: 'shadow-orange-500/50',
    bgColor: 'bg-orange-100',
    particles: '🔥'
  }
};

// Generate spinner items for the carousel effect
const generateSpinnerItems = (count: number): SpinnerItem[] => {
  const items: SpinnerItem[] = [];
  const rarities: (keyof typeof rarityConfig)[] = ['common', 'rare', 'epic', 'legendary'];
  
  for (let i = 0; i < count; i++) {
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    items.push({
      rarity,
      color: rarityConfig[rarity].color,
      glow: rarityConfig[rarity].glow
    });
  }
  return items;
};

export const EnhancedCaseOpeningModal = ({ 
  isOpen, 
  onClose, 
  caseId, 
  level, 
  onCaseOpened 
}: EnhancedCaseOpeningModalProps) => {
  const [phase, setPhase] = useState<'ready' | 'opening' | 'spinning' | 'revealing' | 'complete'>('ready');
  const [reward, setReward] = useState<CaseReward | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [spinnerItems] = useState(() => generateSpinnerItems(50));
  const [selectedIndex, setSelectedIndex] = useState(25); // Center position
  const { toast } = useToast();

  const openCase = async () => {
    if (isLocked) return;
    
    setIsLocked(true);
    setPhase('opening');

    try {
      // Call secure server-side case opening
      const { data, error } = await supabase.functions.invoke('case-opening-engine', {
        body: { caseId, level }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const rewardData = data.reward as CaseReward;
      
      // Start spinning animation
      setTimeout(() => {
        setPhase('spinning');
        
        // Create suspenseful spinner effect
        let spinSpeed = 50;
        let currentIndex = 0;
        
        const spinInterval = setInterval(() => {
          currentIndex = (currentIndex + 1) % spinnerItems.length;
          setSelectedIndex(currentIndex);
          
          // Gradually slow down
          spinSpeed += 5;
          if (spinSpeed > 200) {
            clearInterval(spinInterval);
            
            // Set the winning item based on rarity
            const winningItem: SpinnerItem = {
              rarity: rewardData.rarity,
              color: rarityConfig[rewardData.rarity].color,
              glow: rarityConfig[rewardData.rarity].glow
            };
            
            // Update the center item to be the winning reward
            spinnerItems[25] = winningItem;
            setSelectedIndex(25);
            
            setTimeout(() => {
              setPhase('revealing');
              setReward(rewardData);
              
              setTimeout(() => {
                setPhase('complete');
                onCaseOpened(rewardData);
              }, 1500);
            }, 1000);
          }
        }, spinSpeed);
      }, 1000);

    } catch (error) {
      console.error('Error opening case:', error);
      toast({
        title: 'Error',
        description: 'Failed to open case. Please try again.',
        variant: 'destructive'
      });
      setIsLocked(false);
      setPhase('ready');
    }
  };

  const handleClose = () => {
    if (isLocked && phase !== 'complete') return;
    
    setPhase('ready');
    setReward(null);
    setIsLocked(false);
    setSelectedIndex(25);
    onClose();
  };

  const getRewardRange = (level: number, rarity: string) => {
    const baseAmount = Math.max(1, level * 0.1);
    const multipliers = {
      common: { min: 0.5, max: 2.5 },
      rare: { min: 3, max: 12 },
      epic: { min: 15, max: 40 },
      legendary: { min: 50, max: 100 }
    };
    
    const config = multipliers[rarity as keyof typeof multipliers];
    return {
      min: Math.round(baseAmount * config.min),
      max: Math.round(baseAmount * config.max)
    };
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPhase('ready');
        setReward(null);
        setIsLocked(false);
        setSelectedIndex(25);
      }, 300);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl mx-auto bg-background border border-border overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Gift className="w-5 h-5" />
            Level {level} Case Opening
          </DialogTitle>
          {!isLocked && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-2 right-2"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Case Display */}
          {(phase === 'ready' || phase === 'opening') && (
            <div className="text-center space-y-6">
              <div className="relative mx-auto w-48 h-48">
                <Card className={`
                  w-full h-full flex items-center justify-center
                  ${phase === 'opening' ? 'animate-pulse' : ''}
                  gradient-primary border-2 border-primary/30
                  ${phase === 'opening' ? 'animate-bounce' : ''}
                `}>
                  <CardContent className="p-0">
                    <div className="text-center text-white">
                      <Gift className={`w-24 h-24 mx-auto mb-4 ${phase === 'opening' ? 'animate-spin' : ''}`} />
                      <div className="text-xl font-bold">Level {level}</div>
                      <div className="text-sm opacity-80">Reward Case</div>
                    </div>
                  </CardContent>
                </Card>
                
                {phase === 'opening' && (
                  <div className="absolute -inset-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-20 animate-ping" />
                )}
              </div>

              {phase === 'ready' && (
                <div className="space-y-4">
                  <p className="text-lg font-semibold">
                    Ready to open your Level {level} case?
                  </p>
                  <Button 
                    onClick={openCase}
                    disabled={isLocked}
                    className="w-full max-w-md mx-auto gradient-primary hover:glow-primary text-white text-lg py-6"
                  >
                    <Gift className="w-6 h-6 mr-3" />
                    Open Case
                  </Button>
                </div>
              )}

              {phase === 'opening' && (
                <p className="text-lg font-semibold animate-pulse">
                  Opening case... 🎲
                </p>
              )}
            </div>
          )}

          {/* Spinning Carousel */}
          {phase === 'spinning' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">🎰 SPINNING...</h3>
                <p className="text-muted-foreground">Determining your reward...</p>
              </div>
              
              <div className="relative h-32 overflow-hidden bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border-2 border-primary/30">
                {/* Selection indicator */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-yellow-400 z-10 shadow-lg shadow-yellow-400/50" />
                
                {/* Spinning items */}
                <div className="flex h-full items-center animate-pulse">
                  {spinnerItems.map((item, index) => (
                    <div
                      key={index}
                      className={`
                        flex-shrink-0 w-24 h-24 mx-1 rounded-lg
                        bg-gradient-to-br ${item.color}
                        ${index === selectedIndex ? `ring-4 ring-yellow-400 shadow-xl ${item.glow}` : ''}
                        flex items-center justify-center
                        ${Math.abs(index - selectedIndex) < 3 ? 'opacity-100' : 'opacity-50'}
                      `}
                      style={{
                        transform: `translateX(${(index - selectedIndex) * 100}px)`,
                        transition: 'all 0.1s ease-out'
                      }}
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Revealing Phase */}
          {phase === 'revealing' && reward && (
            <div className="text-center space-y-6">
              <div className="animate-bounce">
                <h3 className="text-3xl font-bold mb-4">🎉 REVEALING... 🎉</h3>
                <div className={`
                  mx-auto w-32 h-32 rounded-full flex items-center justify-center
                  bg-gradient-to-br ${rarityConfig[reward.rarity].color}
                  border-4 border-white shadow-2xl animate-pulse
                  ${rarityConfig[reward.rarity].glow}
                `}>
                  <Sparkles className="w-16 h-16 text-white animate-spin" />
                </div>
              </div>
            </div>
          )}

          {/* Final Reward Display */}
          {phase === 'complete' && reward && (
            <div className="text-center space-y-6">
              {/* Celebration Header */}
              <div className="space-y-2">
                {reward.rarity === 'legendary' && (
                  <div className="text-4xl animate-bounce">👑 LEGENDARY REWARD! 👑</div>
                )}
                {reward.rarity === 'epic' && (
                  <div className="text-3xl animate-pulse">⭐ EPIC REWARD! ⭐</div>
                )}
                {reward.rarity === 'rare' && (
                  <div className="text-2xl">💎 RARE REWARD! 💎</div>
                )}
                {reward.rarity === 'common' && (
                  <div className="text-xl">✨ REWARD! ✨</div>
                )}
              </div>

              {/* Reward Display */}
              <div className={`
                mx-auto w-40 h-40 rounded-full flex items-center justify-center
                bg-gradient-to-br ${rarityConfig[reward.rarity].color}
                border-4 border-white shadow-2xl
                ${reward.rarity === 'legendary' ? 'animate-pulse' : ''}
                ${rarityConfig[reward.rarity].glow}
              `}>
                <div className="text-center text-white">
                  <DollarSign className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-2xl font-bold">${reward.amount.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className={`
                  text-2xl font-bold capitalize
                  ${rarityConfig[reward.rarity].textColor}
                `}>
                  {reward.rarity} Reward!
                </h3>
                <p className="text-lg">
                  You won <span className="font-bold text-green-600">${reward.amount.toFixed(2)}</span>!
                </p>
                <p className="text-sm text-muted-foreground">
                  Added to your balance
                </p>
              </div>

              {/* Particle Effects */}
              {reward.rarity !== 'common' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`
                        absolute text-2xl animate-ping
                        ${i % 4 === 0 ? 'top-1/4 left-1/4' : ''}
                        ${i % 4 === 1 ? 'top-1/4 right-1/4' : ''}
                        ${i % 4 === 2 ? 'bottom-1/4 left-1/4' : ''}
                        ${i % 4 === 3 ? 'bottom-1/4 right-1/4' : ''}
                      `}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '2s'
                      }}
                    >
                      {rarityConfig[reward.rarity].particles}
                    </div>
                  ))}
                </div>
              )}

              <Button 
                onClick={handleClose}
                className="w-full max-w-md mx-auto gradient-primary hover:glow-primary text-white"
              >
                Continue Playing
              </Button>
            </div>
          )}

          {/* Drop Rates Info */}
          {phase === 'ready' && (
            <div className="text-sm text-muted-foreground space-y-2 glass p-4 rounded-lg">
              <div className="font-semibold mb-3">Level {level} Case Rewards:</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(rarityConfig).map(([rarity, config]) => {
                  const range = getRewardRange(level, rarity);
                  const chances = { common: '60%', rare: '25%', epic: '12%', legendary: '3%' };
                  return (
                    <div key={rarity} className="flex justify-between">
                      <span className={`capitalize font-medium ${config.textColor}`}>
                        {rarity} ({chances[rarity as keyof typeof chances]})
                      </span>
                      <span>${range.min}-${range.max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};