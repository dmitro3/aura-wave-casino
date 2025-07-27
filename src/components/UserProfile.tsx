
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Target, TrendingUp, Calendar, Star, DollarSign, 
  Crown, Flame, Sparkles, Zap, Award, Medal, Gamepad2,
  BarChart3, Coins, X, Wallet, Gift, Globe, Users,
  ChevronUp, ChevronDown, Eye, EyeOff
} from 'lucide-react';
import { UserProfile as UserProfileType } from '@/hooks/useUserProfile';
import { ProfileBorder } from './ProfileBorder';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserProfileType | null;
}

const rarityGradients = {
  common: 'from-gray-400 to-gray-600',
  uncommon: 'from-green-400 to-green-600', 
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500',
  mythical: 'from-pink-400 to-red-500'
};

const achievementIcons: Record<string, { icon: any; name: string; description: string; rarity: keyof typeof rarityGradients }> = {
  welcome: { icon: Sparkles, name: "Welcome Aboard", description: "Successfully joined the casino", rarity: 'common' },
  firstWin: { icon: Trophy, name: "First Victory", description: "Won your very first game", rarity: 'uncommon' },
  bigSpender: { icon: Crown, name: "High Roller", description: "Wagered over $1,000 total", rarity: 'rare' },
  lucky: { icon: Flame, name: "Lucky Streak", description: "Won 5 games in a row", rarity: 'epic' },
  veteran: { icon: Medal, name: "Casino Veteran", description: "Reached level 25", rarity: 'legendary' },
  millionaire: { icon: Coins, name: "Millionaire", description: "Accumulated $1M+ lifetime", rarity: 'mythical' }
};

