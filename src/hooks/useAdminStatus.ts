import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Global cache for admin status to prevent excessive queries
const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Function to clear admin status cache
export const clearAdminStatusCache = () => {
  adminStatusCache.clear();
};

export const useAdminStatus = (userId?: string) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const targetUserId = userId || user?.id;

  const checkAdminStatus = useCallback(async () => {
    if (!targetUserId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = adminStatusCache.get(targetUserId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setIsAdmin(cached.isAdmin);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      // DIRECTLY use RPC function to avoid 406 errors completely
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('check_admin_status_simple', { user_uuid: targetUserId });

      if (mountedRef.current) {
        if (rpcError) {
          setIsAdmin(false);
          setError(null); // Don't show errors to user
          
          // Cache as non-admin
          adminStatusCache.set(targetUserId, {
            isAdmin: false,
            timestamp: Date.now()
          });
        } else {
          const adminStatus = !!rpcResult;
          setIsAdmin(adminStatus);
          setError(null);
          
          // Cache the result
          adminStatusCache.set(targetUserId, {
            isAdmin: adminStatus,
            timestamp: Date.now()
          });
        }
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setIsAdmin(false);
        setError(null); // Don't show errors to user
        
        // Cache as non-admin
        adminStatusCache.set(targetUserId, {
          isAdmin: false,
          timestamp: Date.now()
        });
        
        setLoading(false);
      }
    }
  }, [targetUserId]);

  // Set up real-time subscription for admin status changes
  useEffect(() => {
    if (!targetUserId) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Set up new subscription for admin_users table changes
    const channel = supabase
      .channel(`admin_status_${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'admin_users',
          filter: `user_id=eq.${targetUserId}`
        },
        async (payload) => {
          // Only log actual admin changes, not connection status
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Admin status changed for user:', targetUserId);
          }
          
          // Clear cache for this user
          adminStatusCache.delete(targetUserId);
          
          // Re-check admin status immediately
          if (mountedRef.current) {
            setLoading(true);
            await checkAdminStatus();
          }
        }
      )
      .subscribe(); // Remove the verbose status callback

    subscriptionRef.current = channel;

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [targetUserId, checkAdminStatus]);

  useEffect(() => {
    mountedRef.current = true;

    const fetchStatus = async () => {
      await checkAdminStatus();
    };

    fetchStatus();

    return () => {
      mountedRef.current = false;
    };
  }, [checkAdminStatus]);

  return { isAdmin, loading, error, refetch: checkAdminStatus };
};

// Hook to check multiple users' admin status at once
export const useMultipleAdminStatus = (userIds: string[]) => {
  const [adminStatuses, setAdminStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // Deduplicate user IDs to prevent spam
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  const checkMultipleAdminStatus = useCallback(async () => {
    if (uniqueUserIds.length === 0) {
      setAdminStatuses({});
      setLoading(false);
      return;
    }

    // Check cache first for all user IDs
    const uncachedUserIds: string[] = [];
    const cachedStatuses: Record<string, boolean> = {};
    
    uniqueUserIds.forEach(userId => {
      const cached = adminStatusCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        cachedStatuses[userId] = cached.isAdmin;
      } else {
        uncachedUserIds.push(userId);
      }
    });

    // If all users are cached, return immediately
    if (uncachedUserIds.length === 0) {
      setAdminStatuses(cachedStatuses);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      // DIRECTLY use RPC function to avoid 406 errors completely
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('check_multiple_admin_status', { user_uuids: uncachedUserIds });

      if (mountedRef.current) {
        if (rpcError) {
          const statuses: Record<string, boolean> = { ...cachedStatuses };
          uncachedUserIds.forEach(userId => {
            statuses[userId] = false;
            adminStatusCache.set(userId, {
              isAdmin: false,
              timestamp: Date.now()
            });
          });
          setAdminStatuses(statuses);
          setError(null); // Don't show errors to user
        } else {
          const statuses: Record<string, boolean> = { ...cachedStatuses };
          
          if (Array.isArray(rpcResult)) {
            rpcResult.forEach((result: { user_id: string; is_admin: boolean }) => {
              statuses[result.user_id] = result.is_admin;
              adminStatusCache.set(result.user_id, {
                isAdmin: result.is_admin,
                timestamp: Date.now()
              });
            });
          } else {
            // Handle case where RPC returns non-array (fallback)
            uncachedUserIds.forEach(userId => {
              statuses[userId] = false;
              adminStatusCache.set(userId, {
                isAdmin: false,
                timestamp: Date.now()
              });
            });
          }
          
          setAdminStatuses(statuses);
          setError(null);
        }
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        const statuses: Record<string, boolean> = { ...cachedStatuses };
        uncachedUserIds.forEach(userId => {
          statuses[userId] = false;
          adminStatusCache.set(userId, {
            isAdmin: false,
            timestamp: Date.now()
          });
        });
        setAdminStatuses(statuses);
        setError(null); // Don't show errors to user
        setLoading(false);
      }
    }
  }, [uniqueUserIds]);

  // Set up real-time subscription for admin status changes
  useEffect(() => {
    if (uniqueUserIds.length === 0) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create a stable subscription key to prevent excessive recreation
    const subscriptionKey = uniqueUserIds.sort().join('_');

    // Set up new subscription for admin_users table changes for any of the target users
    const channel = supabase
      .channel(`multiple_admin_status_${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'admin_users'
          // Note: No filter here because we want to catch changes for any of our target users
        },
        async (payload) => {
          // Check if the change affects any of our target users
          const affectedUserId = payload.new?.user_id || payload.old?.user_id;
          if (affectedUserId && uniqueUserIds.includes(affectedUserId)) {
            // Only log in development mode and only actual changes
            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 Admin status changed for tracked user:', affectedUserId);
            }
            
            // Clear cache for affected user
            adminStatusCache.delete(affectedUserId);
            
            // Re-check all admin statuses
            if (mountedRef.current) {
              setLoading(true);
              await checkMultipleAdminStatus();
            }
          }
        }
      )
      .subscribe(); // Remove the verbose status callback

    subscriptionRef.current = channel;

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [uniqueUserIds.join(','), checkMultipleAdminStatus]); // Use stable dependency

  useEffect(() => {
    mountedRef.current = true;

    const fetchStatuses = async () => {
      await checkMultipleAdminStatus();
    };

    fetchStatuses();

    return () => {
      mountedRef.current = false;
    };
  }, [checkMultipleAdminStatus]);

  return { adminStatuses, loading, error, refetch: checkMultipleAdminStatus };
};