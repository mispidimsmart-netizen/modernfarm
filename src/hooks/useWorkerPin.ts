/**
 * useWorkerPin — Worker Mode PIN management (S2.1)
 *
 * Owner sets a 4-digit PIN per farm. Workers (or anyone on a shared device)
 * unlock /worker by entering the PIN. PIN is bcrypt-hashed server-side via
 * RPCs `set_worker_pin` and `verify_worker_pin` — plain PIN never leaves DB.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarmContext } from '@/context/FarmContext';

const LS_UNLOCKED_PREFIX = 'worker_mode_unlocked:';

export function workerUnlockKey(farmId: string) {
  return `${LS_UNLOCKED_PREFIX}${farmId}`;
}

/** Returns whether the given farm has a PIN configured (just checks for non-null hash). */
export function useFarmHasWorkerPin(farmId?: string | null) {
  return useQuery({
    queryKey: ['farm-has-worker-pin', farmId],
    queryFn: async () => {
      if (!farmId) return false;
      const { data, error } = await supabase
        .from('farms')
        .select('worker_pin_hash')
        .eq('id', farmId)
        .maybeSingle();
      if (error) throw error;
      return !!data?.worker_pin_hash;
    },
    enabled: !!farmId,
    staleTime: 30_000,
  });
}

/** Owner-only: set or clear ('') the PIN for a farm. */
export function useSetWorkerPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ farmId, pin }: { farmId: string; pin: string }) => {
      const { data, error } = await supabase.rpc('set_worker_pin', {
        _farm_id: farmId,
        _pin: pin,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['farm-has-worker-pin', vars.farmId] });
      // Clearing PIN should also revoke any existing unlock on this device.
      if (!vars.pin) {
        try { localStorage.removeItem(workerUnlockKey(vars.farmId)); } catch { /* noop */ }
      }
    },
  });
}

/** Verify a PIN; on success, marks this device as unlocked for the farm. */
export function useVerifyWorkerPin() {
  return useMutation({
    mutationFn: async ({ farmId, pin }: { farmId: string; pin: string }) => {
      const { data, error } = await supabase.rpc('verify_worker_pin', {
        _farm_id: farmId,
        _pin: pin,
      });
      if (error) throw error;
      const ok = !!data;
      if (ok) {
        try { localStorage.setItem(workerUnlockKey(farmId), '1'); } catch { /* noop */ }
      }
      return ok;
    },
  });
}

/** Check if current device is unlocked for the active farm. */
export function useIsWorkerUnlocked() {
  const { selectedFarmId } = useFarmContext();
  if (!selectedFarmId) return false;
  try {
    return localStorage.getItem(workerUnlockKey(selectedFarmId)) === '1';
  } catch {
    return false;
  }
}

/** Lock the device again (forget the unlock token). */
export function lockWorkerDevice(farmId: string) {
  try { localStorage.removeItem(workerUnlockKey(farmId)); } catch { /* noop */ }
}
