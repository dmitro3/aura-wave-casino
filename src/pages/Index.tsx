
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Wallet, Trophy, Gamepad2, LogOut, TrendingUp, Target, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import RewardsPanel from '@/components/RewardsPanel';
import CoinflipGame from '@/components/CoinflipGame';
import { RealtimeChat } from '@/components/RealtimeChat';
import { RouletteGame } from '@/components/RouletteGame';
import { TowerGame } from '@/components/TowerGame';
import NotificationsPanel from '@/components/NotificationsPanel';
import { UserLevelDisplay } from '@/components/UserLevelDisplay';

export default function Index() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { userData, loading: profileLoading, updateUserProfile } = useUserProfile();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getXpForNextLevel = (level: number) => level * 100;
  const xpProgress = userData ? (userData.current_xp / (userData.current_xp + userData.xp_to_next_level)) * 100 : 0;

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 rounded-2xl text-center">
          <div className="text-2xl mb-4">🎮</div>
          <p className="text-muted-foreground">Loading ArcadeFinance...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold gradient-primary bg-clip-text text-transparent">
              ArcadeFinance
            </h1>
            <p className="text-xl text-muted-foreground">
              The Future of Digital Gaming
            </p>
          </div>
          
          <div className="glass p-8 rounded-2xl space-y-4 animate-float">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-semibold">
              Welcome to the Arcade
            </h2>
            <p className="text-muted-foreground">
              Experience next-generation gaming with sleek design, 
              real-time rewards, and immersive gameplay.
            </p>
            <Button 
              onClick={() => setShowAuthModal(true)}
              className="w-full gradient-primary hover:glow-primary transition-smooth"
              size="lg"
            >
              Enter the Arena
            </Button>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <header className="mb-6">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                ArcadeFinance
              </h1>
              <div className="hidden md:block text-sm text-muted-foreground">
                The Future of Digital Gaming
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Balance Display */}
              <div className="flex items-center space-x-2 glass px-3 py-1 rounded-lg">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-semibold">
                  ${userData.balance.toFixed(2)}
                </span>
              </div>

              {/* Enhanced Level Display */}
              <UserLevelDisplay 
                username={userData.username}
                showXP={true}
                size="md"
                className="hidden md:flex"
              />

              {/* User Menu */}
              <Button
                variant="ghost"
                onClick={() => setShowProfile(true)}
                className="glass border-0 hover:glow-primary transition-smooth"
              >
                <User className="w-4 h-4 mr-2" />
                {userData.username}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="glass border-0 hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Level {userData.current_level} Progress</span>
              <span>{userData.current_xp} / {userData.current_xp + userData.xp_to_next_level} XP</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <NotificationsPanel />
          <RewardsPanel userData={userData} onUpdateUser={updateUserProfile} />
          
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-accent" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Wagered</span>
                <span className="font-semibold">${userData.total_wagered.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total P&L</span>
                <span className={`font-semibold ${userData.total_profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {userData.total_profit >= 0 ? '+' : ''}${userData.total_profit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Games Played</span>
                <span className="font-semibold">
                  {userData.gameStats.coinflip.wins + userData.gameStats.coinflip.losses + 
                   userData.gameStats.crash.wins + userData.gameStats.crash.losses}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Games Area */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="coinflip" className="space-y-4">
            <TabsList className="glass w-full">
              <TabsTrigger value="coinflip" className="flex-1">
                <Gamepad2 className="w-4 h-4 mr-2" />
                Coinflip
              </TabsTrigger>
              <TabsTrigger value="roulette" className="flex-1">
                <Target className="w-4 h-4 mr-2" />
                Roulette
              </TabsTrigger>
              <TabsTrigger value="tower" className="flex-1">
                <Building className="w-4 h-4 mr-2" />
                Tower
              </TabsTrigger>
              <TabsTrigger value="crash" className="flex-1" disabled>
                <TrendingUp className="w-4 h-4 mr-2" />
                Crash (Coming Soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="coinflip">
              <CoinflipGame userData={userData} onUpdateUser={updateUserProfile} />
            </TabsContent>

            <TabsContent value="roulette">
              <RouletteGame />
            </TabsContent>

            <TabsContent value="tower">
              <TowerGame userData={userData} onUpdateUser={updateUserProfile} />
            </TabsContent>

            <TabsContent value="crash">
              <Card className="glass border-0 p-12 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">🚀</div>
                  <h3 className="text-xl font-semibold">Crash Game Coming Soon!</h3>
                  <p className="text-muted-foreground">
                    We're working on an exciting crash game with live multipliers and real-time action.
                  </p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Real-time Chat */}
        <div className="lg:col-span-2 h-[calc(100vh-12rem)]">
          <RealtimeChat />
        </div>
      </div>

      {/* Profile Modal */}
      <UserProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        userData={userData}
      />
    </div>
  );
}
