import React from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { Loader2, Wrench, Clock } from 'lucide-react';

export default function MaintenanceOverlay() {
  const { maintenanceStatus, loading, isMaintenanceMode } = useMaintenance();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isMaintenanceMode) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-full">
            <Wrench className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {maintenanceStatus?.maintenance_title || 'Under Maintenance'}
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 leading-relaxed">
          {maintenanceStatus?.maintenance_message || 'Website is currently under maintenance. Please check back soon.'}
        </p>

        {/* Status Info */}
        {maintenanceStatus?.started_at && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <Clock className="h-4 w-4" />
            <span>
              Started: {new Date(maintenanceStatus.started_at).toLocaleString()}
            </span>
          </div>
        )}

        {/* Animated dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Auto-refresh notice */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          This page will automatically refresh when maintenance is complete.
        </p>
      </div>
    </div>
  );
}