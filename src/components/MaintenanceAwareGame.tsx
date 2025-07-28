import React from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { AlertTriangle, Wrench } from 'lucide-react';

interface MaintenanceAwareGameProps {
  children: React.ReactNode;
  gameName: string;
}

export function MaintenanceAwareGame({ children, gameName }: MaintenanceAwareGameProps) {
  const { isMaintenanceMode, maintenanceStatus } = useMaintenance();

  if (isMaintenanceMode) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-full mb-4">
          <Wrench className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {gameName} Temporarily Unavailable
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
          {maintenanceStatus?.maintenance_message || 'This game is temporarily unavailable during maintenance. Please check back soon.'}
        </p>
        
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <AlertTriangle className="h-4 w-4" />
          <span>Game paused during maintenance</span>
        </div>
        
        {maintenanceStatus?.started_at && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Maintenance started: {new Date(maintenanceStatus.started_at).toLocaleString()}
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}