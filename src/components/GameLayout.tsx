import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { User, Wallet, Gift, LogOut, LogIn, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import { UserLevelDisplay } from '@/components/UserLevelDisplay';
import { LiveLevelUpNotification } from '@/components/LiveLevelUpNotification';
import { useLevelSync } from '@/contexts/LevelSyncContext';
import { useNavigate } from 'react-router-dom';

interface GameLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function GameLayout({ children, title }: GameLayoutProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const { userData, loading: profileLoading } = useUserProfile();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const { levelStats } = useLevelSync();
  const xpProgress = levelStats ? (levelStats.current_level_xp / (levelStats.current_level_xp + levelStats.xp_to_next_level)) * 100 : 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 rounded-2xl text-center">
          <div className="text-2xl mb-4">🎮</div>
          <p className="text-muted-foreground">Loading ArcadeFinance...</p>
        </div>
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
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="glass border-0 hover:glow-primary transition-smooth p-2"
                >
                  <Home className="w-4 h-4" />
                </Button>
                <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                  ArcadeFinance
                </h1>
              </div>
              <div className="hidden md:block text-sm text-muted-foreground">
                {title}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Balance Display - Only show for authenticated users */}
              {user && userData && (
                <div className="flex items-center space-x-2 glass px-3 py-1 rounded-lg">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-semibold">
                    ${userData.balance.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Rewards Button - Only show for authenticated users */}
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/rewards')}
                  className="glass border-0 hover:glow-primary transition-smooth"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Rewards
                </Button>
              )}

              {/* Enhanced Level Display - Only show for authenticated users */}
              {user && userData && (
                <UserLevelDisplay 
                  username={userData.username}
                  showXP={true}
                  size="md"
                  className="hidden md:flex"
                />
              )}

              {/* User Menu or Sign In Button */}
              {user && userData ? (
                <>
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
                </>
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  className="glass border-0 hover:glow-primary transition-smooth"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* XP Progress Bar - Only show for authenticated users */}
          {user && levelStats && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Level {levelStats.current_level} Progress</span>
                <span>{levelStats.current_level_xp} / {levelStats.current_level_xp + levelStats.xp_to_next_level} XP</span>
              </div>
              <Progress value={xpProgress} className="h-2" />
            </div>
          )}

          {/* Guest Notice */}
          {!user && (
            <div className="mt-3 p-3 glass rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                🎮 Browsing as Guest - <span 
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in
                </span> to play games and earn rewards!
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Profile Modal - Only show for authenticated users */}
      {user && userData && (
        <UserProfile
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          userData={userData}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Live Level-Up Notifications - Only show for authenticated users */}
      {user && <LiveLevelUpNotification />}
    </div>
  );
}