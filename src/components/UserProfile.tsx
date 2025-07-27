
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
  ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Building
} from 'lucide-react';
import { UserProfile as UserProfileType } from '@/hooks/useUserProfile';
import { ProfileBorder } from './ProfileBorder';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: UserProfileType | null;
  username?: string;
  onUserDataUpdate?: () => void;
}

// Icon mapping for achievements
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    'DollarSign': DollarSign,
    'User': Users,
    'MessageCircle': Users,
    'Calendar': Calendar,
    'Trophy': Trophy,
    'RotateCcw': Coins,
    'Building': Building,
    'Coins': Coins,
    'Sparkles': Sparkles,
    'Circle': Target,
    'Crown': Crown,
    'Banknote': DollarSign,
    'TrendingUp': TrendingUp,
    'Gamepad': Gamepad2,
    'Target': Target,
    'Star': Star,
    'Flame': Flame,
    'Diamond': Star,
    'Zap': Zap,
    'Package': Gift,
    'MessageSquare': Users,
    'Infinity': Crown,
    'Medal': Medal,
    'Users': Users,
    'Gem': Star
  };
  return iconMap[iconName] || Trophy;
};

// Rarity gradients for achievements
const rarityGradients = {
  common: 'from-gray-500/20 to-gray-600/20',
  rare: 'from-blue-500/20 to-blue-600/20',
  epic: 'from-purple-500/20 to-purple-600/20',
  legendary: 'from-orange-500/20 to-orange-600/20'
};

// Rarity colors for borders and text
const rarityColors = {
  common: 'border-gray-500/30 text-gray-400',
  rare: 'border-blue-500/30 text-blue-400',
  epic: 'border-purple-500/30 text-purple-400',
  legendary: 'border-orange-500/30 text-orange-400'
};

// Difficulty badges
const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  extreme: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
};

