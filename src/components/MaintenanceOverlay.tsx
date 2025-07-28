import React, { useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wrench, Clock, Shield, Settings, RefreshCw } from 'lucide-react';
import AdminPanel from './AdminPanel';

export default function MaintenanceOverlay() {
  const { maintenanceStatus, loading, isMaintenanceMode } = useMaintenance();
  const { user } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  // Check admin status when user is authenticated
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      try {
        // Try the robust admin check function
        const { data: adminCheck, error: adminError } = await supabase.rpc('check_admin_status_robust');
        if (!adminError && adminCheck !== null) {
          setIsAdmin(adminCheck);
        } else {
          // Fallback to direct table access
          const { data, error } = await supabase
            .from('admin_users')
            .select('user_id, permissions, created_at')
            .eq('user_id', '5b9c6d6c-1c2e-4609-91d1-6e706b93f315')
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error checking admin status:', error);
          }
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

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
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full text-center shadow-2xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
          
          {/* Admin Access Button - Only show for admin users */}
          {user && !adminLoading && isAdmin && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="absolute top-4 right-4 p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 z-10"
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Admin</span>
            </button>
          )}
          
          {/* Main content */}
          <div className="relative z-10">
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
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {maintenanceStatus?.maintenance_title || 'Under Maintenance'}
            </h1>

            {/* Message */}
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 leading-relaxed">
              {maintenanceStatus?.maintenance_message || 'Website is currently under maintenance. Please check back soon.'}
            </p>

            {/* Status Info */}
            {maintenanceStatus?.started_at && (
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>
                  Started: {new Date(maintenanceStatus.started_at).toLocaleString()}
                </span>
              </div>
            )}

            {/* Animated dots */}
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>

            {/* Auto-refresh notice */}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>This page will automatically refresh when maintenance is complete.</span>
            </div>

            {/* Admin notice for admin users */}
            {user && !adminLoading && isAdmin && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin access available - Click the Admin button to control maintenance mode.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    {/* Admin Panel Modal */}
    {showAdminPanel && (
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    )}
  </>
  );
}