import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Check, 
  X, 
  Clock, 
  Star, 
  Gift, 
  User, 
  Shield,
  Trash2,
  CheckCircle2,
  Sparkles,
  Zap,
  Crown,
  DollarSign,
  Activity,
  Terminal,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'tip_sent' | 'tip_received' | 'achievement_unlocked' | 'level_up' | 'admin_message';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

interface CyberpunkNotificationsPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAllAsRead: () => void;
  loading?: boolean;
}

// Cyberpunk notification type configurations
const getNotificationTheme = (type: string) => {
  switch (type) {
    case 'tip_received':
      return {
        icon: DollarSign,
        iconComponent: <DollarSign className="w-6 h-6" />,
        color: 'emerald',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
        borderColor: 'border-emerald-500/30',
        bgColor: 'bg-emerald-500/5',
        iconColor: 'text-emerald-400',
        accentColor: 'emerald',
        emoji: ''
      };
    case 'tip_sent':
      return {
        icon: Gift,
        iconComponent: <Gift className="w-6 h-6" />,
        color: 'blue',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-500/5',
        iconColor: 'text-blue-400',
        accentColor: 'blue',
        emoji: ''
      };
    case 'achievement_unlocked':
      return {
        icon: Star,
        iconComponent: <Star className="w-6 h-6" />,
        color: 'yellow',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]',
        borderColor: 'border-yellow-500/30',
        bgColor: 'bg-yellow-500/5',
        iconColor: 'text-yellow-400',
        accentColor: 'yellow',
        emoji: ''
      };
    case 'level_up':
      return {
        icon: Crown,
        iconComponent: <Crown className="w-6 h-6" />,
        color: 'purple',
        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
        borderColor: 'border-purple-500/30',
        bgColor: 'bg-purple-500/5',
        iconColor: 'text-purple-400',
        accentColor: 'purple',
        emoji: ''
      };
    case 'admin_message':
      return {
        icon: Terminal,
        iconComponent: <Terminal className="w-6 h-6" />,
        color: 'red',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.6)]',
        borderColor: 'border-red-500/60',
        bgColor: 'bg-red-500/10',
        iconColor: 'text-red-300',
        accentColor: 'red',
        emoji: ''
      };
    default:
      return {
        icon: Bell,
        iconComponent: <Bell className="w-6 h-6" />,
        color: 'slate',
        glow: 'shadow-[0_0_20px_rgba(148,163,184,0.4)]',
        borderColor: 'border-slate-500/30',
        bgColor: 'bg-slate-500/5',
        iconColor: 'text-slate-400',
        accentColor: 'slate',
        emoji: ''
      };
  }
};

