import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';

export interface Shed {
  id: string;
  user_id: string;
  farm_id?: string | null;
  name: string;
  name_en: string;
  description: string | null;
  bird_capacity: number;
  farm_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Shed Context for app-wide shed selection
interface ShedContextType {
  selectedShedId: string | null;
  setSelectedShedId: (id: string | null) => void;
}

export const ShedContext = createContext<ShedContextType | undefined>(undefined);

export function ShedProvider({ children }: { children: ReactNode }) {
  const [selectedShedId, setSelectedShedId] = useState<string | null>(null);
  
  return React.createElement(
    ShedContext.Provider,
    { value: { selectedShedId, setSelectedShedId } },
    children
  );
}

export function useSelectedShed() {
  const context = useContext(ShedContext);
  if (context === undefined) {
    throw new Error('useSelectedShed must be used within a ShedProvider');
  }
  return context;
}

// Fetch all sheds for the active farm (RLS filters by membership)
export function useSheds() {
  const { user } = useAuth();
  let selectedFarmId: string | null = null;
  try { selectedFarmId = useFarmContext().selectedFarmId; } catch { /* outside provider */ }

  return useQuery({
    queryKey: ['sheds', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from('sheds').select('*').order('created_at', { ascending: true });
      if (selectedFarmId) {
        q = q.eq('farm_id', selectedFarmId);
      } else {
        // Fallback: legacy single-farm users without active farm context
        q = q.eq('user_id', user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Shed[];
    },
    enabled: !!user,
  });
}

// Add a new shed
export function useAddShed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  let selectedFarmId: string | null = null;
  try { selectedFarmId = useFarmContext().selectedFarmId; } catch { /* outside provider */ }

  return useMutation({
    mutationFn: async (shed: { name: string; name_en: string; description?: string; bird_capacity?: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('sheds')
        .insert({ ...shed, user_id: user.id, farm_id: selectedFarmId ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheds'] });
    },
  });
}

// Update a shed
export function useUpdateShed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Shed> & { id: string }) => {
      const { error } = await supabase
        .from('sheds')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheds'] });
    },
  });
}

// Delete a shed
export function useDeleteShed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sheds')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheds'] });
    },
  });
}
