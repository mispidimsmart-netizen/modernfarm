/**
 * React-query wrappers around `src/api/sheds`.
 * All data access and validation live in the API module; this file only
 * resolves the active tenant scope and manages cache invalidation.
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import {
  listSheds,
  createShed,
  updateShed,
  deleteShed,
  type Shed,
  type ShedInput,
} from '@/api/sheds';

export type { Shed } from '@/api/sheds';

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

/** Active farm id, tolerating components rendered outside FarmProvider. */
function useActiveFarmId(): string | null {
  try {
    return useFarmContext().selectedFarmId;
  } catch {
    return null;
  }
}

// Fetch all sheds for the active farm (RLS additionally filters by membership)
export function useSheds() {
  const { user } = useAuth();
  const selectedFarmId = useActiveFarmId();

  return useQuery({
    queryKey: ['sheds', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user) return [] as Shed[];
      return listSheds({ userId: user.id, farmId: selectedFarmId });
    },
    enabled: !!user,
  });
}

export function useAddShed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const selectedFarmId = useActiveFarmId();

  return useMutation({
    mutationFn: async (shed: ShedInput) => {
      if (!user) throw new Error('Not authenticated');
      return createShed({ userId: user.id, farmId: selectedFarmId }, shed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheds'] });
    },
  });
}

export function useUpdateShed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Shed> & { id: string }) =>
      updateShed(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheds'] });
    },
  });
}

export function useDeleteShed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => deleteShed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sheds'] });
    },
  });
}