export function CyberpunkNotificationsPanel({
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  loading = false
}: CyberpunkNotificationsPanelProps) {
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* Cyberpunk Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-2xl" />
      
      {/* Animated circuit board pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.3)_1px,transparent_0)] bg-[12px_12px] animate-grid-move" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[24px_24px]" />
      </div>
      
      {/* Energy flows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-energy-flow" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-energy-flow delay-1000" />
      </div>
      
      {/* Cyberpunk Header */}
      <div className="relative z-10 p-6 border-b border-primary/20 bg-gradient-to-r from-slate-900/40 to-slate-800/40 backdrop-blur-sm">
        {/* Scan-line effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -skew-x-12 animate-cyber-energy-surge opacity-30" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Enhanced status indicator */}
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-primary/30 backdrop-blur-sm flex items-center justify-center relative overflow-hidden animate-cyber-container">
                {/* Inner circuit pattern */}
                <div className="absolute inset-2 border border-primary/20 rounded-lg" />
                <div className="absolute inset-3 border border-primary/15 rounded-md" />
                
                {/* Icon */}
                <div className="relative">
                  <Bell className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 animate-ping opacity-30">
                    <Bell className="w-6 h-6 text-primary/40" />
                  </div>
                </div>
                
                {/* Corner tech indicators */}
                <div className="absolute top-1 left-1 w-1 h-1 bg-primary/60 rounded-full animate-pulse" />
                <div className="absolute bottom-1 right-1 w-1 h-1 bg-primary/60 rounded-full animate-pulse delay-1500" />
              </div>
            </div>
            
            {/* Title and status */}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent font-mono">
                  NOTIFICATIONS
                </h2>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary/60 animate-pulse" />
                  <Badge variant="outline" className="border-primary/30 text-primary/80 bg-primary/5 font-mono text-xs">
                    SYSTEM ACTIVE
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Terminal className="w-3 h-3 text-primary/60" />
                <span className="text-sm text-slate-400 font-mono">
                  {unreadCount > 0 ? `${unreadCount} UNREAD SIGNALS` : 'ALL SYSTEMS CLEAR'}
                </span>
                <span className="text-xs text-slate-500 font-mono">{notifications.length} TOTAL</span>
              </div>
            </div>
          </div>
          
          {/* Cyberpunk action button */}
          {unreadCount > 0 && (
            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="relative overflow-hidden border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/50 backdrop-blur-sm transition-all duration-300 font-mono"
              >
                {/* Scan line effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
                
                {/* Content */}
                <div className="relative flex items-center gap-2 z-10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">CLEAR ALL</span>
                </div>
                
                {/* Tech corners */}
                <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-emerald-400/60 group-hover:border-emerald-300" />
                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-emerald-400/60 group-hover:border-emerald-300" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 relative">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <div className="space-y-2">
                  <p className="text-primary font-mono">SCANNING DATASTREAM</p>
                  <p className="text-slate-500 text-sm font-mono">Loading notifications...</p>
                </div>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center space-y-8 animate-fade-in-up">
                <div className="relative">
                  <div className="w-32 h-32 mx-auto rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-primary/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-4 border border-primary/10 rounded-xl" />
                    <Bell className="w-16 h-16 text-primary/40" />
                    
                    {/* Animated decorations */}
                    <div className="absolute top-4 right-6">
                      <Sparkles className="w-6 h-6 text-primary/60 animate-pulse" />
                    </div>
                    <div className="absolute bottom-6 left-4">
                      <Zap className="w-4 h-4 text-primary/60 animate-pulse delay-500" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent font-mono">
                    ALL SYSTEMS CLEAR
                  </h3>
                  <p className="text-slate-400 text-lg font-mono">No active notifications detected</p>
                  <p className="text-slate-500 text-sm font-mono">
                    MONITORING ACTIVE • AWAITING NEW SIGNALS
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {notifications.map((notification, index) => {
                const theme = getNotificationTheme(notification.type);
                const isHovered = hoveredNotification === notification.id;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl transition-all duration-300 cursor-pointer",
                      "bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80",
                      "border backdrop-blur-sm",
                      notification.is_read 
                        ? "border-slate-700/50 hover:border-slate-600/70" 
                        : `${theme.borderColor} hover:border-${theme.accentColor}-400/50 ${theme.glow}`,
                      // Special enhanced styling for admin messages
                      notification.type === 'admin_message' && !notification.is_read && "border-red-400/80 shadow-[0_0_40px_rgba(239,68,68,0.8)] ring-1 ring-red-500/30",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      isHovered && "scale-[1.02]"
                    )}
                    style={{ 
                      animationDelay: `${index * 50}ms`
                    }}
                    onMouseEnter={() => setHoveredNotification(notification.id)}
                    onMouseLeave={() => setHoveredNotification(null)}
                    onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
                  >
                    {/* Cyberpunk background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow" />
                    </div>
                    
                    {/* Unread pulse indicator */}
                    {!notification.is_read && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 animate-cyber-pulse" />
                    )}
                    
                    {/* Scan line animation for unread */}
                    {!notification.is_read && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/2 to-transparent -skew-x-12 animate-cyber-shine" />
                    )}
                    
                    {/* Tech corner accents */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-primary/40 transition-all duration-300 group-hover:border-primary/70" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-primary/40 transition-all duration-300 group-hover:border-primary/70" />
                    
                    <div className="relative z-10 p-4 flex items-center gap-4">
                      {/* Cyberpunk icon container */}
                      <div className={cn(
                        "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center relative overflow-hidden",
                        "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
                        "border-2 transition-all duration-300",
                        notification.is_read 
                          ? "border-slate-600/30 opacity-60" 
                          : `${theme.borderColor}`,
                        !notification.is_read && theme.glow
                      )}>
                        {/* Inner tech pattern */}
                        <div className="absolute inset-2 border border-current/10 rounded-lg opacity-50" />
                        
                        {/* Icon */}
                        <div className={cn("relative", notification.is_read ? "text-slate-500" : theme.iconColor)}>
                          {theme.iconComponent}
                        </div>
                        
                        {/* Type emoji indicator */}
                        <div className="absolute -top-1 -right-1 text-xs">
                          {theme.emoji}
                        </div>
                        

                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <h3 className={cn(
                              "font-bold text-base leading-tight mb-2 font-mono",
                              notification.is_read ? "text-slate-400" : "text-white"
                            )}>
                              {notification.title}
                            </h3>
                            
                            {/* Message */}
                            <p className={cn(
                              "text-sm leading-relaxed mb-3",
                              notification.is_read ? "text-slate-500" : "text-slate-300"
                            )}>
                              {notification.message}
                            </p>
                            
                            {/* Tip message */}
                            {notification.data?.tip_message && (
                              <div className="mb-3 p-3 bg-gradient-to-r from-primary/10 to-primary/10 border-l-2 border-primary/50 rounded-lg backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="w-3 h-3 text-yellow-400" />
                                  <span className="text-xs font-mono text-yellow-400/80">MESSAGE</span>
                                </div>
                                <p className="text-sm text-primary/90 italic font-medium">
                                  "{notification.data.tip_message}"
                                </p>
                              </div>
                            )}
                            
                            {/* Timestamp and type */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-primary/60" />
                                <span className="text-xs text-slate-500 font-mono">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <div className="w-1 h-1 bg-primary/40 rounded-full" />
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs font-mono transition-all duration-300",
                                  notification.type === 'admin_message' 
                                    ? "border-red-400/60 text-red-300 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                                    : "border-slate-600/30 text-slate-500"
                                )}
                              >
                                {notification.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Cyberpunk action buttons */}
                          <div className={cn(
                            "flex items-center gap-2 transition-all duration-200",
                            isHovered ? "opacity-100 scale-100" : "opacity-60 scale-95 group-hover:opacity-100 group-hover:scale-100"
                          )}>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAsRead(notification.id);
                                }}
                                className="group/btn h-8 w-8 p-0 rounded-lg overflow-hidden bg-emerald-500/10 border border-emerald-400/30 hover:bg-emerald-500/20 hover:border-emerald-400/50 text-emerald-400 transition-all duration-300"
                              >
                                <div className="absolute inset-0 bg-emerald-400/10 scale-0 group-hover/btn:scale-100 transition-transform duration-200" />
                                <Check className="w-4 h-4 relative z-10" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                              }}
                              className="group/btn h-8 w-8 p-0 rounded-lg overflow-hidden bg-red-500/10 border border-red-400/30 hover:bg-red-500/20 hover:border-red-400/50 text-red-400 transition-all duration-300"
                            >
                              <div className="absolute inset-0 bg-red-400/10 scale-0 group-hover/btn:scale-100 transition-transform duration-200" />
                              <X className="w-4 h-4 relative z-10 transition-transform group-hover/btn:rotate-90" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hover chevron */}
                      {!notification.is_read && (
                        <div className={cn(
                          "transition-all duration-300",
                          isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
                        )}>
                          <ChevronRight className="w-4 h-4 text-primary/60" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Cyberpunk Footer */}
      {notifications.length > 0 && (
        <div className="relative z-10 p-4 border-t border-primary/20 bg-gradient-to-r from-slate-900/40 to-slate-800/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-primary/60 animate-pulse" />
                <span className="text-slate-500">DATASTREAM ACTIVE</span>
              </div>
              <div className="w-1 h-1 bg-primary/40 rounded-full animate-pulse" />
              <span className="text-slate-600">
                {notifications.length} SIGNALS • {unreadCount} UNREAD
              </span>
            </div>
            <div className="flex items-center gap-2 text-primary/60">
              <Terminal className="w-3 h-3" />
              <span>SYS.NOTIF.V2.1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}