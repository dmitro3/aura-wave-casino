
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Wallet, Gamepad2, LogOut, TrendingUp, Target, Building, Gift, LogIn, Bell, BellDot, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import AdminPanel from '@/components/AdminPanel';

import CoinflipGame from '@/components/CoinflipGame';
import { RealtimeChat } from '@/components/RealtimeChat';
import { RouletteGame } from '@/components/RouletteGame';
import { Footer } from '@/components/Footer';
import { TowerGame } from '@/components/TowerGame';
import { UserLevelDisplay } from '@/components/UserLevelDisplay';
import { LiveLevelUpNotification } from '@/components/LiveLevelUpNotification';
import { ProfileBorder } from '@/components/ProfileBorder';
import { useLevelSync } from '@/contexts/LevelSyncContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBalanceAnimation } from '@/hooks/useBalanceAnimation';
import { FloatingBalanceIncrease } from '@/components/FloatingBalanceIncrease';
import { AnimatedBalance } from '@/components/AnimatedBalance';
import { MaintenanceAwareGame } from '@/components/MaintenanceAwareGame';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

interface IndexProps {
  initialGame?: string;
}

export default function Index({ initialGame }: IndexProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const { userData, loading: profileLoading, updateUserProfile } = useUserProfile();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current game from URL
  const getCurrentGame = () => {
    const path = location.pathname;
    if (path === '/roulette') return 'roulette';
    if (path === '/coinflip') return 'coinflip';
    if (path === '/tower') return 'tower';
    return initialGame || 'coinflip';
  };

  const [currentGame, setCurrentGame] = useState(getCurrentGame());
  const { increases, checkBalanceChange } = useBalanceAnimation();

  // Notification functions
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications on mount and set up real-time subscription
  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel(`notifications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification;
              setNotifications(prev => [newNotification, ...prev]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Update current game when URL changes
  useEffect(() => {
    setCurrentGame(getCurrentGame());
  }, [location.pathname, initialGame]);

  // Monitor balance changes for animation
  useEffect(() => {
    if (userData?.balance !== undefined) {
      checkBalanceChange(userData.balance);
    }
  }, [userData?.balance, checkBalanceChange]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGameChange = (game: string) => {
    setCurrentGame(game);
    // Update URL without page reload
    if (game === 'coinflip' && location.pathname !== '/coinflip') {
      navigate('/coinflip', { replace: true });
    } else if (game === 'roulette' && location.pathname !== '/roulette') {
      navigate('/roulette', { replace: true });
    } else if (game === 'tower' && location.pathname !== '/tower') {
      navigate('/tower', { replace: true });
    } else if (game === 'coinflip' && location.pathname === '/') {
      navigate('/coinflip', { replace: true });
    }
  };

  const { levelStats } = useLevelSync();

  const getXpForNextLevel = (level: number) => level * 100;
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
    <div className="min-h-screen">
      {/* Main Content Container */}
      <div className="p-4 pb-32">
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
              {/* Notification Button - Only show for authenticated users */}
              {user && (
                <Dialog open={notificationModalOpen} onOpenChange={setNotificationModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative px-3 py-1 glass rounded-lg"
                    >
                      {unreadCount > 0 ? (
                        <BellDot className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center justify-between">
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllNotificationsAsRead}
                            className="text-xs"
                          >
                            Mark all read
                          </Button>
                        )}
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-96">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 rounded-lg border transition-colors ${
                                notification.is_read
                                  ? 'bg-card/20 border-border/50'
                                  : 'bg-primary/10 border-primary/20'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">
                                    {notification.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  {!notification.is_read && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => markNotificationAsRead(notification.id)}
                                      className="p-1 h-6 w-6"
                                    >
                                      ✓
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteNotification(notification.id)}
                                    className="p-1 h-6 w-6 text-red-400 hover:text-red-300"
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}

              {/* Balance Display - Only show for authenticated users */}
              {user && userData && (
                <div className="relative flex items-center space-x-2 glass px-3 py-1 rounded-lg">
                  <Wallet className="w-4 h-4 text-primary" />
                  <AnimatedBalance
                    balance={userData.balance}
                    className="font-semibold"
                  />
                  <FloatingBalanceIncrease increases={increases} />
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

              {/* Admin Panel Button - Only show for authenticated users */}
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAdminPanel(true)}
                  className="glass border-0 hover:glow-primary transition-smooth"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}

              {/* Enhanced Level Display - Only show for authenticated users */}
              {user && userData && (
                <>
                  {/* Desktop Version */}
                  <UserLevelDisplay 
                    username={userData.username}
                    showXP={true}
                    size="md"
                    className="hidden md:flex"
                    clickable={true}
                    onClick={() => setShowProfile(true)}
                  />
                  
                  {/* Mobile Version */}
                  <div 
                    className="flex md:hidden items-center gap-2 cursor-pointer hover:bg-primary/10 rounded-lg p-2 -m-2 transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => setShowProfile(true)}
                  >
                    <div className="relative">
                      <ProfileBorder level={levelStats?.current_level || 1} size="sm">
                        <div className="w-8 h-8 rounded-full overflow-hidden relative">
                          <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                            alt={`${userData.username} avatar`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                            <span className="text-white text-xs font-bold block text-center leading-none">
                              {(levelStats?.current_level || 1) >= 100 ? '👑' : (levelStats?.current_level || 1)}
                            </span>
                          </div>
                        </div>
                      </ProfileBorder>
                    </div>
                    <span className="font-semibold text-sm">{userData.username}</span>
                  </div>
                </>
              )}

              {/* User Menu or Sign In Button */}
              {user && userData ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="glass border-0 hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
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
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 pb-8">
        {/* Left Sidebar - Games Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass border-0 bg-gradient-to-br from-card/50 to-card/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                </div>
                Games
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => handleGameChange('coinflip')}
                variant={currentGame === 'coinflip' ? 'default' : 'ghost'}
                className={`w-full justify-start px-3 py-2 h-10 transition-all duration-200 hover:scale-[1.02] ${
                  currentGame === 'coinflip' 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                    : 'hover:bg-primary/10 hover:text-primary border-0'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    currentGame === 'coinflip' 
                      ? 'bg-white/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Gamepad2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm">Coinflip</span>
                </div>
              </Button>
              
              <Button
                onClick={() => handleGameChange('roulette')}
                variant={currentGame === 'roulette' ? 'default' : 'ghost'}
                className={`w-full justify-start px-3 py-2 h-10 transition-all duration-200 hover:scale-[1.02] ${
                  currentGame === 'roulette' 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                    : 'hover:bg-primary/10 hover:text-primary border-0'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    currentGame === 'roulette' 
                      ? 'bg-white/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm">Roulette</span>
                </div>
              </Button>
              
              <Button
                onClick={() => handleGameChange('tower')}
                variant={currentGame === 'tower' ? 'default' : 'ghost'}
                className={`w-full justify-start px-3 py-2 h-10 transition-all duration-200 hover:scale-[1.02] ${
                  currentGame === 'tower' 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                    : 'hover:bg-primary/10 hover:text-primary border-0'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    currentGame === 'tower' 
                      ? 'bg-white/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm">Tower</span>
                </div>
              </Button>
              
              <Button
                disabled
                variant="ghost"
                className="w-full justify-start px-3 py-2 h-10 opacity-50 cursor-not-allowed hover:bg-muted/10 border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-muted/20">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-muted-foreground">Crash</div>
                    <div className="text-xs text-muted-foreground/70 leading-tight">Coming Soon</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Games Area */}
        <div className="lg:col-span-7">
          <div className="space-y-4">
            <div style={{ display: currentGame === 'coinflip' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Coinflip">
                {user && userData ? (
                  <CoinflipGame userData={userData} onUpdateUser={updateUserProfile} />
                ) : (
                  <CoinflipGame userData={null} onUpdateUser={() => Promise.resolve()} />
                )}
              </MaintenanceAwareGame>
            </div>

            <div style={{ display: currentGame === 'roulette' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Roulette">
                {user && userData ? (
                  <RouletteGame userData={userData} onUpdateUser={updateUserProfile} />
                ) : (
                  <RouletteGame userData={null} onUpdateUser={() => Promise.resolve()} />
                )}
              </MaintenanceAwareGame>
            </div>

            <div style={{ display: currentGame === 'tower' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Tower">
                {user && userData ? (
                  <TowerGame userData={userData} onUpdateUser={updateUserProfile} />
                ) : (
                  <TowerGame userData={null} onUpdateUser={() => Promise.resolve()} />
                )}
              </MaintenanceAwareGame>
            </div>

            <div style={{ display: currentGame === 'crash' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Crash">
                <Card className="glass border-0 p-12 text-center">
                  <div className="space-y-4">
                    <div className="text-4xl">🚀</div>
                    <h3 className="text-xl font-semibold">Crash Game Coming Soon!</h3>
                    <p className="text-muted-foreground">
                      We're working on an exciting crash game with live multipliers and real-time action.
                    </p>
                  </div>
                </Card>
              </MaintenanceAwareGame>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Real-time Chat */}
        <div className="lg:col-span-2 h-[calc(100vh-16rem)]">
          <RealtimeChat />
        </div>
      </div>

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

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />

        {/* Live Level-Up Notifications - Only show for authenticated users */}
        {user && <LiveLevelUpNotification />}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
