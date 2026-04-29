import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Shed {
  id: string;
  user_id: string;
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

// Fetch all sheds for a user
export function useSheds() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sheds', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sheds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
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
  
  return useMutation({
    mutationFn: async (shed: { name: string; name_en: string; description?: string; bird_capacity?: number }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('sheds')
        .insert({ ...shed, user_id: user.id })
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
