import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateDeviceToken } from '@/lib/esp32Api';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Data layer for the Device & System settings tab.
 * Owns every Supabase read/write so the section components stay presentational.
 * All queries are farm-scoped — never drop the `farm_id` filter.
 */
export function useDeviceSystemData() {
  const { language, user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showEventLogs, setShowEventLogs] = useState(false);
  const [showErrorLogs, setShowErrorLogs] = useState(false);

  // ---- Calibration -------------------------------------------------------
  const [tempOffset, setTempOffset] = useState(() => Number(localStorage.getItem('cal_temp_offset') || 0));
  const [humidityOffset, setHumidityOffset] = useState(() => Number(localStorage.getItem('cal_humidity_offset') || 0));
  const [ammoniaOffset, setAmmoniaOffset] = useState(() => Number(localStorage.getItem('cal_ammonia_offset') || 0));

  const { data: calibration } = useQuery({
    queryKey: ['device_calibration', selectedFarmId],
    queryFn: async () => {
      if (!selectedFarmId) return null;
      const { data, error } = await supabase
        .from('device_calibration')
        .select('*')
        .eq('farm_id', selectedFarmId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFarmId,
  });

  useEffect(() => {
    if (!calibration) return;
    const c: any = calibration;
    if (c.temperature_offset_celsius !== undefined && c.temperature_offset_celsius !== null) {
      setTempOffset(Number(c.temperature_offset_celsius));
    }
    if (c.humidity_offset_percent !== undefined && c.humidity_offset_percent !== null) {
      setHumidityOffset(Number(c.humidity_offset_percent));
    }
    if (c.ammonia_offset_ppm !== undefined && c.ammonia_offset_ppm !== null) {
      setAmmoniaOffset(Number(c.ammonia_offset_ppm));
    }
  }, [calibration]);

  const saveCalibration = useMutation({
    mutationFn: async () => {
      if (!user || !selectedFarmId) throw new Error('No farm selected');
      const existingId = (calibration as any)?.id as string | undefined;
      const basePayload = {
        temperature_offset_celsius: tempOffset,
        humidity_offset_percent: humidityOffset,
        ammonia_offset_ppm: ammoniaOffset,
        updated_at: new Date().toISOString(),
      };
      if (existingId) {
        // Update in place — avoids duplicate rows on rapid clicks
        const { error } = await supabase.from('device_calibration').update(basePayload).eq('id', existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('device_calibration')
          .insert({ user_id: user.id, farm_id: selectedFarmId, ...basePayload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_calibration'] });
      toast({
        title: language === 'bn' ? 'ক্যালিব্রেশন সেভ হয়েছে' : 'Calibration saved',
        description:
          language === 'bn'
            ? 'অফসেট DB-তে সংরক্ষিত — ESP32 পরবর্তী সিঙ্কে গ্রহণ করবে'
            : 'Offsets saved to DB — ESP32 will fetch on next sync',
      });
    },
    onError: (err: any) => {
      toast({
        title: language === 'bn' ? 'সেভ ব্যর্থ' : 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const persistCalibration = () => {
    localStorage.setItem('cal_temp_offset', String(tempOffset));
    localStorage.setItem('cal_humidity_offset', String(humidityOffset));
    localStorage.setItem('cal_ammonia_offset', String(ammoniaOffset));
    saveCalibration.mutate();
  };

  // ---- Device tokens -----------------------------------------------------
  const { data: deviceTokens } = useQuery({
    queryKey: ['device_tokens', selectedFarmId],
    queryFn: async () => {
      if (!selectedFarmId) return [];
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('farm_id', selectedFarmId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFarmId,
  });

  const addDeviceToken = useMutation({
    mutationFn: async ({ name, shedId }: { name: string; shedId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedFarmId) throw new Error('No farm selected');
      const token = generateDeviceToken();
      const { error } = await supabase.from('device_tokens').insert({
        user_id: user.id,
        farm_id: selectedFarmId,
        device_name: name,
        token,
        shed_id: shedId || null,
      });
      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
      toast({ title: language === 'bn' ? 'ডিভাইস যোগ হয়েছে' : 'Device Added' });
    },
  });

  const deleteDeviceToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('device_tokens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
    },
  });

  // ---- Logs --------------------------------------------------------------
  const { data: eventLogs, refetch: refetchEventLogs } = useQuery({
    queryKey: ['event_logs', selectedFarmId],
    queryFn: async () => {
      if (!selectedFarmId) return [];
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('farm_id', selectedFarmId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFarmId && showEventLogs,
  });

  const { data: errorLogs, refetch: refetchErrorLogs } = useQuery({
    queryKey: ['error_logs', selectedFarmId],
    queryFn: async () => {
      if (!selectedFarmId) return [];
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('farm_id', selectedFarmId)
        .eq('severity', 'danger')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFarmId && showErrorLogs,
  });

  // ---- Device commands ---------------------------------------------------
  const sendDeviceCommand = async (commandType: 'restart' | 'factory_reset') => {
    if (!user || !selectedFarmId) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'ফার্ম নির্বাচিত নয়' : 'No farm selected',
        variant: 'destructive',
      });
      return false;
    }
    const { error } = await supabase.from('device_commands').insert({
      user_id: user.id,
      farm_id: selectedFarmId,
      device_name: 'ESP32',
      command_type: commandType,
      command_value: true,
      executed: false,
    });
    if (error) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const restartDevice = async () => {
    if (!(await sendDeviceCommand('restart'))) return;
    toast({
      title: language === 'bn' ? 'রিস্টার্ট কমান্ড পাঠানো হয়েছে' : 'Restart command sent',
      description:
        language === 'bn' ? 'ডিভাইস পরবর্তী চেকইনে রিস্টার্ট হবে' : 'Device will restart at next check-in',
    });
  };

  const factoryReset = async () => {
    if (!(await sendDeviceCommand('factory_reset'))) return;
    toast({
      title: language === 'bn' ? 'ফ্যাক্টরি রিসেট কমান্ড পাঠানো হয়েছে' : 'Factory reset command sent',
      description: language === 'bn' ? 'ডিভাইস পরবর্তী চেকইনে রিসেট হবে' : 'Device will reset at next check-in',
      variant: 'destructive',
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: language === 'bn' ? 'কপি হয়েছে!' : 'Copied!' });
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return {
    // calibration
    tempOffset,
    setTempOffset,
    humidityOffset,
    setHumidityOffset,
    ammoniaOffset,
    setAmmoniaOffset,
    persistCalibration,
    savingCalibration: saveCalibration.isPending,
    // devices
    deviceTokens,
    addDeviceToken,
    deleteDeviceToken,
    copyToClipboard,
    restartDevice,
    factoryReset,
    // logs
    showEventLogs,
    setShowEventLogs,
    showErrorLogs,
    setShowErrorLogs,
    eventLogs,
    refetchEventLogs,
    errorLogs,
    refetchErrorLogs,
  };
}
