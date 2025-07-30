import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MaintenanceToggle from './MaintenanceToggle';
import { Shield, Settings, Users, Activity, Bell, AlertTriangle, Cpu, Database, Server, Terminal, Zap, Lock, Eye, EyeOff, RefreshCw, Trash2, User, Crown, Coins, Target, MessageSquare, Send, TrendingUp } from 'lucide-react';
import { PushNotificationForm } from './PushNotificationForm';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SystemStatus {
  database: {
    status: 'online' | 'offline' | 'checking';
    latency?: number;
  };
  authentication: {
    status: 'active' | 'inactive' | 'checking';
  };
  realtime: {
    status: 'connected' | 'disconnected' | 'checking';
    channels: {
      maintenance: boolean;
      liveBets: boolean;
      crashRounds: boolean;
      crashBets: boolean;
      notifications: boolean;
      chat: boolean;
      roulette: boolean;
      userStats: boolean;
      caseHistory: boolean;
      caseRewards: boolean;
      levelDailyCases: boolean;
      levelUp: boolean;
      balanceUpdates: boolean;
    };
  };
}

interface User {
  id: string;
  username: string;
  level: number;
  xp: number;
  balance: number;
  total_wagered: number;
  created_at: string;
}

type NotificationLevel = 'low' | 'normal' | 'urgent';

