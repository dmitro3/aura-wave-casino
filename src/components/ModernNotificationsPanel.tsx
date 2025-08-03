import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Check, 
  X, 
  MoreVertical, 
  Clock, 
  Star, 
  Gift, 
  TrendingUp, 
  User, 
  Shield,
  Trash2,
  CheckCircle2,
  Sparkles,
  Zap,
  Crown,
  DollarSign
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

interface ModernNotificationsPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAllAsRead: () => void;
  loading?: boolean;
}

// Notification type configurations
const getNotificationConfig = (type: string) => {
  switch (type) {
    case 'tip_received':
      return {
        icon: DollarSign,
        color: 'emerald',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        iconColor: 'text-emerald-400',
        category: 'Payment'
      };
    case 'tip_sent':
      return {
        icon: Gift,
        color: 'blue',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        iconColor: 'text-blue-400',
        category: 'Payment'
      };
    case 'achievement_unlocked':
      return {
        icon: Star,
        color: 'yellow',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        iconColor: 'text-yellow-400',
        category: 'Achievement'
      };
    case 'level_up':
      return {
        icon: Crown,
        color: 'purple',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        iconColor: 'text-purple-400',
        category: 'Progress'
      };
    case 'admin_message':
      return {
        icon: Shield,
        color: 'red',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        iconColor: 'text-red-400',
        category: 'System'
      };
    default:
      return {
        icon: Bell,
        color: 'gray',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/20',
        iconColor: 'text-gray-400',
        category: 'General'
      };
  }
};

export function ModernNotificationsPanel({
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  loading = false
}: ModernNotificationsPanelProps) {
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  return (
    <div className="flex flex-col h-full max-h-[600px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-slate-300" />
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{unreadCount}</span>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            <p className="text-sm text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            className="bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all duration-200"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                Loading notifications...
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">No notifications</h3>
              <p className="text-slate-500 text-sm">You're all caught up! New notifications will appear here.</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((notification, index) => {
                const config = getNotificationConfig(notification.type);
                const Icon = config.icon;
                const isHovered = hoveredNotification === notification.id;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer",
                      "hover:bg-slate-800/30 hover:border-slate-600/50",
                      notification.is_read 
                        ? "bg-slate-800/20 border-slate-700/30" 
                        : `${config.bgColor} ${config.borderColor} shadow-lg`,
                      isHovered && "scale-[1.02] shadow-xl"
                    )}
                    onMouseEnter={() => setHoveredNotification(notification.id)}
                    onMouseLeave={() => setHoveredNotification(null)}
                    onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
                  >
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="absolute top-4 left-2 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse" />
                    )}
                    
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-200",
                        notification.is_read 
                          ? "bg-slate-800/50 border-slate-700/30" 
                          : `${config.bgColor} ${config.borderColor}`,
                        isHovered && !notification.is_read && "scale-110"
                      )}>
                        <Icon className={cn("w-6 h-6", notification.is_read ? "text-slate-500" : config.iconColor)} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-xs font-medium",
                                  notification.is_read 
                                    ? "bg-slate-700/50 text-slate-400 border-slate-600/50" 
                                    : `${config.bgColor} ${config.iconColor} border-transparent`
                                )}
                              >
                                {config.category}
                              </Badge>
                              <span className="text-xs text-slate-500 font-mono">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <h3 className={cn(
                              "font-semibold text-sm leading-tight mb-1",
                              notification.is_read ? "text-slate-400" : "text-white"
                            )}>
                              {notification.title}
                            </h3>
                            <p className={cn(
                              "text-sm leading-relaxed",
                              notification.is_read ? "text-slate-500" : "text-slate-300"
                            )}>
                              {notification.message}
                            </p>
                            
                            {/* Tip message */}
                            {notification.data?.tip_message && (
                              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="w-4 h-4 text-yellow-400" />
                                  <span className="text-xs font-medium text-slate-400">Message</span>
                                </div>
                                <p className="text-sm text-slate-300 italic">
                                  "{notification.data.tip_message}"
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className={cn(
                            "flex items-center gap-1 transition-all duration-200",
                            isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAsRead(notification.id);
                                }}
                                className="h-8 w-8 p-0 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-500"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                              }}
                              className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 text-slate-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-slate-700/50">
          <div className="text-center">
            <span className="text-xs text-slate-500">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}