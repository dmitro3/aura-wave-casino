import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceStatus {
  is_maintenance_mode: boolean;
  maintenance_message: string;
  maintenance_title: string;
  started_at?: string;
  ended_at?: string;
}

interface MaintenanceContextType {
  maintenanceStatus: MaintenanceStatus | null;
  loading: boolean;
  isMaintenanceMode: boolean;
  refreshMaintenanceStatus: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_maintenance_status');
      
      if (error) {
        console.error('Error fetching maintenance status:', error);
        return;
      }

      if (data) {
        setMaintenanceStatus(data);
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshMaintenanceStatus = async () => {
    await fetchMaintenanceStatus();
  };

  useEffect(() => {
    fetchMaintenanceStatus();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('maintenance_settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_settings',
        },
        () => {
          fetchMaintenanceStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const value = {
    maintenanceStatus,
    loading,
    isMaintenanceMode: maintenanceStatus?.is_maintenance_mode ?? false,
    refreshMaintenanceStatus,
  };

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
}