interface NotificationForm {
  title: string;
  message: string;
  level: NotificationLevel;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPushNotification, setShowPushNotification] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showPrivateNotification, setShowPrivateNotification] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingUser, setResettingUser] = useState(false);
  const [verificationText, setVerificationText] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    title: '',
    message: '',
    level: 'normal'
  });
  const [showAdminRoleModal, setShowAdminRoleModal] = useState(false);
  const [adminRoleAction, setAdminRoleAction] = useState<'add' | 'remove'>('add');
  const [adminRoleLoading, setAdminRoleLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: { status: 'checking' },
    authentication: { status: 'checking' },
    realtime: { 
      status: 'checking',
      channels: {
        maintenance: false,
        liveBets: false,
        crashRounds: false,
        crashBets: false,
        notifications: false,
        chat: false,
        roulette: false,
        userStats: false,
        caseHistory: false,
        caseRewards: false,
        levelDailyCases: false,
        levelUp: false,
        balanceUpdates: false
      }
    }
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check total user count
  const checkTotalUserCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Error checking user count:', error);
      } else {
        console.log(`📊 Total users in database: ${count}`);
        return count;
      }
    } catch (err) {
      console.error('❌ Error checking user count:', err);
    }
    return null;
  };

  // Load all users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log('🔍 Loading all users...');
      
      // First check total count
      const totalCount = await checkTotalUserCount();
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, username, level, xp, balance, total_wagered, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      } else {
        console.log(`✅ Loaded ${data?.length || 0} users`);
        console.log('📊 Users data:', data);
        setUsers((data || []).map(user => ({
          id: user.id,
          username: user.username || '',
          level: user.level || 1,
          xp: user.xp || 0,
          balance: user.balance || 0,
          total_wagered: user.total_wagered || 0,
          created_at: user.created_at || ''
        })));
        
        // Show success message with count
        const message = totalCount && totalCount !== data?.length 
          ? `Loaded ${data?.length || 0} users (${totalCount} total in database)`
          : `Loaded ${data?.length || 0} users`;
          
        toast({
          title: "Success",
          description: message,
        });
      }
    } catch (err) {
      console.error('❌ Error loading users:', err);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Send private notification
  const sendPrivateNotification = async (userId: string, notification: NotificationForm) => {
    setSendingNotification(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'admin_message',
          title: notification.title,
          message: notification.message,
          data: {
            level: notification.level,
            admin_sent: true
          },
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending notification:', error);
        toast({
          title: "Error",
          description: "Failed to send notification",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Private notification sent successfully",
        });

        // Reset form
        setNotificationForm({
          title: '',
          message: '',
          level: 'normal'
        });
        setSelectedUser(null);
        setShowPrivateNotification(false);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  // Reset user statistics - MINIMAL VERSION
  const resetUserStatsMinimal = async (userId: string) => {
    setResettingUser(true);
    try {
      console.log('=== RESET USER STATS FUNCTION v4.0 - MINIMAL ===');
      console.log('Cache buster:', Date.now());
      console.log('User ID:', userId);
      
      // Only update the most basic columns that we know exist
      console.log('Updating profiles table with minimal columns...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          level: 1,
          xp: 0,
          total_wagered: 0,
          total_profit: 0,
          balance: 0
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error resetting profile stats:', profileError);
        toast({
          title: "Error",
          description: `Failed to reset profile statistics: ${profileError.message}`,
          variant: "destructive",
        });
        return;
      }
      
      console.log('Profile statistics reset successfully');
      
      // Success message
      toast({
        title: "Success",
        description: "User statistics have been reset",
      });
      
      setShowResetConfirm(false);
      setSelectedUser(null);
      setVerificationText('');
      loadUsers(); // Refresh the user list

            console.log('Reset completed successfully');
    } catch (error) {
      console.error('Error resetting user stats:', error);
      toast({
        title: "Error",
        description: `Failed to reset user statistics: ${error}`,
        variant: "destructive",
      });
    } finally {
      setResettingUser(false);
    }
  };

  // Handle admin role changes
  const handleAdminRoleChange = async (userId: string, action: 'add' | 'remove') => {
    setAdminRoleLoading(true);
    try {
      if (action === 'add') {
        // Add user to admin_users table
        console.log('Attempting to add admin role for user:', userId);
        
        const { data, error } = await supabase
          .from('admin_users')
          .insert({
            user_id: userId,
            permissions: ['admin'],
            created_at: new Date().toISOString()
          })
          .select();

        console.log('Admin role insert result:', { data, error });

        if (error) {
          console.error('Error adding admin role:', error);
          toast({
            title: "Error",
            description: `Failed to add admin role: ${error.message}`,
            variant: "destructive",
          });
        } else {
          console.log('Admin role added successfully:', data);
          toast({
            title: "Success",
            description: "Admin role added successfully",
          });
        }
      } else {
        // Remove user from admin_users table
        console.log('Attempting to remove admin role for user:', userId);
        
        const { data, error } = await supabase
          .from('admin_users')
          .delete()
          .eq('user_id', userId)
          .select();

        console.log('Admin role delete result:', { data, error });

        if (error) {
          console.error('Error removing admin role:', error);
          toast({
            title: "Error",
            description: `Failed to remove admin role: ${error.message}`,
            variant: "destructive",
          });
        } else {
          console.log('Admin role removed successfully:', data);
          toast({
            title: "Success",
            description: "Admin role removed successfully",
          });
        }
      }

      setShowAdminRoleModal(false);
      setSelectedUser(null);
      loadUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error changing admin role:', error);
      toast({
        title: "Error",
        description: "Failed to change admin role",
        variant: "destructive",
      });
    } finally {
      setAdminRoleLoading(false);
    }
  };

  // Check system status
  const checkSystemStatus = async () => {
    setIsRefreshing(true);
    
    // Check database connectivity
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        setSystemStatus(prev => ({
          ...prev,
          database: { status: 'offline' }
        }));
      } else {
        setSystemStatus(prev => ({
          ...prev,
          database: { status: 'online', latency }
        }));
      }
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        database: { status: 'offline' }
      }));
    }

    // Check authentication status
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSystemStatus(prev => ({
        ...prev,
        authentication: { 
          status: session ? 'active' : 'inactive' 
        }
      }));
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        authentication: { status: 'inactive' }
      }));
    }

    // Check realtime connectivity with a simple test
    try {
      // Create a simple test channel to check realtime connectivity
      const testChannel = supabase.channel('admin-health-check');
      
      // Set a timeout for the test
      const testPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve('timeout');
        }, 3000);

        testChannel.subscribe((status) => {
          clearTimeout(timeout);
          resolve(status);
        });
      });

      const result = await testPromise;
      
      // Clean up the test channel
      supabase.removeChannel(testChannel);

      const isConnected = result === 'SUBSCRIBED';
      
      // Update channel statuses based on the overall realtime connectivity
      const channelStatuses = {
        maintenance: isConnected,
        liveBets: isConnected,
        crashRounds: isConnected,
        crashBets: isConnected,
        notifications: isConnected,
        chat: isConnected,
        roulette: isConnected,
        userStats: isConnected,
        caseHistory: isConnected,
        caseRewards: isConnected,
        levelDailyCases: isConnected,
        levelUp: isConnected,
        balanceUpdates: isConnected
      };

      setSystemStatus(prev => ({
        ...prev,
        realtime: { 
          status: isConnected ? 'connected' : 'disconnected',
          channels: channelStatuses
        }
      }));
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        realtime: { 
          status: 'disconnected',
          channels: {
            maintenance: false,
            liveBets: false,
            crashRounds: false,
            crashBets: false,
            notifications: false,
            chat: false,
            roulette: false,
            userStats: false,
            caseHistory: false,
            caseRewards: false,
            levelDailyCases: false,
            levelUp: false,
            balanceUpdates: false
          }
        }
      }));
    }

    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Check admin status function
  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
      }

      setIsAdmin(!!data);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  // Check system status when admin panel opens
  useEffect(() => {
    if (isOpen) {
      checkAdminStatus();
      checkSystemStatus();
      
      // Set up periodic system status checks
      const interval = setInterval(() => {
        checkSystemStatus();
      }, 20000); // Check every 20 seconds
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Load users when user management modal opens
  useEffect(() => {
    if (showUserManagement) {
      loadUsers();
    }
  }, [showUserManagement]);

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-mono">ADMIN_PANEL</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-primary/30 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-2 border-accent/30 rounded-full animate-spin-reverse" style={{ animationDuration: '2s' }}></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-red-500" />
              <span className="font-mono">ACCESS_DENIED</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center p-6">
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <div className="absolute -inset-2 border border-red-500/20 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-mono">ADMIN ACCESS REQUIRED</h3>
            <p className="text-slate-400 font-mono text-sm">
              You don't have permission to access the admin panel.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'connected':
        return 'green';
      case 'offline':
      case 'inactive':
      case 'disconnected':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'connected':
        return status.toUpperCase();
      case 'offline':
      case 'inactive':
      case 'disconnected':
        return status.toUpperCase();
      default:
        return 'CHECKING...';
    }
  };

  const getConnectedChannelsCount = () => {
    const channels = systemStatus.realtime.channels;
    return Object.values(channels).filter(Boolean).length;
  };

  const getTotalChannelsCount = () => {
    return Object.keys(systemStatus.realtime.channels).length;
  };

  const getLevelColor = (level: NotificationLevel) => {
    switch (level) {
      case 'low':
        return 'green';
      case 'normal':
        return 'yellow';
      case 'urgent':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const getLevelText = (level: NotificationLevel) => {
    switch (level) {
      case 'low':
        return 'LOW';
      case 'normal':
        return 'NORMAL';
      case 'urgent':
        return 'URGENT';
      default:
        return 'NORMAL';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-mono">ADMIN CONTROL CENTER</span>
              <Badge className="ml-2 bg-gradient-to-r from-primary to-accent text-white border-0">ADMIN</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance Control */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="font-mono">SITE CONTROL</span>
                </CardTitle>
                <CardDescription className="text-slate-400 font-mono">
                  Control website maintenance mode and site-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceToggle />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Activity className="h-5 w-5 text-accent" />
                  <span className="font-mono">SYSTEM STATS</span>
                </CardTitle>
                <CardDescription className="text-slate-400 font-mono">
                  Overview of site activity and user statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/30">
                    <div className="text-2xl font-bold text-primary font-mono">
                      {users.length}
                    </div>
                    <div className="text-sm text-slate-400 font-mono">TOTAL USERS</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/30">
                    <div className="text-2xl font-bold text-accent font-mono">
                      {/* Add active users here */}
                      -
                    </div>
                    <div className="text-sm text-slate-400 font-mono">ACTIVE TODAY</div>
                  </div>
                </div>
                
                <div className="text-sm text-slate-500 font-mono">
                  <p>More detailed analytics coming soon...</p>
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            {showPushNotification ? (
              <div className="lg:col-span-2">
                <PushNotificationForm onClose={() => setShowPushNotification(false)} />
              </div>
            ) : (
              <Card className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Bell className="h-5 w-5 text-purple-400" />
                    <span className="font-mono">BROADCAST SYSTEM</span>
                    <Badge className="ml-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">BROADCAST</Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-mono">
                    Send notifications to all users on the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-yellow-300 font-mono">
                        WARNING: Broadcast notifications will be sent to ALL users on the platform.
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => setShowPushNotification(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white border-0 font-mono transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      SEND BROADCAST NOTIFICATION
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Status */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Server className="h-5 w-5 text-green-400" />
                    <span className="font-mono">SYSTEM STATUS</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {isRefreshing && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-400 font-mono">REFRESHING</span>
                      </div>
                    )}
                    <span className="text-xs text-slate-500 font-mono">
                      Last: {lastRefresh.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <CardDescription className="text-slate-400 font-mono">
                  Real-time system health and performance (updates every 20s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-${getStatusColor(systemStatus.database.status)}-500/10 to-${getStatusColor(systemStatus.database.status)}-600/10 rounded-lg border border-${getStatusColor(systemStatus.database.status)}-500/30`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 bg-${getStatusColor(systemStatus.database.status)}-400 rounded-full ${systemStatus.database.status === 'checking' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-sm text-${getStatusColor(systemStatus.database.status)}-400 font-mono`}>DATABASE</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm text-${getStatusColor(systemStatus.database.status)}-400 font-mono`}>
                        {getStatusText(systemStatus.database.status)}
                      </span>
                      {systemStatus.database.latency && (
                        <span className="text-xs text-slate-500 font-mono">
                          ({systemStatus.database.latency}ms)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-${getStatusColor(systemStatus.authentication.status)}-500/10 to-${getStatusColor(systemStatus.authentication.status)}-600/10 rounded-lg border border-${getStatusColor(systemStatus.authentication.status)}-500/30`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 bg-${getStatusColor(systemStatus.authentication.status)}-400 rounded-full ${systemStatus.authentication.status === 'checking' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-sm text-${getStatusColor(systemStatus.authentication.status)}-400 font-mono`}>AUTHENTICATION</span>
                    </div>
                    <span className={`text-sm text-${getStatusColor(systemStatus.authentication.status)}-400 font-mono`}>
                      {getStatusText(systemStatus.authentication.status)}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-${getStatusColor(systemStatus.realtime.status)}-500/10 to-${getStatusColor(systemStatus.realtime.status)}-600/10 rounded-lg border border-${getStatusColor(systemStatus.realtime.status)}-500/30`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 bg-${getStatusColor(systemStatus.realtime.status)}-400 rounded-full ${systemStatus.realtime.status === 'checking' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-sm text-${getStatusColor(systemStatus.realtime.status)}-400 font-mono`}>REALTIME</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm text-${getStatusColor(systemStatus.realtime.status)}-400 font-mono`}>
                        {getStatusText(systemStatus.realtime.status)}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        ({getConnectedChannelsCount()}/{getTotalChannelsCount()})
                      </span>
                    </div>
                  </div>

                  {/* Channel Details */}
                  <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="text-xs text-slate-400 font-mono mb-2">CHANNEL STATUS:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(systemStatus.realtime.channels).map(([channel, isConnected]) => (
                        <div key={channel} className="flex items-center justify-between">
                          <span className={`font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                            {channel.toUpperCase()}
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Terminal className="h-5 w-5 text-cyan-400" />
                  <span className="font-mono">ADMIN ACTIONS</span>
                </CardTitle>
                <CardDescription className="text-slate-400 font-mono">
                  Quick actions for site administration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    onClick={() => {
                      setShowUserManagement(true);
                      loadUsers();
                    }}
                    variant="outline" 
                    className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span>USER MANAGEMENT</span>
                    </div>
                    <span className="text-xs text-slate-500">MANAGE USERS</span>
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setShowPrivateNotification(true);
                      loadUsers();
                    }}
                    variant="outline" 
                    className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
                  >
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-green-400" />
                      <span>PRIVATE NOTIFICATIONS</span>
                    </div>
                    <span className="text-xs text-slate-500">SEND MESSAGES</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-green-400" />
                      <span>ANALYTICS</span>
                    </div>
                    <span className="text-xs text-slate-500">COMING SOON</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-purple-400" />
                      <span>SITE SETTINGS</span>
                    </div>
                    <span className="text-xs text-slate-500">COMING SOON</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Management Modal */}
      <Dialog open={showUserManagement} onOpenChange={setShowUserManagement}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="font-mono">USER MANAGEMENT</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-slate-400 font-mono">
                  Loaded Users: <span className="text-primary font-bold">{users.length}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={loadUsers}
                  disabled={loadingUsers}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 font-mono"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                  {loadingUsers ? 'Loading...' : 'Refresh Users'}
                </Button>
                <Button
                  onClick={checkTotalUserCount}
                  variant="outline"
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 font-mono"
                >
                  Check Total
                </Button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-slate-400 font-mono">Loading users...</p>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">No Users Found</h3>
                  <p className="text-slate-400 text-sm">Try refreshing the user list</p>
                </div>
                <Button
                  onClick={loadUsers}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 font-mono"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Users
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-blue-400" />
                        <div>
                          <div className="text-white font-mono">{user.username}</div>
                          <div className="text-xs text-slate-500 font-mono">ID: {user.id}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Crown className="h-3 w-3 text-yellow-400" />
                          <span className="text-yellow-400 font-mono">Lv.{user.level}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Target className="h-3 w-3 text-green-400" />
                          <span className="text-green-400 font-mono">{user.xp} XP</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Coins className="h-3 w-3 text-purple-400" />
                          <span className="text-purple-400 font-mono">${user.balance}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3 text-orange-400" />
                          <span className="text-orange-400 font-mono">${user.total_wagered}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPrivateNotification(true);
                        }}
                        variant="outline"
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-0 font-mono"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setAdminRoleAction('add');
                          setShowAdminRoleModal(true);
                        }}
                        variant="outline"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 font-mono"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setAdminRoleAction('remove');
                          setShowAdminRoleModal(true);
                        }}
                        variant="outline"
                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white border-0 font-mono"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Remove Admin
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowResetConfirm(true);
                        }}
                        variant="outline"
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-mono"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reset Stats
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Private Notification Modal */}
      <Dialog open={showPrivateNotification} onOpenChange={setShowPrivateNotification}>
        <DialogContent className="max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5 text-green-400" />
              <span className="font-mono">PRIVATE NOTIFICATION</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedUser ? (
              <>
                <div className="text-center p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/30">
                  <div className="text-white font-mono mb-2">
                    Sending to user:
                  </div>
                  <div className="text-lg font-bold text-blue-400 font-mono">
                    {selectedUser.username}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    ID: {selectedUser.id}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 font-mono mb-2 block">
                      Priority Level:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'normal', 'urgent'] as NotificationLevel[]).map((level) => (
                        <Button
                          key={level}
                          onClick={() => setNotificationForm({ ...notificationForm, level })}
                          variant={notificationForm.level === level ? 'default' : 'outline'}
                          className={`font-mono ${
                            notificationForm.level === level
                              ? `bg-gradient-to-r from-${getLevelColor(level)}-600 to-${getLevelColor(level)}-700 text-white border-0`
                              : 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white'
                          }`}
                        >
                          {getLevelText(level)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 font-mono mb-2 block">
                      Title:
                    </label>
                    <input
                      type="text"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                      placeholder="Enter notification title"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-green-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 font-mono mb-2 block">
                      Message:
                    </label>
                    <textarea
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                      placeholder="Enter notification message"
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      setShowPrivateNotification(false);
                      setSelectedUser(null);
                      setNotificationForm({ title: '', message: '', level: 'normal' });
                    }}
                    variant="outline"
                    className="flex-1 bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => selectedUser && sendPrivateNotification(selectedUser.id, notificationForm)}
                    disabled={sendingNotification || !notificationForm.title || !notificationForm.message}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-0 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNotification ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <div className="text-slate-400 font-mono mb-4">
                  Select a user to send a private notification
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-blue-400" />
                        <div>
                          <div className="text-white font-mono">{user.username}</div>
                          <div className="text-xs text-slate-400 font-mono">ID: {user.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-yellow-400 font-mono">Lv.{user.level}</span>
                        <span className="text-green-400 font-mono">{user.xp} XP</span>
                        <span className="text-purple-400 font-mono">${user.balance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-mono">CONFIRM RESET</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-white font-mono mb-2">
                Reset statistics for user:
              </div>
              <div className="text-lg font-bold text-blue-400 font-mono mb-4">
                {selectedUser?.username}
              </div>
              <div className="text-sm text-slate-400 font-mono">
                This will reset ALL statistics including:
              </div>
              <div className="text-xs text-slate-500 font-mono mt-2 space-y-1">
                • Level and XP
                • Game statistics
                • Achievement progress
                • Case history
                • Daily cases
                • All achievements
              </div>
              <div className="text-sm text-green-400 font-mono mt-2">
                Balance will remain unchanged
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-sm text-slate-400 font-mono mb-2">
                  Type the username to confirm:
                </div>
                <input
                  type="text"
                  value={verificationText}
                  onChange={(e) => setVerificationText(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowResetConfirm(false);
                  setVerificationText('');
                }}
                variant="outline"
                className="flex-1 bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedUser && resetUserStatsMinimal(selectedUser.id)}
                disabled={resettingUser || verificationText !== selectedUser?.username}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resettingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Statistics
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Role Confirmation Modal */}
      <Dialog open={showAdminRoleModal} onOpenChange={setShowAdminRoleModal}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="font-mono">
                {adminRoleAction === 'add' ? 'MAKE ADMIN' : 'REMOVE ADMIN'}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-slate-300 font-mono">
              {adminRoleAction === 'add' ? (
                <p>
                  Are you sure you want to make <span className="text-blue-400 font-bold">{selectedUser?.username}</span> an admin?
                </p>
              ) : (
                <p>
                  Are you sure you want to remove admin privileges from <span className="text-orange-400 font-bold">{selectedUser?.username}</span>?
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-mono">
                {adminRoleAction === 'add' 
                  ? 'This will give the user full admin access to the platform.'
                  : 'This will remove all admin privileges from the user.'
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  if (selectedUser) {
                    handleAdminRoleChange(selectedUser.id, adminRoleAction);
                  }
                }}
                disabled={adminRoleLoading}
                className={cn(
                  "flex-1 font-mono",
                  adminRoleAction === 'add'
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0"
                    : "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white border-0"
                )}
              >
                {adminRoleLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {adminRoleAction === 'add' ? 'Make Admin' : 'Remove Admin'}
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => {
                  setShowAdminRoleModal(false);
                  setSelectedUser(null);
                }}
                variant="outline"
                className="flex-1 bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 font-mono"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}