export default function UserProfile({ isOpen, onClose, userData: propUserData, username, onUserDataUpdate }: UserProfileProps) {
  const { user } = useAuth();
  const { stats } = useUserLevelStats();
  const { claimableAchievements: notificationClaimable, hasNewClaimable } = useAchievementNotifications();
  const [activeTab, setActiveTab] = useState('overview');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [fetchedUserData, setFetchedUserData] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    level: 0,
    xp: 0,
    balance: 0
  });

  // Determine which userData to use
  const userData = propUserData || fetchedUserData;
  
  // Check if this is the current user's own profile
  const isOwnProfile = user && userData && user.id === userData.id;

  // Fetch user data when only username is provided
  useEffect(() => {
    if (isOpen && username && !propUserData) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          console.log('🔍 Fetching profile data for username:', username);

          // First get the user ID from profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

          if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            setLoading(false);
            return;
          }

          if (!profile) {
            console.warn('⚠️ No profile found for username:', username);
            setLoading(false);
            return;
          }

          // Get user level stats
          const { data: levelStats, error: levelError } = await supabase
            .from('user_level_stats')
            .select('*')
            .eq('user_id', profile.id)
            .single();

          // Create mock game stats - in a real app, you'd fetch these from the database
          const gameStats = {
            coinflip: { wins: levelStats?.coinflip_wins || 0, losses: Math.max(0, (levelStats?.coinflip_games || 0) - (levelStats?.coinflip_wins || 0)), profit: levelStats?.coinflip_profit || 0 },
            crash: { wins: levelStats?.crash_wins || 0, losses: Math.max(0, (levelStats?.crash_games || 0) - (levelStats?.crash_wins || 0)), profit: levelStats?.crash_profit || 0 },
            roulette: { wins: levelStats?.roulette_wins || 0, losses: Math.max(0, (levelStats?.roulette_games || 0) - (levelStats?.roulette_wins || 0)), profit: levelStats?.roulette_profit || 0 }
          };

          // Build user data object
          const fetchedUser: UserProfileType = {
            id: profile.id,
            username: profile.username,
            balance: profile.balance,
            current_level: levelStats?.current_level || 1,
            current_xp: levelStats?.current_level_xp || 0,
            xp_to_next_level: levelStats?.xp_to_next_level || 100,
            registration_date: profile.created_at,
            gameStats,
            badges: [] // You might want to fetch this from a badges table
          };

          console.log('✅ Successfully fetched user data:', fetchedUser);
          setFetchedUserData(fetchedUser);
        } catch (error) {
          console.error('❌ Error in fetchUserData:', error);
        }
        setLoading(false);
      };

      fetchUserData();
    }
  }, [isOpen, username, propUserData]);

  // Reset fetched data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFetchedUserData(null);
      setActiveTab('overview');
    }
  }, [isOpen]);

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
  
  // Show loading state
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md border-0 bg-transparent">
          <div className="relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl rounded-2xl border border-white/10" />
            <div className="relative p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-lg font-semibold mb-2">Loading Profile</h3>
              <p className="text-muted-foreground">Fetching user data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 border-0 bg-transparent">
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

                                 {/* Balance Card - Only show for own profile */}
                 {isOwnProfile && (
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
                 )}
                 
                 {/* Player Info Card for Other Users */}
                 {!isOwnProfile && (
                   <Card className="glass border-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                     <CardContent className="p-6 text-center">
                       <div className="flex items-center justify-center gap-2 mb-2">
                         <Globe className="w-5 h-5 text-blue-400" />
                         <span className="text-sm font-medium text-blue-400">Player Info</span>
                       </div>
                       <div className="text-xl font-bold text-blue-400 mb-1">
                         {totalGames} Games
                       </div>
                       <div className="text-sm text-muted-foreground">
                         {winRate.toFixed(1)}% Win Rate
                       </div>
                     </CardContent>
                   </Card>
                 )}
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
                <TabsTrigger value="achievements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
                  <Award className="w-4 h-4 mr-2" />
                  Achievements
                  {isOwnProfile && notificationClaimable.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {notificationClaimable.length}
                    </div>
                  )}
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

                  {/* Tower Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-amber-400">
                        <Building className="w-5 h-5" />
                        Tower
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.tower?.wins || 0) + (userData.gameStats.tower?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.tower?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.tower?.losses || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Highest Level</span>
                        <span className="font-semibold text-amber-400">{stats?.tower_highest_level || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Perfect Games</span>
                        <span className="font-semibold text-purple-400">{stats?.tower_perfect_games || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.tower?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.tower?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.tower?.profit || 0).toFixed(2)}
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
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading achievements...</p>
                    </div>
                  </div>
                ) : (
                  <AchievementsSection 
                    isOwnProfile={isOwnProfile}
                    userId={userData.id}
                    stats={stats}
                    propUserData={propUserData}
                    onUserDataUpdate={onUserDataUpdate}
                  />
                )}
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

// Comprehensive Achievements Section Component
interface AchievementsSectionProps {
  isOwnProfile: boolean;
  userId: string;
  stats: any;
  propUserData?: UserProfileType | null;
  onUserDataUpdate?: () => void;
}

function AchievementsSection({ isOwnProfile, userId, stats, propUserData, onUserDataUpdate }: AchievementsSectionProps) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [claimableAchievements, setClaimableAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [newlyClaimed, setNewlyClaimed] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  // Debug: Log the stats being passed
  useEffect(() => {
    // Removed debugging to improve performance
  }, [stats, isOwnProfile, userId]);

  // Fetch user stats for achievement progress calculation
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('user_level_stats')
          .select(`
            id,
            user_id,
            current_level,
            lifetime_xp,
            current_level_xp,
            xp_to_next_level,
            border_tier,
            border_unlocked_at,
            available_cases,
            total_cases_opened,
            total_case_value,
            coinflip_games,
            coinflip_wins,
            coinflip_wagered,
            coinflip_profit,
            crash_games,
            crash_wins,
            crash_wagered,
            crash_profit,
            roulette_games,
            roulette_wins,
            roulette_wagered,
            roulette_profit,
            roulette_green_wins,
            roulette_highest_win,
            roulette_biggest_bet,
            roulette_best_streak,
            roulette_favorite_color,
            tower_games,
            tower_wins,
            tower_wagered,
            tower_profit,
            tower_highest_level,
            tower_perfect_games,
            total_games,
            total_wins,
            total_wagered,
            total_profit,
            best_coinflip_streak,
            current_coinflip_streak,
            best_win_streak,
            biggest_win,
            biggest_loss,
            biggest_single_bet,
            chat_messages_count,
            login_days_count,
            account_created,
            created_at,
            updated_at
          `)
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error fetching user stats for achievements:', error);
          return;
        }

        if (data) {
          setUserStats(data);
        } else {
          setUserStats(null);
        }
      } catch (error) {
        console.error('❌ Error in fetchUserStats:', error);
      }
    };

    fetchUserStats();
  }, [userId]);

  // Fetch achievements and user stats in parallel
  const fetchData = async () => {
    if (!userId) return;

    setLoading(true);
    
    try {
      // Fetch only essential data for faster loading
      const [achievementsResult, userStatsResult, readyToClaimResult] = await Promise.all([
        // Fetch all achievements (lightweight)
        supabase
          .from('achievements')
          .select('id, name, description, category, icon, rarity, difficulty, reward_amount, reward_type, criteria')
          .order('rarity', { ascending: true })
          .order('difficulty', { ascending: true }),
        
        // Fetch user stats (only essential fields for achievements)
        supabase
          .from('user_level_stats')
          .select(`
            total_games,
            total_wins,
            total_profit,
            total_wagered,
            roulette_games,
            roulette_wins,
            roulette_green_wins,
            roulette_highest_win,
            tower_games,
            tower_highest_level,
            tower_perfect_games,
            coinflip_wins,
            total_cases_opened,
            chat_messages_count,
            login_days_count,
            account_created,
            best_win_streak,
            biggest_single_bet,
            current_level
          `)
          .eq('user_id', userId)
          .single(),
        
        // Fetch ready-to-claim achievements
        supabase
          .from('ready_to_claim_achievements')
          .select('achievement_id, ready_at')
          .eq('user_id', userId)
      ]);

      // Handle achievements
      if (achievementsResult.error) {
        console.error('Error fetching achievements:', achievementsResult.error);
      } else {
        setAchievements(achievementsResult.data || []);
      }

      // Handle user stats
      if (userStatsResult.error && userStatsResult.error.code !== 'PGRST116') {
        console.error('Error fetching user stats:', userStatsResult.error);
      } else {
        setUserStats(userStatsResult.data);
      }

      // Fetch user's unlocked achievements (lightweight)
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);

      if (userError) {
        console.error('Error fetching user achievements:', userError);
      } else {
        const unlockedAchievements = userAchievements || [];
        setUserAchievements(unlockedAchievements);

        // Get ready-to-claim achievements from the database
        if (readyToClaimResult.error) {
          console.error('Error fetching ready-to-claim achievements:', readyToClaimResult.error);
        } else {
          const readyToClaimIds = (readyToClaimResult.data || []).map(rta => rta.achievement_id);
          
          // Get full achievement details for ready-to-claim achievements
          const claimable = (achievementsResult.data || []).filter(achievement => 
            readyToClaimIds.includes(achievement.id)
          );

          setClaimableAchievements(claimable);
        }
      }
    } catch (error) {
      console.error('Error fetching achievement data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, isOwnProfile]);

  const calculateProgressForAchievement = (achievement: any, userStats: any): number => {
    if (!userStats) {
      return 0;
    }
    
    const criteria = achievement.criteria; // Use 'criteria' field from database
    const criteriaType = criteria?.type;
    const targetValue = criteria?.value || 0;

    let currentValue = 0;
    
    switch (criteriaType) {
      case 'total_games': 
        currentValue = userStats.total_games || 0; 
        break;
      case 'total_wins': 
        currentValue = userStats.total_wins || 0; 
        break;
      case 'total_profit': 
        currentValue = userStats.total_profit || 0; 
        break;
      case 'total_wagered': 
        currentValue = userStats.total_wagered || 0; 
        break;
      case 'roulette_games': 
        currentValue = userStats.roulette_games || 0; 
        break;
      case 'roulette_wins': 
        currentValue = userStats.roulette_wins || 0; 
        break;
      case 'roulette_green_wins': 
        currentValue = userStats.roulette_green_wins || 0; 
        break;
      case 'roulette_biggest_win': 
        currentValue = userStats.roulette_highest_win || 0; // Map to correct field
        break;
      case 'tower_games': 
        currentValue = userStats.tower_games || 0; 
        break;
      case 'tower_highest_level': 
        currentValue = userStats.tower_highest_level || 0; 
        break;
      case 'tower_perfect_games': 
        currentValue = userStats.tower_perfect_games || 0; 
        break;
      case 'coinflip_wins': 
        currentValue = userStats.coinflip_wins || 0; 
        break;
      case 'total_cases_opened': 
        currentValue = userStats.total_cases_opened || 0; 
        break;
      case 'account_created': 
        currentValue = userStats.account_created ? 1 : 0; 
        break;
      case 'chat_messages': 
        currentValue = userStats.chat_messages_count || 0; 
        break;
      case 'login_days': 
        currentValue = userStats.login_days_count || 0; 
        break;
      case 'win_streak': 
        currentValue = userStats.best_win_streak || 0; 
        break;
      case 'biggest_single_bet': 
        currentValue = userStats.biggest_single_bet || 0; 
        break;
      case 'user_level': 
        currentValue = userStats.current_level || 0; 
        break;
      default: 
        currentValue = 0; 
        break;
    }

    // Prevent division by zero and handle edge cases
    if (targetValue === 0) return 0;
    if (currentValue >= targetValue) return 100;
    
    return Math.min(100, (currentValue / targetValue) * 100);
  };

  const calculateProgress = (achievement: any): number => {
    // Memoize the calculation for better performance
    const cacheKey = `${achievement.id}-${JSON.stringify(userStats)}`;
    if (!calculateProgress.cache) {
      calculateProgress.cache = new Map();
    }
    
    if (calculateProgress.cache.has(cacheKey)) {
      return calculateProgress.cache.get(cacheKey);
    }
    
    const result = calculateProgressForAchievement(achievement, userStats);
    calculateProgress.cache.set(cacheKey, result);
    
    // Clear cache if it gets too large
    if (calculateProgress.cache.size > 100) {
      calculateProgress.cache.clear();
    }
    
    return result;
  };

  const claimAchievement = async (achievement: any) => {
    console.log('🎯 Claim achievement called:', achievement);
    console.log('🎯 isOwnProfile:', isOwnProfile);
    console.log('🎯 userId:', userId);
    console.log('🎯 Achievement details:', {
      id: achievement.id,
      name: achievement.name,
      reward_type: achievement.reward_type,
      reward_amount: achievement.reward_amount
    });
    
    if (!isOwnProfile) {
      console.log('❌ Not own profile, returning');
      return;
    }
    
    if (!userId) {
      console.log('❌ No userId, returning');
      return;
    }
    
    setClaiming(achievement.id);
    console.log('🎯 Starting claim process for achievement:', achievement.name);
    
    try {
      // Call the manual claim function
      console.log('🎯 Calling manual claim function with params:', {
        p_user_id: userId,
        p_achievement_id: achievement.id
      });
      
      const { data: claimResult, error: claimError } = await supabase.rpc('claim_achievement_manual', {
        p_user_id: userId,
        p_achievement_id: achievement.id
      });

      if (claimError) {
        console.error('❌ Error claiming achievement:', claimError);
        console.error('❌ Error details:', {
          message: claimError.message,
          details: claimError.details,
          hint: claimError.hint
        });
        throw claimError;
      }
      console.log('✅ Achievement claimed successfully:', claimResult);
      
      // Check if the claim was successful
      if (claimResult && claimResult.success) {
        console.log('✅ Claim was successful:', claimResult);
      } else if (claimResult && claimResult.error === 'Achievement already unlocked') {
        console.log('ℹ️ Achievement already unlocked, refreshing data...');
        // Just refresh the data to update the UI
        await fetchData();
        return; // Don't throw error, just return
      } else {
        console.error('❌ Claim was not successful:', claimResult);
        throw new Error('Claim was not successful: ' + JSON.stringify(claimResult));
      }

      // Reward is automatically awarded by the database function
      console.log('🎯 Reward automatically awarded by database function');

      // Show success notification
      console.log(`🎉 Achievement unlocked: ${achievement.name}! Reward: ${achievement.reward_type === 'money' ? '$' : ''}${achievement.reward_amount}${achievement.reward_type === 'cases' ? ' cases' : achievement.reward_type === 'xp' ? ' XP' : ''}`);

      // Show success notification to user
      const rewardText = achievement.reward_type === 'money' 
        ? `$${achievement.reward_amount}` 
        : achievement.reward_type === 'cases' 
        ? `${achievement.reward_amount} cases` 
        : `${achievement.reward_amount} XP`;
        
      // Show success notification (you can replace this with a toast system)
      console.log(`🎉 Achievement Claimed!\n\n${achievement.name}\nReward: ${rewardText}`);

      // Track newly claimed achievement for smooth transition
      setNewlyClaimed(prev => [...prev, achievement.id]);

      // Refresh achievements data to update the UI
      console.log('🎯 Refreshing achievement data...');
      await fetchData();
      
      // Verify the achievement was removed from ready-to-claim
      console.log('🎯 Verifying achievement was removed from ready-to-claim...');
      const { data: remainingReadyToClaim } = await supabase
        .from('ready_to_claim_achievements')
        .select('achievement_id')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id);
      
      if (remainingReadyToClaim && remainingReadyToClaim.length > 0) {
        console.error('❌ Achievement still in ready-to-claim after claiming!');
      } else {
        console.log('✅ Achievement successfully removed from ready-to-claim');
      }
      
      // Verify the achievement was added to unlocked
      console.log('🎯 Verifying achievement was added to unlocked...');
      const { data: unlockedAchievement } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id);
      
      if (unlockedAchievement && unlockedAchievement.length > 0) {
        console.log('✅ Achievement successfully added to unlocked');
      } else {
        console.error('❌ Achievement not found in unlocked achievements!');
      }
      
      // Also refresh user profile data to update balance display
      if (achievement.reward_type === 'money') {
        // Trigger a refresh of the user profile data
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('balance, level, xp, total_wagered, total_profit')
          .eq('id', userId)
          .single();
          
        if (updatedProfile) {
          // Update the user profile data in the parent component
          if (propUserData) {
            // If we have propUserData, update it through the parent
            // This will trigger a re-render with updated balance
            console.log('Updated balance:', updatedProfile.balance);
            onUserDataUpdate?.(); // Call the callback to update the parent's userData
          }
        }
      }
      
      // Clear the newly claimed status after a delay
      setTimeout(() => {
        setNewlyClaimed(prev => prev.filter(id => id !== achievement.id));
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error claiming achievement:', error);
    } finally {
      setClaiming(null);
      console.log('🎯 Claim process completed');
    }
  };

  const isUnlocked = (achievementId: string): boolean => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getUnlockDate = (achievementId: string): string | null => {
    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievementId);
    return userAchievement?.unlocked_at || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => isUnlocked(a.id));
  const lockedAchievements = achievements.filter(a => !isUnlocked(a.id));

  return (
    <div className="space-y-6">
      {/* Achievement Stats */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Achievement Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{unlockedAchievements.length}</div>
              <div className="text-sm text-muted-foreground">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{achievements.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {unlockedAchievements.filter(a => a.rarity === 'legendary').length}
              </div>
              <div className="text-sm text-muted-foreground">Legendary</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                ${unlockedAchievements.reduce((sum, a) => sum + (a.reward_amount || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Earned Rewards</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claimable Achievements */}
      {isOwnProfile && claimableAchievements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-400 animate-pulse" />
            Ready to Claim ({claimableAchievements.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {claimableAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              
              return (
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105 animate-pulse`} style={{ animationDuration: '2s' }}>
                  <CardContent className="p-4 text-center">
                    <div className="mb-3">
                      <div className="w-8 h-8 mx-auto bg-green-500/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse" style={{ animationDuration: '3s' }}>
                        <IconComponent className="w-4 h-4 text-green-400" />
                      </div>
                    </div>
                    <h3 className="font-bold mb-1 text-green-400 text-sm">{achievement.name}</h3>
                    <p className="text-xs text-green-300/80 mb-2 line-clamp-2">{achievement.description}</p>
                    
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary" className={`capitalize text-xs ${difficultyColors[achievement.difficulty]} text-xs`}>
                        {achievement.difficulty}
                      </Badge>
                      <Badge variant="secondary" className={`capitalize text-xs ${rarityColors[achievement.rarity]} bg-white/10 text-xs`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                    
                    <div className="text-xs space-y-2">
                      <div className="flex items-center justify-center gap-1 text-green-400 font-semibold">
                        <DollarSign className="w-3 h-3" />
                        <span>+${achievement.reward_amount}</span>
                      </div>
                      
                      <Button
                        onClick={() => {
                          console.log('🎯 Claim button clicked for:', achievement.name);
                          claimAchievement(achievement);
                        }}
                        disabled={claiming === achievement.id}
                        className="w-full h-7 text-xs bg-green-500 hover:bg-green-400 text-white border-0 transition-all duration-300 hover:scale-105"
                      >
                        {claiming === achievement.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Claim Reward'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Unlocked Achievements ({unlockedAchievements.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const unlockDate = getUnlockDate(achievement.id);
              
              return (
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br ${rarityGradients[achievement.rarity]} opacity-90 hover:opacity-100 transition-all duration-500 hover:scale-105 border ${rarityColors[achievement.rarity]} ${newlyClaimed.includes(achievement.id) ? 'animate-pulse bg-gradient-to-br from-green-500/30 to-emerald-500/30' : ''}`} style={newlyClaimed.includes(achievement.id) ? { animationDuration: '1s' } : {}}>
                  <CardContent className="p-4 text-center">
                    <div className="mb-3">
                      <div className="w-8 h-8 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold mb-1 text-white text-sm">{achievement.name}</h3>
                    <p className="text-xs opacity-90 text-white mb-2 line-clamp-2">{achievement.description}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary" className={`capitalize text-xs ${difficultyColors[achievement.difficulty]}`}>
                        {achievement.difficulty}
                      </Badge>
                      <Badge variant="secondary" className={`capitalize text-xs ${rarityColors[achievement.rarity]} bg-white/10`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-center gap-1 text-green-400">
                        <DollarSign className="w-3 h-3" />
                        <span>+${achievement.reward_amount}</span>
                      </div>
                      {unlockDate && (
                        <div className="text-xs text-white/70">
                          Unlocked: {new Date(unlockDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Achievements (Only for Own Profile) */}
      {isOwnProfile && lockedAchievements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            Locked Achievements ({lockedAchievements.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const progress = calculateProgress(achievement);
              const isNearlyComplete = progress >= 75;
              
              return (
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-600/30 opacity-60 hover:opacity-80 transition-all duration-300 ${isNearlyComplete ? 'hover:scale-105 border-yellow-500/30' : ''}`}>
                  <CardContent className="p-4 text-center">
                    <div className="mb-3">
                      <div className="w-8 h-8 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="font-bold mb-1 text-gray-300 text-sm">{achievement.name}</h3>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{achievement.description}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary" className={`capitalize text-xs ${difficultyColors[achievement.difficulty]} opacity-70`}>
                        {achievement.difficulty}
                      </Badge>
                      <Badge variant="secondary" className={`capitalize text-xs ${rarityColors[achievement.rarity]} bg-gray-700/30 opacity-70`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-green-400/70">
                        <DollarSign className="w-3 h-3" />
                        <span>+${achievement.reward_amount}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Progress</span>
                          <span className={progress >= 100 ? 'text-green-400' : 'text-gray-400'}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress 
                          value={progress} 
                          className={`h-2 ${isNearlyComplete ? 'bg-yellow-500/20' : 'bg-gray-700/50'}`} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {unlockedAchievements.length === 0 && !isOwnProfile && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
          <p className="text-muted-foreground">This player hasn't unlocked any achievements yet.</p>
        </div>
      )}

      {unlockedAchievements.length === 0 && isOwnProfile && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Start Your Journey!</h3>
          <p className="text-muted-foreground">Play games to unlock your first achievements and earn rewards!</p>
        </div>
      )}
    </div>
  );
}
