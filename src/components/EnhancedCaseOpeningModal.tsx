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
  icon: string;
  shimmer: boolean;
  amount: number;
}

const rarityConfig = {
  common: {
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-600',
    glow: 'shadow-gray-500/50',
    bgColor: 'bg-gray-100',
    particles: '✨',
    icon: '💰',
    border: 'border-gray-400'
  },
  rare: {
    color: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-600',
    glow: 'shadow-blue-500/50',
    bgColor: 'bg-blue-100',
    particles: '💫',
    icon: '💎',
    border: 'border-blue-400'
  },
  epic: {
    color: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-600',
    glow: 'shadow-purple-500/50',
    bgColor: 'bg-purple-100',
    particles: '🌟',
    icon: '⭐',
    border: 'border-purple-400'
  },
  legendary: {
    color: 'from-orange-400 to-orange-600',
    textColor: 'text-orange-600',
    glow: 'shadow-orange-500/50',
    bgColor: 'bg-orange-100',
    particles: '🔥',
    icon: '👑',
    border: 'border-orange-400'
  }
};

// Generate spinner items for the carousel effect
const generateSpinnerItems = (count: number, level: number): SpinnerItem[] => {
  const items: SpinnerItem[] = [];
  const rarities: (keyof typeof rarityConfig)[] = ['common', 'rare', 'epic', 'legendary'];
  const weights = [60, 25, 12, 3]; // Probability weights
  
  // Base amount for calculations
  const baseAmount = Math.max(10, level * 2);
  
  for (let i = 0; i < count; i++) {
    // Weighted random selection
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common' as keyof typeof rarityConfig;
    
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (rand <= cumulative) {
        selectedRarity = rarities[j];
        break;
      }
    }
    
    // Calculate amount based on rarity and level
    const multipliers = {
      common: { min: 0.5, max: 2.5 },
      rare: { min: 3, max: 12 },
      epic: { min: 15, max: 40 },
      legendary: { min: 50, max: 100 }
    };
    
    const config = multipliers[selectedRarity];
    const min = Math.round(baseAmount * config.min);
    const max = Math.round(baseAmount * config.max);
    const amount = Math.round(min + Math.random() * (max - min));
    
    items.push({
      rarity: selectedRarity,
      color: rarityConfig[selectedRarity].color,
      glow: rarityConfig[selectedRarity].glow,
      icon: rarityConfig[selectedRarity].icon,
      shimmer: ['epic', 'legendary'].includes(selectedRarity),
      amount: amount
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
  const [spinnerItems, setSpinnerItems] = useState<SpinnerItem[]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const [animationStage, setAnimationStage] = useState<'fast' | 'slowing' | 'locked'>('fast');
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
          
          // Generate spinner items with the actual level
          const items = generateSpinnerItems(200, level);
          
          // Calculate target position for the winning item (in the center)
          const centerIndex = Math.floor(items.length / 2);
          const winningItem: SpinnerItem = {
            rarity: rewardData.rarity,
            color: rarityConfig[rewardData.rarity].color,
            glow: rarityConfig[rewardData.rarity].glow,
            icon: rarityConfig[rewardData.rarity].icon,
            shimmer: ['epic', 'legendary'].includes(rewardData.rarity),
            amount: Math.round(rewardData.amount)
          };
          
          // Place winning item at center position
          items[centerIndex] = winningItem;
          setSpinnerItems(items);
        
        // Fast spinning phase (2 seconds)
        setAnimationStage('fast');
        let offset = 0;
        const fastSpeed = 20;
        
        const fastSpin = setInterval(() => {
          offset += fastSpeed;
          setReelOffset(offset);
        }, 16);
        
        setTimeout(() => {
          clearInterval(fastSpin);
          
          // Slowing phase (4-6 seconds with easing)
          setAnimationStage('slowing');
          const targetOffset = centerIndex * 120 - 600; // Center winning item
          let currentOffset = offset;
          const startTime = Date.now();
          const duration = 4500;
          
          const easingFunction = (t: number) => {
            // Cubic bezier easing for smooth deceleration
            return 1 - Math.pow(1 - t, 4);
          };
          
          const slowSpin = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFunction(progress);
            
            const newOffset = offset + (targetOffset - offset) * easedProgress;
            setReelOffset(newOffset);
            
            if (progress >= 1) {
              clearInterval(slowSpin);
              setAnimationStage('locked');
              
              // Final lock animation
              setTimeout(() => {
                setPhase('revealing');
                setReward(rewardData);
                
                setTimeout(() => {
                  setPhase('complete');
                  onCaseOpened(rewardData);
                }, 2000);
              }, 800);
            }
          }, 16);
        }, 2000);
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
    setReelOffset(0);
    setAnimationStage('fast');
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
        setReelOffset(0);
        setAnimationStage('fast');
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

          {/* Horizontal Scrolling Reel */}
          {phase === 'spinning' && (
            <div className="space-y-6">
              {/* Floating 3D Case Animation */}
              <div className="text-center relative">
                <div className="relative mx-auto w-32 h-32 mb-4">
                  <Card className={`
                    w-full h-full flex items-center justify-center
                    gradient-primary border-2 border-primary/30
                    ${animationStage === 'fast' ? 'animate-bounce' : ''}
                    ${animationStage === 'slowing' ? 'animate-pulse' : ''}
                    ${animationStage === 'locked' ? 'animate-ping' : ''}
                  `}>
                    <CardContent className="p-0">
                      <div className="text-center text-white">
                        <Gift className={`w-16 h-16 mx-auto ${animationStage === 'fast' ? 'animate-spin' : ''}`} />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Opening lid animation */}
                  {animationStage !== 'fast' && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-t-lg animate-pulse opacity-80" />
                  )}
                  
                  {/* Sparkle effects */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute text-yellow-300 animate-ping`}
                        style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          animationDelay: `${i * 0.2}s`,
                          animationDuration: '1.5s'
                        }}
                      >
                        ✨
                      </div>
                    ))}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-2">
                  {animationStage === 'fast' && '🎰 SPINNING FAST...'}
                  {animationStage === 'slowing' && '⏳ SLOWING DOWN...'}
                  {animationStage === 'locked' && '🎯 LOCKING IN...'}
                </h3>
                <p className="text-muted-foreground">Your reward is being determined...</p>
              </div>
              
              {/* Horizontal Scrolling Reel Container */}
              <div className="relative">
                {/* Reel Track Background */}
                <div className="relative h-40 overflow-hidden bg-gradient-to-r from-slate-900/40 via-slate-800/40 to-slate-900/40 rounded-xl border-2 border-primary/30 shadow-2xl">
                  {/* Center Selection Indicator */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 z-20 shadow-lg shadow-yellow-400/50 rounded-full" />
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-white z-30 shadow-lg shadow-white/50" />
                  
                  {/* Selection Frame */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-yellow-400 rounded-xl z-10 shadow-lg shadow-yellow-400/30 animate-pulse" />
                  
                  {/* Scrolling Items Reel */}
                  <div 
                    className="flex h-full items-center transition-transform duration-75 ease-linear"
                    style={{
                      transform: `translateX(-${reelOffset}px)`,
                      width: `${spinnerItems.length * 120}px`
                    }}
                  >
                    {spinnerItems.map((item, index) => {
                      const distanceFromCenter = Math.abs((index * 120 - reelOffset) - 600);
                      const isCenter = distanceFromCenter < 60;
                      const opacity = Math.max(0.3, 1 - (distanceFromCenter / 400));
                      const scale = isCenter ? 1.1 : Math.max(0.8, 1 - (distanceFromCenter / 800));
                      
                      return (
                        <div
                          key={index}
                          className={`
                            flex-shrink-0 w-28 h-28 mx-1 rounded-xl border-3
                            bg-gradient-to-br ${item.color} ${rarityConfig[item.rarity].border}
                            flex flex-col items-center justify-center relative
                            transition-all duration-100 ease-out
                            ${isCenter ? `ring-4 ring-yellow-400 shadow-2xl ${item.glow}` : 'shadow-lg'}
                            ${item.shimmer ? 'animate-pulse' : ''}
                          `}
                          style={{
                            opacity,
                            transform: `scale(${scale})`,
                            filter: isCenter ? 'brightness(1.2)' : `brightness(${0.7 + opacity * 0.3})`
                          }}
                        >
                          {/* Item Icon */}
                          <div className="text-2xl mb-1 text-white drop-shadow-lg">
                            {item.icon}
                          </div>
                          
                          {/* Dollar Amount */}
                          <div className="text-sm font-bold text-white drop-shadow-lg">
                            ${item.amount}
                          </div>
                          
                          {/* Rarity Indicator */}
                          <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
                            {item.rarity.charAt(0)}
                          </div>
                          
                          {/* Shine Effect for Rare Items */}
                          {item.shimmer && isCenter && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-xl" />
                          )}
                          
                          {/* Particle Effects */}
                          {isCenter && animationStage === 'locked' && (
                            <div className="absolute inset-0 pointer-events-none">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute text-yellow-300 animate-bounce"
                                  style={{
                                    top: `${10 + Math.random() * 80}%`,
                                    left: `${10 + Math.random() * 80}%`,
                                    animationDelay: `${i * 0.1}s`,
                                    animationDuration: '0.8s'
                                  }}
                                >
                                  {rarityConfig[item.rarity].particles}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Edge Fade Effects */}
                  <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-slate-900/60 to-transparent z-10 pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-slate-900/60 to-transparent z-10 pointer-events-none" />
                </div>
                
                {/* Animation Status */}
                <div className="text-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    {animationStage === 'fast' && '⚡ Fast Spin'}
                    {animationStage === 'slowing' && '🎯 Finding Your Reward...'}
                    {animationStage === 'locked' && '🔒 Locked In!'}
                  </div>
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