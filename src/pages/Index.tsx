import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Wallet, Trophy, Gamepad2, LogOut, TrendingUp } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import RewardsPanel from '@/components/RewardsPanel';
import CoinflipGame from '@/components/CoinflipGame';

export default function Index() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentGamblingUser');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      const users = JSON.parse(localStorage.getItem('gamblingUsers') || '{}');
      setUserData(users[currentUser] || null);
    } else {
      setUserData(null);
    }
  }, [currentUser]);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('currentGamblingUser', username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserData(null);
    localStorage.removeItem('currentGamblingUser');
  };

  const updateUserData = (newData: any) => {
    const users = JSON.parse(localStorage.getItem('gamblingUsers') || '{}');
    users[currentUser!] = newData;
    localStorage.setItem('gamblingUsers', JSON.stringify(users));
    setUserData(newData);
  };

  const getXpForNextLevel = (level: number) => level * 100;
  const xpProgress = userData ? (userData.xp / getXpForNextLevel(userData.level)) * 100 : 0;

  if (!currentUser) {
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
          onLogin={handleLogin}
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
                  ${userData?.balance?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Level Display */}
              <div className="hidden md:flex items-center space-x-2 glass px-3 py-1 rounded-lg">
                <Trophy className="w-4 h-4 text-accent" />
                <span className="font-semibold">
                  Level {userData?.level || 1}
                </span>
              </div>

              {/* User Menu */}
              <Button
                variant="ghost"
                onClick={() => setShowProfile(true)}
                className="glass border-0 hover:glow-primary transition-smooth"
              >
                <User className="w-4 h-4 mr-2" />
                {userData?.username}
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
              <span>Level {userData?.level || 1} Progress</span>
              <span>{userData?.xp || 0} / {getXpForNextLevel(userData?.level || 1)} XP</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <RewardsPanel userData={userData} onUpdateUser={updateUserData} />
          
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
                <span className="font-semibold">${userData?.totalWagered?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total P&L</span>
                <span className={`font-semibold ${(userData?.totalProfit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {(userData?.totalProfit || 0) >= 0 ? '+' : ''}${userData?.totalProfit?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Games Played</span>
                <span className="font-semibold">
                  {((userData?.gameStats?.coinflip?.wins || 0) + (userData?.gameStats?.coinflip?.losses || 0) + 
                    (userData?.gameStats?.crash?.wins || 0) + (userData?.gameStats?.crash?.losses || 0))}
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
              <TabsTrigger value="crash" className="flex-1" disabled>
                <TrendingUp className="w-4 h-4 mr-2" />
                Crash (Coming Soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="coinflip">
              <CoinflipGame userData={userData} onUpdateUser={updateUserData} />
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
