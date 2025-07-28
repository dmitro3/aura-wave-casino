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
        {/* Animated background gradient - matches site theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 animate-pulse-glow"></div>
        
        {/* Main content */}
        <CardContent className="relative z-10">
          {/* Icon with animated background - matches site colors */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-40 animate-pulse-glow"></div>
              <div className="relative bg-gradient-to-r from-primary to-accent p-4 rounded-full shadow-glow">
                <Wrench className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          
          {/* Title with gradient text - matches site theme */}
          <h2 className="text-3xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
            {gameName} Temporarily Unavailable
          </h2>
          
          {/* Message */}
          <p className="text-muted-foreground mb-6 text-lg leading-relaxed max-w-md mx-auto">
            {maintenanceStatus?.maintenance_message || 'This game is temporarily unavailable during maintenance. Please check back soon.'}
          </p>
          
          {/* Status indicators - matches site styling */}
          <div className="flex flex-col items-center space-y-3 mb-6">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>Game paused during maintenance</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-accent" />
              <span>Auto-refresh when maintenance completes</span>
            </div>
          </div>
          
          {/* Maintenance timing info - matches site colors */}
          {maintenanceStatus?.started_at && (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
              <Clock className="h-4 w-4 text-primary" />
              <span>
                Started: {new Date(maintenanceStatus.started_at).toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Animated dots - matches site color scheme */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}