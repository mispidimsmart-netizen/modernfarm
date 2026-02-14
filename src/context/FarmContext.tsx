import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Types
export interface Farm {
  id: string;
  owner_id: string;
  name: string;
  name_en: string;
  location: string | null;
  total_sheds: number | null;
  is_active: boolean | null;
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
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  // Fetch farms user has access to via farm_members
  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['user-farms', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get farm IDs from farm_members
      const { data: memberships, error: memberError } = await supabase
        .from('farm_members')
        .select('farm_id')
        .eq('user_id', user.id);
      
      if (memberError) throw memberError;
      if (!memberships?.length) return [];

      const farmIds = memberships.map(m => m.farm_id);
      
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .in('id', farmIds)
        .order('created_at', { ascending: true });
      
      if (farmsError) throw farmsError;
      return (farmsData || []) as Farm[];
    },
    enabled: !!user,
  });

  // Auto-select first farm
  useEffect(() => {
    if (farms.length > 0 && !selectedFarmId) {
      setSelectedFarmId(farms[0].id);
    }
  }, [farms, selectedFarmId]);

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
