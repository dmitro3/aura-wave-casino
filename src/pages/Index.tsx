import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Coins, User, Star, TrendingUp, Gift, Gamepad2 } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import UserStatsModal from '@/components/UserStatsModal';
import CoinflipGame from '@/components/CoinflipGame';
import { TowerGame } from '@/components/TowerGame';
import { RouletteGame } from '@/components/RouletteGame';
import { RealtimeChat } from '@/components/RealtimeChat';
import { LevelUpNotification } from '@/components/LevelUpNotification';
import RewardsPanel from '@/components/RewardsPanel';


export default function Index() {
  const { user, signOut } = useAuth();
  const { userData, loading, updateUserProfile } = useUserProfile();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserStatsModal, setShowUserStatsModal] = useState(false);
  const [selectedStatsUser, setSelectedStatsUser] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState<'coinflip' | 'tower' | 'roulette'>('tower');

  // Listen for custom events from game components to open user stats
  useEffect(() => {
    const handleOpenUserStats = (event: CustomEvent) => {
      setSelectedStatsUser(event.detail.username);
      setShowUserStatsModal(true);
    };

    window.addEventListener('openUserStats', handleOpenUserStats as EventListener);
    return () => {
      window.removeEventListener('openUserStats', handleOpenUserStats as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen grid grid-cols-1 lg:grid-cols-5 gap-2 p-2">
        {/* Left Sidebar - User Profile */}
        <Card className="glass border-0 lg:col-span-1 h-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="text-lg font-bold">Profile</span>
              <User className="w-5 h-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && userData ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border-2 border-primary/50">
                    <span className="text-xl font-bold text-primary">
                      {userData.username[0].toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg">{userData.username}</h3>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/50">
                    Level {userData.current_level}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium">Balance</span>
                    </div>
                    <span className="font-bold text-emerald-400">${userData.balance.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium">XP</span>
                    </div>
                    <span className="font-bold text-yellow-400">{userData.current_xp}/{userData.current_xp + userData.xp_to_next_level}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">Total P&L</span>
                    </div>
                    <span className={`font-bold ${userData.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {userData.total_profit >= 0 ? '+' : ''}${userData.total_profit.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4" />
                    Game Selection
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant={currentGame === 'tower' ? 'default' : 'outline'}
                      onClick={() => setCurrentGame('tower')}
                      className="justify-start"
                    >
                      🏰 Tower Quest
                    </Button>
                    <Button
                      variant={currentGame === 'coinflip' ? 'default' : 'outline'}
                      onClick={() => setCurrentGame('coinflip')}
                      className="justify-start"
                    >
                      🪙 Coinflip
                    </Button>
                    <Button
                      variant={currentGame === 'roulette' ? 'default' : 'outline'}
                      onClick={() => setCurrentGame('roulette')}
                      className="justify-start"
                    >
                      🎰 Roulette
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUserModal(true)}
                    className="w-full"
                  >
                    <User className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={signOut}
                    className="w-full"
                  >
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-card/50 flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
                <Button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full gradient-primary hover:glow-primary"
                >
                  Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Game Area */}
        <div className="lg:col-span-3 h-full">
          {currentGame === 'tower' && userData && (
            <TowerGame userData={userData} onUpdateUser={updateUserProfile} />
          )}
          {currentGame === 'coinflip' && userData && (
            <CoinflipGame userData={userData} onUpdateUser={updateUserProfile} />
          )}
          {currentGame === 'roulette' && (
            <RouletteGame />
          )}
        </div>

        {/* Right Sidebar - Chat */}
        <div className="lg:col-span-1 h-full">
          <RealtimeChat />
        </div>
      </div>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      {userData && (
        <UserProfile
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          userData={userData}
        />
      )}

      <UserStatsModal
        isOpen={showUserStatsModal}
        onClose={() => {
          setShowUserStatsModal(false);
          setSelectedStatsUser(null);
        }}
        username={selectedStatsUser}
      />

      
    </div>
  );
}