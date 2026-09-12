import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { setQueueFarmContext } from '@/lib/offlineQueue';

// Types
export interface Farm {
  id: string;
  owner_id: string;
  name: string;
  name_en: string;
  location: string | null;
  total_sheds: number | null;
  is_active: boolean | null;
  organization_id?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FarmMember {
  id: string;
  farm_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// Context
interface FarmContextType {
  selectedFarmId: string | null;
  setSelectedFarmId: (id: string | null) => void;
  farms: Farm[];
  isLoading: boolean;
  currentFarm: Farm | null;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  // Listen for super-admin role updates targeting this user and refresh
  // every access-dependent cache so farms/devices/permissions reflect new
  // access without a manual reload.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`role-updates:${user.id}`)
      .on('broadcast', { event: 'roles_changed' }, () => {
        const keys = [
          ['user-farms'], ['farm-members'],
          ['perm_farm_checks'], ['v_user_canonical_roles'],
          ['device_tokens'], ['device_health'], ['device_status'],
          ['device_commands'], ['device-command-log'], ['dashboard-snapshot'],
        ];
        keys.forEach(k => queryClient.invalidateQueries({ queryKey: k as any, refetchType: 'all' }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Fetch farms the signed-in user can access. RLS already scopes this to
  // owner/member/org-admin/super-admin access; querying only farm_members
  // missed farm owners/org admins and left selectedFarmId null.
  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['user-farms', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (farmsError) throw farmsError;
      return (farmsData || []) as Farm[];
    },
    enabled: !!user,
  });

  // Auto-select first accessible farm and clear stale selections after role/farm changes.
  useEffect(() => {
    if (farms.length === 0) {
      if (selectedFarmId) setSelectedFarmId(null);
      return;
    }

    const selectedStillVisible = farms.some((farm) => farm.id === selectedFarmId);
    if (!selectedFarmId || !selectedStillVisible) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

  // Keep the offline queue's farm snapshot in sync so mutations enqueued
  // while offline are replayed against the farm that was selected then.
  useEffect(() => {
    setQueueFarmContext(selectedFarmId);
  }, [selectedFarmId]);

  const currentFarm = farms.find(f => f.id === selectedFarmId) || null;

  return (
    <FarmContext.Provider value={{ selectedFarmId, setSelectedFarmId, farms, isLoading, currentFarm }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarmContext() {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarmContext must be used within a FarmProvider');
  }
  return context;
}

/**
 * Non-throwing variant for components/hooks that may render outside a
 * FarmProvider (e.g. tests, public pages, or shared hooks like
 * useSafetyStatus). Returns `null` when the provider is absent — callers
 * can decide whether that is acceptable.
 */
export function useFarmContextSafe(): FarmContextType | null {
  const context = useContext(FarmContext);
  return context ?? null;
}

// Hook: Farm members management
export function useFarmMembers(farmId?: string | null) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const targetFarmId = farmId || selectedFarmId;

  return useQuery({
    queryKey: ['farm-members', targetFarmId],
    queryFn: async () => {
      if (!targetFarmId) return [];
      const { data, error } = await supabase
        .from('farm_members')
        .select('*')
        .eq('farm_id', targetFarmId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as FarmMember[];
    },
    enabled: !!user && !!targetFarmId,
  });
}

export function useAddFarmMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ farmId, userId, role = 'member' }: { farmId: string; userId: string; role?: string }) => {
      const { error } = await supabase
        .from('farm_members')
        .insert({ farm_id: farmId, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-members'] });
    },
  });
}

export function useRemoveFarmMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ farmId, userId }: { farmId: string; userId: string }) => {
      const { error } = await supabase
        .from('farm_members')
        .delete()
        .eq('farm_id', farmId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-members'] });
    },
  });
}