export default function UserProfile({ isOpen, onClose, userData }: UserProfileProps) {
  const { stats } = useUserLevelStats();
  const [activeTab, setActiveTab] = useState('overview');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [animatedStats, setAnimatedStats] = useState({
    level: 0,
    xp: 0,
    balance: 0
  });

  // Animate numbers on mount
  useEffect(() => {
    if (isOpen && userData && stats) {
      const animateValue = (start: number, end: number, duration: number, setter: (value: number) => void) => {
        const range = end - start;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const current = start + (range * easeOut);
          
          setter(Math.floor(current));
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
      };

      animateValue(0, stats.current_level, 800, (val) => 
        setAnimatedStats(prev => ({ ...prev, level: val }))
      );
      animateValue(0, stats.current_level_xp, 1000, (val) => 
        setAnimatedStats(prev => ({ ...prev, xp: val }))
      );
      animateValue(0, userData.balance, 1200, (val) => 
        setAnimatedStats(prev => ({ ...prev, balance: val }))
      );
    }
  }, [isOpen, userData, stats]);
  
  if (!userData) return null;

  const currentLevel = stats?.current_level || userData.current_level;
  const currentXP = stats?.current_level_xp || userData.current_xp;
  const xpToNext = stats?.xp_to_next_level || userData.xp_to_next_level;
  const totalXP = currentXP + xpToNext;
  const xpProgress = totalXP > 0 ? (currentXP / totalXP) * 100 : 0;

  const registrationDate = new Date(userData.registration_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate total game stats
  const totalGames = (userData.gameStats.coinflip?.wins || 0) + (userData.gameStats.coinflip?.losses || 0) + 
                    (userData.gameStats.crash?.wins || 0) + (userData.gameStats.crash?.losses || 0) +
                    (userData.gameStats.roulette?.wins || 0) + (userData.gameStats.roulette?.losses || 0);
  
  const totalWins = (userData.gameStats.coinflip?.wins || 0) + (userData.gameStats.crash?.wins || 0) + (userData.gameStats.roulette?.wins || 0);
  const winRate = totalGames > 0 ? (totalWins / totalGames * 100) : 0;
  const totalProfit = (userData.gameStats.coinflip?.profit || 0) + (userData.gameStats.crash?.profit || 0) + (userData.gameStats.roulette?.profit || 0);

  const getBorderTier = (level: number) => {
    if (level >= 100) return 6;
    if (level >= 75) return 5;
    if (level >= 50) return 4;
    if (level >= 25) return 3;
    if (level >= 10) return 2;
    return 1;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0 border-0 bg-transparent">
        <div className="relative h-full">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl rounded-2xl border border-white/10" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 rounded-2xl" />
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 h-8 w-8 p-0 rounded-full glass border border-white/20 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative p-8 h-full overflow-y-auto">
            {/* Hero Header */}
            <div className="relative mb-8">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)] rounded-2xl" />
              
              <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                {/* Enhanced Avatar */}
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary via-accent to-primary rounded-full opacity-75 group-hover:opacity-100 animate-pulse blur-sm" />
                  <ProfileBorder level={currentLevel} size="lg">
                    <div className="w-full h-full rounded-full overflow-hidden relative">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                        alt={`${userData.username} avatar`}
                        className="w-full h-full object-cover"
                      />
                      {/* Level Crown for high levels */}
                      {currentLevel >= 100 && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                          <Crown className="w-6 h-6 text-yellow-400 drop-shadow-lg animate-bounce" />
                        </div>
                      )}
                    </div>
                  </ProfileBorder>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {userData.username}
                    </h1>
                    {currentLevel >= 50 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">VIP</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-start gap-4 text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {registrationDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Player #{userData.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Level & XP Display */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center md:justify-start gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary animate-pulse">
                          {animatedStats.level}
                        </div>
                        <div className="text-sm text-muted-foreground">Level</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-accent">
                          {animatedStats.xp.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Current XP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-400">
                          {xpToNext.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">To Next</div>
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Level {currentLevel} Progress</span>
                        <span>{Math.round(xpProgress)}%</span>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out relative"
                          style={{ width: `${xpProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Card */}
                <Card className="glass border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wallet className="w-5 h-5 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Balance</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                      >
                        {isBalanceVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Button>
                    </div>
                    <div className="text-3xl font-bold text-green-400">
                      {isBalanceVisible ? `$${animatedStats.balance.toFixed(2)}` : '$••••••'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 glass bg-background/50 p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="games" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Games
                </TabsTrigger>
                <TabsTrigger value="achievements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Award className="w-4 h-4 mr-2" />
                  Achievements
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Statistics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="glass border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                    <CardContent className="p-4 text-center">
                      <Gamepad2 className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                      <div className="text-2xl font-bold text-blue-400">{totalGames}</div>
                      <div className="text-xs text-muted-foreground">Games Played</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass border-0 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                    <CardContent className="p-4 text-center">
                      <Trophy className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <div className="text-2xl font-bold text-green-400">{totalWins}</div>
                      <div className="text-xs text-muted-foreground">Total Wins</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                    <CardContent className="p-4 text-center">
                      <Target className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                      <div className="text-2xl font-bold text-purple-400">{winRate.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </CardContent>
                  </Card>
                  
                  <Card className={`glass border-0 bg-gradient-to-br ${totalProfit >= 0 ? 'from-green-500/10 to-green-600/10 border-green-500/20' : 'from-red-500/10 to-red-600/10 border-red-500/20'}`}>
                    <CardContent className="p-4 text-center">
                      <DollarSign className={`w-6 h-6 mx-auto mb-2 ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                      <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${Math.abs(totalProfit).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {totalProfit >= 0 ? 'Total Profit' : 'Total Loss'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Preview */}
                <Card className="glass border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Player Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                        <h4 className="font-semibold mb-2 text-primary">Best Streak</h4>
                        <p className="text-2xl font-bold">12 wins</p>
                        <p className="text-sm text-muted-foreground">in Coinflip</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                        <h4 className="font-semibold mb-2 text-green-400">Biggest Win</h4>
                        <p className="text-2xl font-bold text-green-400">$2,450.00</p>
                        <p className="text-sm text-muted-foreground">in Roulette</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Games Tab */}
              <TabsContent value="games" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Coinflip Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-amber-400">
                        <Coins className="w-5 h-5" />
                        Coinflip
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.coinflip?.wins || 0) + (userData.gameStats.coinflip?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.coinflip?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.coinflip?.losses || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.coinflip?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.coinflip?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.coinflip?.profit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Roulette Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-red-400">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-black border-2 border-white" />
                        Roulette
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.roulette?.wins || 0) + (userData.gameStats.roulette?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.roulette?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.roulette?.losses || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.roulette?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.roulette?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.roulette?.profit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Crash Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                        Crash
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.crash?.wins || 0) + (userData.gameStats.crash?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.crash?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.crash?.losses || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.crash?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.crash?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.crash?.profit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userData.badges?.map((badge) => {
                    const achievement = achievementIcons[badge];
                    if (!achievement) return null;
                    
                    const IconComponent = achievement.icon;
                    
                    return (
                      <Card key={badge} className={`glass border-0 bg-gradient-to-br ${rarityGradients[achievement.rarity]} opacity-90 hover:opacity-100 transition-all duration-300 hover:scale-105 border border-white/20`}>
                        <CardContent className="p-6 text-center text-white">
                          <div className="mb-4">
                            <div className="w-12 h-12 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                              <IconComponent className="w-6 h-6" />
                            </div>
                          </div>
                          <h3 className="font-bold mb-2">{achievement.name}</h3>
                          <p className="text-sm opacity-90">{achievement.description}</p>
                          <Badge variant="secondary" className="mt-3 bg-white/20 text-white border-white/30 capitalize">
                            {achievement.rarity}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {/* Show empty state or locked achievements */}
                  {(!userData.badges || userData.badges.length === 0) && (
                    <div className="col-span-full text-center py-12">
                      <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                      <p className="text-muted-foreground">Start playing games to unlock achievements!</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Statistics Tab */}
              <TabsContent value="stats" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Level Progress Chart */}
                  <Card className="glass border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Level Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                        <div className="text-4xl font-bold text-primary mb-2">{currentLevel}</div>
                        <div className="text-muted-foreground mb-4">Current Level</div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress to Level {currentLevel + 1}</span>
                            <span>{Math.round(xpProgress)}%</span>
                          </div>
                          <Progress value={xpProgress} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Border Tier Info */}
                  <Card className="glass border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-400" />
                        Border Tier
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                        <div className="text-4xl font-bold text-yellow-400 mb-2">Tier {getBorderTier(currentLevel)}</div>
                        <div className="text-muted-foreground mb-4">Profile Border</div>
                        <div className="text-sm space-y-1">
                          <div>Tier 1: Level 1-9 (Basic)</div>
                          <div>Tier 2: Level 10-24 (Bronze)</div>
                          <div>Tier 3: Level 25-49 (Silver)</div>
                          <div className={currentLevel >= 50 ? 'text-yellow-400 font-semibold' : ''}>
                            Tier 4: Level 50-74 (Gold)
                          </div>
                          <div className={currentLevel >= 75 ? 'text-purple-400 font-semibold' : ''}>
                            Tier 5: Level 75-99 (Platinum)
                          </div>
                          <div className={currentLevel >= 100 ? 'text-pink-400 font-semibold' : ''}>
                            Tier 6: Level 100+ (Diamond)
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
