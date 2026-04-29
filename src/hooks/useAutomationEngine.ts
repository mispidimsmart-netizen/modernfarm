import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSelectedShed } from './useSheds';
import { useAutomationMode } from './useAutomationMode';

interface AutomationAction {
  fan: boolean;
  fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  alarm: boolean;
  alert?: {
    type: string;
    severity: 'warning' | 'danger';
    message: string;
    messageBn: string;
  };
}

interface HSIResult {
  index: number;
  simpleIndex: number;
  level: 'normal' | 'mild' | 'moderate' | 'severe' | 'emergency';
}

interface AutomationResult {
  action: AutomationAction;
  hsi: HSIResult;
  sensor: {
    temperature: number;
    humidity: number;
    ammonia: number;
  };
  timestamp: string;
}

interface ShedStatus {
  shed_id: string;
  name: string;
  name_en: string;
  is_active: boolean;
  device: {
    is_online: boolean;
    failsafe_mode: boolean;
    last_cloud_sync: string | null;
    last_seen: string | null;
    mode: 'AUTO' | 'FAIL-SAFE';
  } | null;
  sensor: {
    temperature: number;
    humidity: number;
    ammonia: number;
    timestamp: string;
  } | null;
  hsi: {
    index: number;
    level: string;
    fanSpeed: string;
  } | null;
}

interface AutomationStatusResponse {
  success: boolean;
  sheds: ShedStatus[];
  total_sheds: number;
  sheds_online: number;
  sheds_failsafe: number;
  timestamp: string;
}

/**
 * Hook to get automation status for all sheds
 */
export function useAutomationEngineStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['automation-engine-status', user?.id],
    queryFn: async (): Promise<AutomationStatusResponse> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('automation-engine', {
        body: {
          action: 'get-status',
          user_id: user.id,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });
}

/**
 * Hook to run automation for a specific shed
 */
export function useRunAutomation() {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shedId?: string): Promise<{ success: boolean; automation: AutomationResult }> => {
      if (!user) throw new Error('Not authenticated');

      const targetShedId = shedId || selectedShedId;

      // Resolve farm_id from shed for multi-farm safety
      let farmId: string | null = null;
      if (targetShedId) {
        const { data: shed } = await supabase
          .from('sheds')
          .select('farm_id')
          .eq('id', targetShedId)
          .maybeSingle();
        farmId = shed?.farm_id || null;
      }

      const { data, error } = await supabase.functions.invoke('automation-engine', {
        body: {
          action: 'run-automation',
          user_id: user.id,
          shed_id: targetShedId,
          farm_id: farmId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-engine-status'] });
      queryClient.invalidateQueries({ queryKey: ['device_status'] });
    },
  });
}

/**
 * Hook to get automation result for current shed
 */
export function useCurrentShedAutomation() {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { data: automationMode } = useAutomationMode();
  const isManualMode = automationMode === 'MANUAL';

  return useQuery({
    queryKey: ['automation-engine-run', user?.id, selectedShedId],
    queryFn: async (): Promise<{ success: boolean; automation: AutomationResult }> => {
      if (!user || !selectedShedId) throw new Error('Not ready');

      // Resolve farm_id from shed for multi-farm safety
      const { data: shed } = await supabase
        .from('sheds')
        .select('farm_id')
        .eq('id', selectedShedId)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('automation-engine', {
        body: {
          action: 'run-automation',
          user_id: user.id,
          shed_id: selectedShedId,
          farm_id: shed?.farm_id ?? null,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedShedId && !isManualMode,
    refetchInterval: isManualMode ? false : 60000,
    staleTime: 30000,
  });
}
