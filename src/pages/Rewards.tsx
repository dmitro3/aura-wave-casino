import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Gift, Package, Trophy, Clock, Zap, Crown, Sparkles, Coins, Star, Lock, Unlock, Bell, BellDot, Shield, Wallet, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFreeCases } from '@/hooks/useFreeCases';
import { useLevelDailyCases } from '@/hooks/useLevelDailyCases';
import { useCaseHistory } from '@/hooks/useCaseHistory';
import { CyberpunkCaseOpeningModal } from '@/components/CyberpunkCaseOpeningModal';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { useCountdown, getNextMidnight, formatCountdown } from '@/hooks/useCountdown';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import AdminPanel from '@/components/AdminPanel';
import { ProfileBorder } from '@/components/ProfileBorder';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';
import { useBalanceAnimation } from '@/hooks/useBalanceAnimation';
import { FloatingBalanceIncrease } from '@/components/FloatingBalanceIncrease';
import { AnimatedBalance } from '@/components/AnimatedBalance';
import { CyberpunkNotificationsPanel } from '@/components/CyberpunkNotificationsPanel';
import { formatXP } from '@/lib/xpUtils';
import { calculateAccurateXPProgress } from '@/lib/levelRequirements';

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userData } = useUserProfile();
  const { stats: userLevelStats } = useUserLevelStats();
  const { claimableAchievements } = useAchievementNotifications();
  const { increases } = useBalanceAnimation();
  
  const { caseStatuses, selectedFreeCase, openFreeCaseModal, handleFreeCaseOpened, closeFreeCaseModal } = useFreeCases();
  const { 
    cases: levelDailyCases, 
    loading: levelCasesLoading, 
    openingCase, 
    openCase: openLevelCase, 
    canOpenCase, 
    getCaseStatusText, 
    getCaseStatusColor, 
    getCaseButtonVariant,
    fetchCases: refreshLevelCases
  } = useLevelDailyCases();
  const { history, stats, loading: historyLoading, formatDate, getRarityColor, getCaseTypeDisplayName } = useCaseHistory();
  const { toast } = useToast();

  const [selectedLevelCase, setSelectedLevelCase] = useState<any | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  
  // Countdown to next midnight
  const nextMidnight = getNextMidnight();
  const countdown = useCountdown(nextMidnight);
  
  // Calculate effective stats
  const effectiveStats = userLevelStats || { current_level: 1, lifetime_xp: 0 };
  const displayXP = effectiveStats.lifetime_xp;
  const displayCurrentLevelXP = calculateAccurateXPProgress(effectiveStats.current_level, effectiveStats.lifetime_xp).current_level_xp;
  const displayProgress = calculateAccurateXPProgress(effectiveStats.current_level, effectiveStats.lifetime_xp).progress_percentage;
  
  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLevelCaseOpened = async (caseId: string) => {
    // Find the case data and just open the modal (don't actually open the case yet)
    const caseData = levelDailyCases.find(c => c.id === caseId);
    if (caseData) {
      setSelectedLevelCase(caseData);
    }
  };

  const handleLevelCaseClosed = (shouldRefresh = false) => {
    setSelectedLevelCase(null);
    // Only refresh if a case was actually opened
    if (shouldRefresh) {
      refreshLevelCases();
    }
  };

  const handleTestReset = async () => {
    if (!user) return;
    
    try {
      // Call the test reset function
      const { error } = await supabase.rpc('test_reset_user_daily_cases', {
        user_uuid: user.id
      });
      
      if (error) {
        console.error('Error resetting cases:', error);
        toast({
          title: 'Error',
          description: 'Failed to reset cases. Please try again.',
          variant: 'destructive'
        });
        return;
      }
      
      // Refresh the cases to show the updated state
      refreshLevelCases();
      
      toast({
        title: 'Success',
        description: 'All daily cases have been reset for testing!',
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Error resetting cases:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset cases. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        setIsAdmin(profile?.is_admin || false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }

        setNotifications(data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [user]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  if (levelCasesLoading || historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg" />
          <div className="relative z-10 p-8 text-center">
            <div className="text-4xl mb-4 animate-pulse">📦</div>
            <p className="text-muted-foreground">Loading reward systems...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cyberpunk Base Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated Circuit Board Grid */}
      <div className="fixed inset-0 opacity-[0.15]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.5)_1px,transparent_0)] bg-[20px_20px] animate-grid-move-slow" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[40px_40px]" />
      </div>
      
      {/* Dynamic Energy Lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow delay-1000" />
        <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-energy-flow delay-2000" />
        
        <div className="absolute left-0 top-1/4 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-energy-flow-horizontal" />
        <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-energy-flow-horizontal delay-1500" />
        <div className="absolute left-0 top-2/3 w-full h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-energy-flow-horizontal delay-3000" />
      </div>
      
      {/* Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-3 h-3 rounded-full opacity-20",
              i % 3 === 0 ? "bg-primary/40" : i % 3 === 1 ? "bg-accent/40" : "bg-purple-400/40",
              "animate-float-orb"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* Corner Tech Details */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64">
          <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-primary/40 animate-cyber-corner" />
          <div className="absolute top-4 left-4 w-8 h-8 border-l border-t border-accent/30 animate-cyber-corner delay-300" />
        </div>
        <div className="absolute top-0 right-0 w-64 h-64">
          <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-primary/40 animate-cyber-corner" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r border-t border-accent/30 animate-cyber-corner delay-300" />
        </div>
        <div className="absolute bottom-0 left-0 w-64 h-64">
          <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-primary/40 animate-cyber-corner" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b border-accent/30 animate-cyber-corner delay-300" />
        </div>
        <div className="absolute bottom-0 right-0 w-64 h-64">
          <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-primary/40 animate-cyber-corner" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-accent/30 animate-cyber-corner delay-300" />
        </div>
      </div>
      
      {/* Ambient Glow Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>
      
      {/* Main Content Container */}
      <div className="relative z-10 p-4 pb-32">
        
        {/* Header */}
        <header className="mb-6">
          <div className="relative overflow-hidden group">
            {/* Cyberpunk Background with Advanced Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
            
            {/* Animated Circuit Board Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
            </div>
            
            {/* Animated Border Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            {/* Scan Line Effects */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-cyber-scan-horizontal" />
              <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/60 to-transparent animate-cyber-scan left-1/4" />
              <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-primary/60 to-transparent animate-cyber-scan right-1/3 delay-1000" />
            </div>
            
            {/* Tech Corner Details */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-primary/60" />
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-accent/60" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-accent/60" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-primary/60" />
            
            {/* Floating Energy Orbs */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute w-2 h-2 rounded-full",
                    i % 2 === 0 ? "bg-primary/20" : "bg-accent/20",
                    "animate-float-orb"
                  )}
                  style={{
                    left: `${15 + (i * 15)}%`,
                    top: `${20 + (i % 3) * 30}%`,
                    animationDelay: `${i * 0.8}s`,
                    animationDuration: `${6 + i}s`
                  }}
                />
              ))}
            </div>
            
            {/* Main Header Content */}
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="relative overflow-hidden backdrop-blur-sm transition-all duration-300 p-2 hover:bg-primary/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2 relative z-10" />
                    <span className="relative z-10">Return</span>
                  </Button>
                  
                  {/* Logo Section with Advanced Effects */}
                  <div className="relative group/logo">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur-md group-hover/logo:blur-lg transition-all duration-300" />
                    <div className="relative">
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-cyber-logo-shine">
                        REWARD VAULT
                      </h1>
                      <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Cyberpunk Tagline */}
                  <div className="hidden md:block relative">
                    <div className="text-sm text-slate-300 font-mono tracking-wider">
                      Advanced Case Management
                      <span className="inline-block w-2 h-4 bg-primary/60 ml-1 animate-cyber-typing">|</span>
                    </div>
                    <div className="absolute -bottom-1 left-0 w-3/4 h-px bg-gradient-to-r from-accent/60 to-transparent" />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Cyberpunk Notification System - Only show for authenticated users */}
                  {user && (
                    <Dialog open={notificationModalOpen} onOpenChange={setNotificationModalOpen}>
                      <div className={cn(
                        "relative group/notifications",
                        // Dynamic grouping based on unread count
                        unreadCount > 0 && "animate-pulse"
                      )}>
                        <Button
                          variant="ghost"
                          data-notification-button="true"
                          onClick={() => {
                            setNotificationModalOpen(true);
                          }}
                          className={cn(
                            "relative overflow-hidden backdrop-blur-sm transition-all duration-300 p-2 aspect-square",
                            // Styling based on unread count
                            unreadCount === 0 && "border border-primary/40 bg-slate-900/30 hover:bg-slate-800/50",
                            unreadCount > 0 && unreadCount <= 5 && "border border-orange-500/40 bg-orange-950/30 hover:bg-orange-900/50",
                            unreadCount > 5 && unreadCount <= 10 && "border border-red-500/40 bg-red-950/30 hover:bg-red-900/50",
                            unreadCount > 10 && "border border-red-500/60 bg-red-950/40 hover:bg-red-900/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                          )}
                        >
                          {/* Cyberpunk scan line effect */}
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-r from-transparent to-transparent translate-x-[-100%] group-hover/notifications:translate-x-[100%] transition-transform duration-700 ease-out",
                            unreadCount === 0 && "via-primary/20",
                            unreadCount > 0 && unreadCount <= 5 && "via-orange-400/20",
                            unreadCount > 5 && "via-red-400/20"
                          )} />
                          
                          {/* Subtle inner glow on hover */}
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-r opacity-0 group-hover/notifications:opacity-100 transition-opacity duration-300",
                            unreadCount === 0 && "from-primary/5 via-primary/10 to-primary/5",
                            unreadCount > 0 && unreadCount <= 5 && "from-orange-400/5 via-orange-400/10 to-orange-400/5",
                            unreadCount > 5 && "from-red-400/5 via-red-400/10 to-red-400/5"
                          )} />
                          
                          {/* Edge pulse effect */}
                          <div className={cn(
                            "absolute inset-0 border border-transparent group-hover/notifications:border-opacity-30 rounded-md transition-all duration-300",
                            unreadCount === 0 && "group-hover/notifications:border-primary/30",
                            unreadCount > 0 && unreadCount <= 5 && "group-hover/notifications:border-orange-400/30",
                            unreadCount > 5 && "group-hover/notifications:border-red-400/30"
                          )} />
                          
                          {/* Notification icon */}
                          <div className="relative">
                            {unreadCount > 0 ? (
                              <BellDot className={cn(
                                "w-5 h-5 transition-all duration-300 relative z-10",
                                unreadCount <= 5 && "text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]",
                                unreadCount > 5 && "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.6)]"
                              )} />
                            ) : (
                              <Bell className="w-5 h-5 text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.6)] relative z-10" />
                            )}
                            
                            {/* Notification counter badge */}
                            {unreadCount > 0 && (
                              <div className={cn(
                                "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-xs font-bold flex items-center justify-center relative z-20",
                                unreadCount <= 5 && "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
                                unreadCount > 5 && unreadCount <= 10 && "bg-gradient-to-r from-red-500 to-red-600 text-white",
                                unreadCount > 10 && "bg-gradient-to-r from-red-600 to-pink-600 text-white animate-pulse"
                              )}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </div>
                            )}
                          </div>
                          
                          {/* Tech corner indicators */}
                          <div className={cn(
                            "absolute top-1 left-1 w-1.5 h-1.5 border-l border-t transition-colors duration-300",
                            unreadCount === 0 && "border-primary/60 group-hover/notifications:border-primary",
                            unreadCount > 0 && unreadCount <= 5 && "border-orange-400/60 group-hover/notifications:border-orange-300",
                            unreadCount > 5 && "border-red-400/60 group-hover/notifications:border-red-300"
                          )} />
                          <div className={cn(
                            "absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b transition-colors duration-300",
                            unreadCount === 0 && "border-accent/60 group-hover/notifications:border-accent",
                            unreadCount > 0 && unreadCount <= 5 && "border-orange-400/60 group-hover/notifications:border-orange-300",
                            unreadCount > 5 && "border-red-400/60 group-hover/notifications:border-red-300"
                          )} />
                        </Button>
                      </div>
                    
                      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 border-0 bg-transparent overflow-hidden">
                        {/* Accessibility headers - hidden visually but accessible to screen readers */}
                        <DialogHeader className="sr-only">
                          <DialogTitle>Notifications Panel</DialogTitle>
                          <DialogDescription>
                            View and manage your notifications, tips, achievements, and system messages.
                          </DialogDescription>
                        </DialogHeader>

                        {/* Animated backdrop with cyberpunk effects */}
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg transition-all duration-800" />
                        
                        {/* Main cyberpunk container with epic entrance */}
                        <div className="relative w-full h-full overflow-hidden transition-all duration-1200 transform-gpu">
                          {/* Animated background with multiple layers */}
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-2xl" />
                          
                          {/* Enhanced circuit board pattern with activation animation */}
                          <div className="absolute inset-0 opacity-[0.15] transition-all duration-2000">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.3)_1px,transparent_0)] bg-[12px_12px] animate-grid-move" />
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[24px_24px]" />
                            
                            {/* Power-up circuit lines */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-cyber-energy-surge" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/8 to-transparent animate-cyber-energy-surge delay-300" />
                          </div>
                          
                          {/* Animated corner elements */}
                          <div className="absolute top-0 left-0 w-32 h-32">
                            <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary/60 animate-cyber-corner" />
                            <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-accent/40 animate-cyber-corner delay-150" />
                          </div>
                          <div className="absolute top-0 right-0 w-32 h-32">
                            <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary/60 animate-cyber-corner" />
                            <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-accent/40 animate-cyber-corner delay-150" />
                          </div>
                          <div className="absolute bottom-0 left-0 w-32 h-32">
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-primary/60 animate-cyber-corner" />
                            <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-accent/40 animate-cyber-corner delay-150" />
                          </div>
                          <div className="absolute bottom-0 right-0 w-32 h-32">
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-primary/60 animate-cyber-corner" />
                            <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-accent/40 animate-cyber-corner delay-150" />
                          </div>
                          
                          {/* Dynamic energy flows */}
                          <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
                            <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow delay-1000" />
                            <div className="absolute left-0 top-1/4 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-energy-flow-horizontal" />
                            <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-energy-flow-horizontal delay-1500" />
                          </div>
                          
                          {/* Floating orbs */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {[...Array(8)].map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "absolute w-2 h-2 rounded-full",
                                  i % 2 === 0 ? "bg-primary/30" : "bg-accent/30",
                                  "animate-float-orb"
                                )}
                                style={{
                                  left: `${Math.random() * 100}%`,
                                  top: `${Math.random() * 100}%`,
                                  animationDelay: `${Math.random() * 5}s`,
                                  animationDuration: `${8 + Math.random() * 4}s`
                                }}
                              />
                            ))}
                          </div>
                          
                          {/* Main content area */}
                          <div className="relative z-10 h-full flex flex-col">
                            {/* Cyberpunk Notifications Panel */}
                            <div className="flex-1">
                              <CyberpunkNotificationsPanel
                                notifications={notifications}
                                onMarkAsRead={markNotificationAsRead}
                                onDelete={deleteNotification}
                                onMarkAllAsRead={markAllNotificationsAsRead}
                                loading={false}
                              />
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  {/* Cyberpunk Balance Display - Only show for authenticated users */}
                  {user && userData && (
                    <div className="relative group/balance overflow-hidden">
                      {/* Multi-layered background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-800/60 backdrop-blur-md rounded-xl" />
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 via-emerald-500/30 to-green-500/20 rounded-xl blur-sm group-hover/balance:blur-md transition-all duration-300 animate-cyber-balance-glow" />
                      
                      {/* Animated circuit pattern */}
                      <div className="absolute inset-0 opacity-20 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(34,197,94,0.2)_50%,transparent_60%)] bg-[length:20px_20px] animate-grid-move" />
                      </div>
                      
                      {/* Content */}
                      <div className="relative flex items-center space-x-3 px-4 py-2 border border-green-500/30 rounded-xl">
                        {/* Glowing wallet icon */}
                        <div className="relative">
                          <Wallet className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          <div className="absolute inset-0 animate-ping">
                            <Wallet className="w-5 h-5 text-green-400/40" />
                          </div>
                        </div>
                        
                        {/* Enhanced balance text */}
                        <div className="flex items-center space-x-1">
                          <AnimatedBalance
                            fallbackBalance={userData?.balance}
                            className="font-bold text-lg bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
                          />
                        </div>
                        
                        <FloatingBalanceIncrease increases={increases} />
                      </div>
                      
                      {/* Tech corner accents - positioned relative to outer container */}
                      <div className="absolute top-1.5 left-1.5 w-2 h-2 border-l border-t border-green-400/60" />
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 border-r border-t border-green-400/60" />
                      <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-l border-b border-emerald-400/60" />
                      <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b border-emerald-400/60" />
                    </div>
                  )}

                  {/* Cyberpunk Admin Panel Button - Only show for admin users */}
                  {user && !adminLoading && isAdmin && (
                    <div className="relative group/admin">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowAdminPanel(true);
                        }}
                        className="relative overflow-hidden border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 backdrop-blur-sm transition-all duration-300 disabled:opacity-60"
                      >
                        {/* Cyberpunk scan line effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent translate-x-[-100%] group-hover/admin:translate-x-[100%] transition-transform duration-700 ease-out" />
                        
                        {/* Subtle inner glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 via-red-400/10 to-red-400/5 opacity-0 group-hover/admin:opacity-100 transition-opacity duration-300" />
                        
                        {/* Edge pulse effect */}
                        <div className="absolute inset-0 border border-red-400/0 group-hover/admin:border-red-400/30 rounded-md transition-all duration-300" />
                        
                        <Shield className="w-4 h-4 mr-2 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)] relative z-10" />
                        <span className="relative font-semibold bg-gradient-to-r from-red-200 to-red-400 bg-clip-text text-transparent">
                          Admin
                        </span>
                        
                        {/* Tech corner indicators */}
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-red-400/60 group-hover/admin:border-red-300" />
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-red-400/60 group-hover/admin:border-red-300" />
                      </Button>
                    </div>
                  )}

                  {/* Cyberpunk Enhanced User Profile Display - Only show for authenticated users */}
                  {user && userData && (
                    <>
                      {/* Desktop Version */}
                      <div className="hidden md:block relative group/profile overflow-hidden cursor-pointer" onClick={() => {
                        setShowProfile(true);
                      }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-800/60 backdrop-blur-md rounded-xl" />
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-sm group-hover/profile:blur-md transition-all duration-300" />
                        
                        {/* Animated scan lines */}
                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-cyber-scan-horizontal opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                          <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/40 to-transparent animate-cyber-scan left-1/3 opacity-0 group-hover/profile:opacity-100 transition-opacity delay-200" />
                        </div>
                        
                        <div className="relative flex items-center space-x-3 px-4 py-2 border border-primary/30 rounded-xl group-hover/profile:border-primary/60 transition-all duration-300">
                          {/* Enhanced Avatar */}
                          <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-sm animate-cyber-avatar-scan" />
                            <ProfileBorder level={effectiveStats.current_level} size="md">
                              <div className="w-12 h-12 rounded-full overflow-hidden relative">
                                <img 
                                  src={userData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                                  alt={`${userData.username} avatar`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-accent/20" />
                              </div>
                            </ProfileBorder>
                            
                            {/* Achievement Notification Indicator */}
                            {claimableAchievements.length > 0 && (
                              <div className="absolute -top-1.5 -right-1.5 z-50 group/badge">
                                {/* Glowing background effect */}
                                <div className="absolute -inset-0.5 bg-emerald-500/60 blur-sm animate-pulse"
                                     style={{
                                       clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                                     }} />
                                
                                {/* Main indicator */}
                                <div className="relative w-5 h-5 bg-gradient-to-br from-emerald-500 to-green-600 border border-white/30 backdrop-blur-sm flex items-center justify-center"
                                     style={{
                                       clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))'
                                     }}>
                                  <span className="text-[0.625rem] font-bold text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] font-mono leading-none">
                                    {claimableAchievements.length}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Enhanced Username and Level */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                                {userData.username}
                              </span>
                              {/* Admin Shield Icon */}
                              {isAdmin && (
                                <div className="flex items-center text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]" title="Admin">
                                  <Shield className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-primary/80 font-mono">LVL</span>
                              <span className="text-accent font-bold">{effectiveStats.current_level}</span>
                              {effectiveStats && (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-slate-400 font-mono">
                                    {formatXP(displayXP)} XP
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Status indicator */}
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                            <span className="text-xs text-green-400 font-mono">ONLINE</span>
                          </div>
                        </div>
                        
                        {/* Tech corner indicators - positioned relative to outer container */}
                        <div className="absolute top-1.5 left-1.5 w-2 h-2 border-l border-t border-primary/60 group-hover/profile:border-primary" />
                        <div className="absolute top-1.5 right-1.5 w-2 h-2 border-r border-t border-accent/60 group-hover/profile:border-accent" />
                        <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-l border-b border-accent/60 group-hover/profile:border-accent" />
                        <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b border-primary/60 group-hover/profile:border-primary" />
                      </div>
                      
                      {/* Mobile Version */}
                      <div 
                        className="flex md:hidden items-center gap-2 cursor-pointer hover:bg-primary/10 rounded-lg p-2 -m-2 transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => {
                          setShowProfile(true);
                        }}
                      >
                        <div className="relative">
                          <ProfileBorder level={effectiveStats.current_level} size="sm">
                            <div className="w-8 h-8 rounded-full overflow-hidden relative">
                              <img 
                                src={userData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                                alt={`${userData.username} avatar`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                                <span className="text-white text-xs font-bold block text-center leading-none">
                                  {effectiveStats.current_level >= 100 ? '👑' : effectiveStats.current_level}
                                </span>
                              </div>
                            </div>
                          </ProfileBorder>
                          
                          {/* Achievement Notification Indicator */}
                          {claimableAchievements.length > 0 && (
                            <div className="absolute -top-0.5 -right-0.5 z-50 group/badge">
                              {/* Glowing background effect */}
                              <div className="absolute -inset-0.5 bg-emerald-500/60 blur-sm animate-pulse"
                                   style={{
                                     clipPath: 'polygon(0 0, calc(100% - 1px) 0, 100% 1px, 100% 100%, 1px 100%, 0 calc(100% - 1px))'
                                   }} />
                              
                              {/* Main indicator */}
                              <div className="relative w-4 h-4 bg-gradient-to-br from-emerald-500 to-green-600 border border-white/30 backdrop-blur-sm flex items-center justify-center"
                                   style={{
                                     clipPath: 'polygon(0 0, calc(100% - 1px) 0, 100% 1px, 100% 100%, 1px 100%, 0 calc(100% - 1px))'
                                   }}>
                                <span className="text-[0.5rem] font-bold text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.8)] font-mono leading-none">
                                  {claimableAchievements.length}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-sm">{userData.username}</span>
                      </div>
                    </>
                  )}

                  {/* Cyberpunk Authentication Buttons */}
                  {!user && (
                    <div className="relative group/signin">
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        className="relative overflow-hidden border border-primary/40 bg-slate-900/30 hover:bg-slate-800/50 backdrop-blur-sm transition-all duration-300"
                      >
                        {/* Cyberpunk scan line effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover/signin:translate-x-[100%] transition-transform duration-700 ease-out" />
                        
                        {/* Subtle inner glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover/signin:opacity-100 transition-opacity duration-300" />
                        
                        {/* Edge pulse effect */}
                        <div className="absolute inset-0 border border-primary/0 group-hover/signin:border-primary/30 rounded-md transition-all duration-300" />
                        
                        <LogIn className="w-4 h-4 mr-2 text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.6)] relative z-10" />
                        <span className="relative z-10 font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          AUTHENTICATE
                        </span>
                        
                        {/* Tech corner indicators */}
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/60 group-hover/signin:border-primary" />
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/60 group-hover/signin:border-accent" />
                      </Button>
                    </div>
                  )}

                  {/* Back Button */}
                  <Button
                    onClick={() => navigate('/')}
                    variant="ghost"
                    size="sm"
                    className="relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:bg-primary/10"
                  >
                    <div className="relative z-10 flex items-center space-x-2">
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Compact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left Column - Stats & Free Cases */}
          <div className="space-y-4">
            {/* Stats Overview */}
            <div className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-xl animate-cyber-header-pulse" />
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500" />
              
              <div className="relative z-10 p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Statistics</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Package, value: stats.totalCasesOpened, label: "Cases Opened", color: "primary" },
                    { icon: Coins, value: `$${stats.totalRewards.toFixed(2)}`, label: "Total Rewards", color: "success" },
                    { icon: Star, value: userData?.levelStats?.current_level || 0, label: "Your Level", color: "warning" },
                    { icon: Crown, value: levelDailyCases.filter(c => canOpenCase(c)).length, label: "Available", color: "accent" }
                  ].map((stat, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/50">
                      <stat.icon className={`w-4 h-4 text-${stat.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Free Cases */}
            <div className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-xl animate-cyber-header-pulse" />
              <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-primary/30 to-accent/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500" />
              
              <div className="relative z-10 p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                    <Gift className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Free Cases</h3>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(caseStatuses).map(([type, status]) => (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${status.canOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </div>
                      <Button
                        onClick={() => openFreeCaseModal(type as 'common' | 'rare' | 'epic')}
                        disabled={!status.canOpen}
                        size="sm"
                        variant={status.canOpen ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {status.canOpen ? 'Open' : 'Locked'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Daily Cases */}
          <div className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-xl animate-cyber-header-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Daily Cases</h3>
                </div>
                
                <Button
                  onClick={handleTestReset}
                  variant="outline"
                  size="sm"
                  className="relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:bg-primary/10"
                >
                  <div className="relative z-10 flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs">Reset</span>
                  </div>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {levelDailyCases.map((caseData) => (
                  <div key={caseData.id} className="relative overflow-hidden group/case">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm rounded-lg" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-lg blur-md group-hover/case:blur-lg transition-all duration-300" />
                    
                    <div className="relative z-10 p-3 text-center space-y-2">
                      <div className="relative">
                        <div className={`w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg border border-purple-400/20 ${
                          caseData.user_level < caseData.level_required ? 'opacity-50' : 'group-hover/case:scale-105 transition-transform duration-200'
                        }`}>
                          {caseData.user_level < caseData.level_required ? (
                            <Lock className="w-6 h-6 text-white" />
                          ) : (
                            <Gift className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary to-accent text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg border border-primary/20">
                          {caseData.level_required}
                        </div>
                        {caseData.user_level >= caseData.level_required && caseData.is_available && (
                          <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg border border-white"></div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                          Lv.{caseData.level_required}
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          caseData.user_level < caseData.level_required 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : !caseData.is_available 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {getCaseStatusText(caseData)}
                        </div>
                        
                        {/* Show when case will be available again */}
                        {caseData.user_level >= caseData.level_required && !caseData.is_available && caseData.last_reset_date && (
                          <div className="text-xs text-muted-foreground">
                            {formatCountdown(countdown)}
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        onClick={() => handleLevelCaseOpened(caseData.id)}
                        disabled={!canOpenCase(caseData) || openingCase === caseData.id}
                        variant={getCaseButtonVariant(caseData)}
                        size="default"
                        className={`w-full relative overflow-hidden transition-all duration-200 font-medium ${
                          caseData.user_level < caseData.level_required 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                            : !caseData.is_available 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                            : 'bg-gradient-to-r from-primary to-accent text-white border border-primary/30 hover:from-primary/80 hover:to-accent/80'
                        }`}
                      >
                        <div className="relative z-10 flex items-center justify-center">
                          {openingCase === caseData.id ? (
                            <>
                              <div className="w-4 h-4 mr-2 border border-current border-t-transparent rounded-full animate-spin"></div>
                              Opening...
                            </>
                          ) : caseData.user_level < caseData.level_required ? (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Locked
                            </>
                          ) : !caseData.is_available ? (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              Opened
                            </>
                          ) : (
                            <>
                              <Gift className="w-4 h-4 mr-2" />
                              Open Case
                            </>
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Case History */}
          <div className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-xl animate-cyber-header-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-primary/30 to-accent/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            <div className="relative z-10 p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-white">Case History</h3>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <div className="relative mb-4">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
                    <div className="absolute inset-0 w-12 h-12 mx-auto border-2 border-accent/20 rounded-full animate-pulse"></div>
                  </div>
                  <h4 className="text-sm font-semibold mb-2">No Cases Opened Yet</h4>
                  <p className="text-xs text-muted-foreground">
                    Your opened cases will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((caseReward) => (
                    <div key={caseReward.id} className="relative overflow-hidden group/item">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm rounded-lg" />
                      <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-transparent rounded-lg blur-md group-hover/item:blur-lg transition-all duration-300" />
                      
                      <div className="relative z-10 flex items-center justify-between p-3">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="relative">
                            <div className={`w-3 h-3 rounded-full ${getRarityColor(caseReward.rarity)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {getCaseTypeDisplayName(caseReward.case_type, caseReward.level_unlocked)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {caseReward.rarity.charAt(0).toUpperCase() + caseReward.rarity.slice(1)} • 
                              {formatDate(caseReward.opened_at || caseReward.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-2">
                          <div className="text-sm font-semibold text-success">
                            +${caseReward.reward_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cyberpunk Case Opening Modal for Free Cases */}
      {selectedFreeCase && (
        <CyberpunkCaseOpeningModal
          isOpen={!!selectedFreeCase}
          onClose={closeFreeCaseModal}
          caseId={`free-${selectedFreeCase.type}`}
          level={1}
          onCaseOpened={handleFreeCaseOpened}
          isFreeCase={true}
          freeCaseType={selectedFreeCase.type}
        />
      )}

      {/* Cyberpunk Case Opening Modal for Level Cases */}
      {selectedLevelCase && (
        <CyberpunkCaseOpeningModal
          isOpen={!!selectedLevelCase}
          onClose={handleLevelCaseClosed}
          caseId={selectedLevelCase.id}
          level={selectedLevelCase.level_required}
          onCaseOpened={async (reward) => {
            // This will be called when the case is actually opened from within the modal
            // The modal handles the case opening internally
            handleLevelCaseClosed(true); // Refresh because a case was opened
          }}
          isFreeCase={false}
          openCaseFunction={openLevelCase}
        />
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* User Profile Modal */}
      <UserProfile 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />

      {/* Admin Panel Modal */}
      <AdminPanel 
        isOpen={showAdminPanel} 
        onClose={() => setShowAdminPanel(false)} 
      />
    </div>
  );
}