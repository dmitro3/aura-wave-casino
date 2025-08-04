import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Gift, 
  DollarSign, 
  X, 
  Crown, 
  Star, 
  Zap, 
  Target, 
  Shield, 
  Cpu, 
  Sparkles,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CyberpunkCaseOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  level: number;
  onCaseOpened: (reward: CaseReward) => void;
  isFreeCase?: boolean;
  freeCaseType?: 'common' | 'rare' | 'epic';
  openCaseFunction?: (caseId: string) => Promise<any>;
}

interface CaseReward {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  amount: number;
  level: number;
  animationType: string;
  caseId: string;
}

interface RewardItem {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  amount: number;
  icon: string;
  color: string;
  glow: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  particles: string;
  shimmer: boolean;
}

const rarityConfig = {
  common: {
    color: 'from-slate-400 to-slate-600',
    textColor: 'text-slate-300',
    glow: 'shadow-slate-400/50',
    bgGradient: 'bg-gradient-to-br from-slate-800/90 to-slate-900/90',
    borderColor: 'border-slate-500/50',
    particles: '✨',
    icon: '💵',
    shimmer: false
  },
  rare: {
    color: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-300',
    glow: 'shadow-blue-500/50',
    bgGradient: 'bg-gradient-to-br from-blue-800/90 to-blue-900/90',
    borderColor: 'border-blue-500/50',
    particles: '💫',
    icon: '💎',
    shimmer: false
  },
  epic: {
    color: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-300',
    glow: 'shadow-purple-500/50',
    bgGradient: 'bg-gradient-to-br from-purple-800/90 to-purple-900/90',
    borderColor: 'border-purple-500/50',
    particles: '🌟',
    icon: '⚡',
    shimmer: false
  },
  legendary: {
    color: 'from-orange-400 to-orange-600',
    textColor: 'text-orange-300',
    glow: 'shadow-orange-500/50',
    bgGradient: 'bg-gradient-to-br from-orange-800/90 to-orange-900/90',
    borderColor: 'border-orange-500/50',
    particles: '🔥',
    icon: '👑',
    shimmer: false
  }
};

// Generate possible rewards for the reel
const generatePossibleRewards = (level: number, isFreeCase?: boolean): RewardItem[] => {
  const rewards: RewardItem[] = [];
  const rarities: (keyof typeof rarityConfig)[] = ['common', 'rare', 'epic', 'legendary'];
  const weights = [60, 25, 12, 3]; // Probability weights
  
  // Base amount for calculations
  const baseAmount = isFreeCase ? 1000 : Math.max(10, level * 2);
  
  // Generate 50 possible rewards
  for (let i = 0; i < 50; i++) {
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
    
    const rarityData = rarityConfig[selectedRarity];
    
    rewards.push({
      rarity: selectedRarity,
      amount: amount,
      icon: rarityData.icon,
      color: rarityData.color,
      glow: rarityData.glow,
      bgGradient: rarityData.bgGradient,
      borderColor: rarityData.borderColor,
      textColor: rarityData.textColor,
      particles: rarityData.particles,
      shimmer: rarityData.shimmer
    });
  }
  
  return rewards;
};

