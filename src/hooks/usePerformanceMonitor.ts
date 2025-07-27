import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PerformanceMetrics {
  authLoadTime: number;
  profileLoadTime: number;
  totalLoadTime: number;
  subscriptionCount: number;
}

export function usePerformanceMonitor() {
  const { user, loading: authLoading } = useAuth();
  const startTime = useRef<number>(Date.now());
  const authLoadTime = useRef<number>(0);
  const profileLoadTime = useRef<number>(0);
  const subscriptionCount = useRef<number>(0);

  useEffect(() => {
    if (!authLoading && user) {
      authLoadTime.current = Date.now() - startTime.current;
      console.log(`🚀 Auth loaded in ${authLoadTime.current}ms`);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (user) {
      // Track subscription count
      const interval = setInterval(() => {
        const channels = (window as any).supabase?.realtime?.channels || [];
        subscriptionCount.current = channels.length;
        
        if (subscriptionCount.current > 0) {
          console.log(`📡 Active subscriptions: ${subscriptionCount.current}`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const getMetrics = (): PerformanceMetrics => {
    const totalLoadTime = Date.now() - startTime.current;
    
    return {
      authLoadTime: authLoadTime.current,
      profileLoadTime: profileLoadTime.current,
      totalLoadTime,
      subscriptionCount: subscriptionCount.current,
    };
  };

  const logPerformance = () => {
    const metrics = getMetrics();
    console.log('📊 Performance Metrics:', {
      'Auth Load Time': `${metrics.authLoadTime}ms`,
      'Profile Load Time': `${metrics.profileLoadTime}ms`,
      'Total Load Time': `${metrics.totalLoadTime}ms`,
      'Active Subscriptions': metrics.subscriptionCount,
    });
  };

  return {
    getMetrics,
    logPerformance,
  };
}