import React from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { AlertTriangle, Wrench, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MaintenanceAwareGameProps {
  children: React.ReactNode;
  gameName: string;
}

export function MaintenanceAwareGame({ children, gameName }: MaintenanceAwareGameProps) {
  const { isMaintenanceMode, maintenanceStatus } = useMaintenance();

  if (isMaintenanceMode) {
    return (
      <Card className="glass border-0 p-8 text-center relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        
        {/* Main content */}
        <CardContent className="relative z-10">
          {/* Icon with animated background */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-full shadow-lg">
                <Wrench className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          
          {/* Title with gradient text */}
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {gameName} Temporarily Unavailable
          </h2>
          
          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg leading-relaxed max-w-md mx-auto">
            {maintenanceStatus?.maintenance_message || 'This game is temporarily unavailable during maintenance. Please check back soon.'}
          </p>
          
          {/* Status indicators */}
          <div className="flex flex-col items-center space-y-3 mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>Game paused during maintenance</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Auto-refresh when maintenance completes</span>
            </div>
          </div>
          
          {/* Maintenance timing info */}
          {maintenanceStatus?.started_at && (
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                Started: {new Date(maintenanceStatus.started_at).toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}