export const CyberpunkCaseOpeningModal = ({ 
  isOpen, 
  onClose, 
  caseId, 
  level, 
  onCaseOpened,
  isFreeCase = false,
  freeCaseType,
  openCaseFunction
}: CyberpunkCaseOpeningModalProps) => {
  const [phase, setPhase] = useState<'preview' | 'opening' | 'spinning' | 'revealing' | 'complete'>('preview');
  const [reward, setReward] = useState<CaseReward | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [possibleRewards, setPossibleRewards] = useState<RewardItem[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [reelPosition, setReelPosition] = useState(0);
  const { toast } = useToast();

  // Initialize possible rewards
  useEffect(() => {
    if (isOpen) {
      const rewards = generatePossibleRewards(level, isFreeCase);
      setPossibleRewards(rewards);
    }
  }, [isOpen, level, isFreeCase]);

  const openCase = async () => {
    if (isLocked) return;
    
    setIsLocked(true);
    setPhase('opening');

    try {
      let result;
      
      if (isFreeCase) {
        // Handle free cases
        const { data, error } = await supabase.functions.invoke('claim-free-case', { 
          body: { caseType: freeCaseType } 
        });
        
        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Failed to open case');
        
        result = data;
      } else {
        // Handle level cases using the provided function
        if (!openCaseFunction) {
          throw new Error('No case opening function provided');
        }
        
        result = await openCaseFunction(caseId);
        if (!result) {
          throw new Error('Failed to open case');
        }
      }

      // Handle different response formats
      const rewardData: CaseReward = isFreeCase 
        ? { 
            rarity: (freeCaseType || 'common') as 'common' | 'rare' | 'epic' | 'legendary', 
            amount: result.amount, 
            level, 
            animationType: 'normal', 
            caseId 
          }
        : { 
            rarity: 'common', // Default rarity for level cases
            amount: result.reward_amount || 0, 
            level, 
            animationType: 'normal', 
            caseId 
          };
      
      // Start spinning animation
      setTimeout(() => {
        setPhase('spinning');
        startSpinningAnimation(rewardData);
      }, 1000);

    } catch (error) {
      console.error('Error opening case:', error);
      toast({
        title: 'Error',
        description: 'Failed to open case. Please try again.',
        variant: 'destructive'
      });
      setIsLocked(false);
      setPhase('preview');
    }
  };

  const startSpinningAnimation = (rewardData: CaseReward) => {
    setSpinning(true);
    
    // Find the reward in our possible rewards list
    const targetReward = possibleRewards.find(r => 
      r.rarity === rewardData.rarity && 
      Math.abs(r.amount - rewardData.amount) < 5
    );
    
    const targetIndex = targetReward ? possibleRewards.indexOf(targetReward) : 4; // Center position (4th item)
    
    // Fast spinning phase
    let currentSpeed = 50;
    let currentPosition = 0;
    
    const spinInterval = setInterval(() => {
      currentPosition += currentSpeed;
      setReelPosition(currentPosition);
      
      // Gradually slow down
      if (currentSpeed > 5) {
        currentSpeed *= 0.98;
      }
      
      // Stop when we reach the target (center the winning reward)
      const targetPosition = targetIndex * 136; // 136px per item (128px card + 8px gap)
      if (currentSpeed <= 5 && Math.abs(currentPosition - targetPosition) < 10) {
        clearInterval(spinInterval);
        setSpinning(false);
        
        setTimeout(() => {
          setPhase('revealing');
          setReward(rewardData);
          
          setTimeout(() => {
            setPhase('complete');
            onCaseOpened(rewardData);
          }, 2000);
        }, 500);
      }
    }, 50);
  };

  const handleClose = () => {
    if (isLocked && phase !== 'complete') return;
    
    setPhase('preview');
    setReward(null);
    setIsLocked(false);
    setSpinning(false);
    setReelPosition(0);
    onClose();
  };



  const getRewardRange = (level: number, rarity: string, isFreeCase?: boolean) => {
    if (isFreeCase) {
      const freeRanges = {
        common: { min: 500, max: 2500 },
        rare: { min: 2500, max: 10000 },
        epic: { min: 10000, max: 50000 }
      };
      return freeRanges[rarity as keyof typeof freeRanges] || { min: 500, max: 2500 };
    }
    
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
        setPhase('preview');
        setReward(null);
        setIsLocked(false);
        setSpinning(false);
        setReelPosition(0);
      }, 300);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl mx-auto bg-transparent border-0 overflow-hidden p-0">
        {/* Cyberpunk Background Overlay */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        
        {/* Main Modal Container */}
        <div className="relative z-50 w-full h-full min-h-[600px] flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl">
            
            {/* Cyberpunk Frame */}
            <div className="relative overflow-hidden">
              {/* Outer Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-xl animate-pulse" />
              
              {/* Main Container */}
              <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl border border-primary/30 overflow-hidden">
                
                {/* Animated Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl opacity-50 animate-pulse" />
                
                {/* Scan Lines */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-cyber-scan-horizontal" />
                  <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/60 to-transparent animate-cyber-scan left-1/4" />
                  <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-primary/60 to-transparent animate-cyber-scan right-1/3 delay-1000" />
                </div>
                
                {/* Corner Tech Details */}
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/60" />
                <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-accent/60" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-accent/60" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/60" />
                
                {/* Content */}
                <div className="relative z-10 p-6">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                          <Gift className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-md animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                          {isFreeCase ? `${freeCaseType?.charAt(0).toUpperCase()}${freeCaseType?.slice(1)} Free Case` : `Level ${level} Case`}
                        </h2>
                        <p className="text-sm text-muted-foreground font-mono">Advanced Reward System</p>
                      </div>
                    </div>
                    
                    {!isLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClose}
                        className="relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:bg-red-500/10 text-red-400"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="space-y-8">
                    
                                         {/* Preview Phase */}
                     {phase === 'preview' && (
                       <div className="space-y-6">
                         {/* Static Reward Reel */}
                         <div className="relative">
                           <div className="flex justify-center overflow-hidden">
                             <div className="flex space-x-4">
                               {possibleRewards.slice(0, 9).map((reward, index) => (
                                 <Card
                                   key={index}
                                   className={`
                                     w-32 h-32 flex-shrink-0 relative overflow-hidden
                                     ${reward.bgGradient} border-2 ${reward.borderColor}
                                   `}
                                 >
                                   <CardContent className="p-4 text-center">
                                     <div className="text-3xl mb-2">{reward.icon}</div>
                                     <div className="text-lg font-bold text-white mb-1">
                                       ${reward.amount.toLocaleString()}
                                     </div>
                                     <div className={cn("text-xs font-medium capitalize", reward.textColor)}>
                                       {reward.rarity}
                                     </div>
                                   </CardContent>
                                 </Card>
                               ))}
                             </div>
                           </div>
                           
                           {/* Center Indicator */}
                           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-full bg-gradient-to-b from-primary/80 to-primary/40 z-20">
                             <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg" />
                             <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg" />
                           </div>
                         </div>

                         {/* Open Button */}
                         <div className="text-center">
                           <Button 
                             onClick={openCase}
                             disabled={isLocked}
                             className="relative overflow-hidden px-8 py-4 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-white border border-primary/30 shadow-2xl hover:shadow-primary/25 transition-all duration-300"
                           >
                             <div className="relative z-10 flex items-center space-x-3">
                               <Play className="w-6 h-6" />
                               <span>Open Case</span>
                             </div>
                             
                             {/* Button Glow */}
                             <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl animate-pulse" />
                           </Button>
                         </div>
                       </div>
                     )}

                    {/* Opening Phase */}
                    {phase === 'opening' && (
                      <div className="text-center space-y-6">
                        <div className="relative mx-auto w-32 h-32">
                          <div className="w-full h-full rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-accent border-2 border-primary/30 shadow-2xl animate-bounce">
                            <div className="text-center text-white">
                              <Gift className="w-16 h-16 mx-auto mb-2 animate-spin" />
                              <div className="text-lg font-bold">Opening...</div>
                            </div>
                          </div>
                          <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl animate-ping" />
                        </div>
                        <h3 className="text-xl font-bold animate-pulse">Initializing Reward System...</h3>
                      </div>
                    )}

                    {/* Spinning Phase */}
                    {phase === 'spinning' && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-2xl font-bold mb-4 flex items-center justify-center space-x-3">
                            <Target className="w-8 h-8 text-primary animate-pulse" />
                            <span>Determining Reward...</span>
                          </h3>
                        </div>
                        
                        {/* Spinning Reel */}
                        <div className="relative">
                          <div className="flex justify-center overflow-hidden">
                            <div 
                              className="flex space-x-4 transition-transform duration-100 ease-linear"
                              style={{ transform: `translateX(-${reelPosition}px)` }}
                            >
                              {possibleRewards.map((reward, index) => (
                                <Card
                                  key={index}
                                  className={`
                                    w-32 h-32 flex-shrink-0 relative overflow-hidden
                                    ${reward.bgGradient} border-2 ${reward.borderColor}
                                  `}
                                >
                                  <CardContent className="p-4 text-center">
                                    <div className="text-3xl mb-2">{reward.icon}</div>
                                    <div className="text-lg font-bold text-white mb-1">
                                      ${reward.amount.toLocaleString()}
                                    </div>
                                    <div className={cn("text-xs font-medium capitalize", reward.textColor)}>
                                      {reward.rarity}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                          
                          {/* Center Indicator */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-full bg-gradient-to-b from-primary/80 to-primary/40 z-20">
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg animate-ping" />
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg animate-ping" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Revealing Phase */}
                    {phase === 'revealing' && reward && (
                      <div className="text-center space-y-6">
                        <div className="animate-bounce">
                          <h3 className="text-3xl font-bold mb-4 flex items-center justify-center space-x-3">
                            <Sparkles className="w-8 h-8 text-primary animate-spin" />
                            <span>REVEALING REWARD...</span>
                            <Sparkles className="w-8 h-8 text-primary animate-spin" />
                          </h3>
                          <div className={`
                            mx-auto w-32 h-32 rounded-2xl flex items-center justify-center
                            bg-gradient-to-br ${rarityConfig[reward.rarity].color}
                            border-4 border-white shadow-2xl animate-pulse
                            ${rarityConfig[reward.rarity].glow}
                          `}>
                            <Sparkles className="w-16 h-16 text-white animate-spin" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Complete Phase */}
                    {phase === 'complete' && reward && (
                      <div className="text-center space-y-8">
                        {/* Celebration Header */}
                        <div className="space-y-4">
                          {reward.rarity === 'legendary' && (
                            <div className="text-4xl font-bold animate-bounce bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                              👑 LEGENDARY REWARD! 👑
                            </div>
                          )}
                          {reward.rarity === 'epic' && (
                            <div className="text-3xl font-bold animate-pulse bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                              ⭐ EPIC REWARD! ⭐
                            </div>
                          )}
                          {reward.rarity === 'rare' && (
                            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                              💎 RARE REWARD! 💎
                            </div>
                          )}
                          {reward.rarity === 'common' && (
                            <div className="text-xl font-bold bg-gradient-to-r from-slate-400 to-gray-400 bg-clip-text text-transparent">
                              ✨ REWARD! ✨
                            </div>
                          )}
                        </div>

                        {/* Reward Display */}
                        <div className={`
                          mx-auto w-48 h-48 rounded-2xl flex items-center justify-center
                          bg-gradient-to-br ${rarityConfig[reward.rarity].color}
                          border-4 border-white shadow-2xl
                          ${reward.rarity === 'legendary' ? 'animate-pulse' : ''}
                          ${rarityConfig[reward.rarity].glow}
                        `}>
                          <div className="text-center text-white">
                            <div className="text-6xl mb-4">{rarityConfig[reward.rarity].icon}</div>
                            <div className="text-3xl font-bold">${reward.amount.toFixed(2)}</div>
                            <div className="text-lg capitalize">{reward.rarity}</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className={`
                            text-2xl font-bold capitalize
                            ${rarityConfig[reward.rarity].textColor}
                          `}>
                            {reward.rarity} Reward!
                          </h3>
                          <p className="text-lg">
                            You won <span className="font-bold text-green-400">${reward.amount.toFixed(2)}</span>!
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Added to your balance
                          </p>
                        </div>

                        {/* Continue Button */}
                        <Button 
                          onClick={handleClose}
                          className="relative overflow-hidden px-8 py-4 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-white border border-primary/30 shadow-2xl hover:shadow-primary/25 transition-all duration-300"
                        >
                          <div className="relative z-10 flex items-center space-x-3">
                            <Zap className="w-6 h-6" />
                            <span>Continue Playing</span>
                          </div>
                          
                          {/* Button Glow */}
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl animate-pulse" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};