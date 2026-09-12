import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FarmOption } from './types';

/**
 * Loads farms (admin selector) and auto-fills credentials (farm/shed/device token)
 * for the current user's farm or the admin-selected farm.
 */
export function useFirmwareCredentials(showFarmSelector: boolean) {
  const [allFarms, setAllFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [shedId, setShedId] = useState('');
  const [shedName, setShedName] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Admin: list of farms to pick from
  useEffect(() => {
    if (!showFarmSelector) return;
    const fetchAllFarms = async () => {
      try {
        const { data: farms } = await supabase
          .from('farms')
          .select('id, name, name_en, owner_id')
          .eq('is_active', true)
          .order('name');
        if (!farms?.length) return;

        const ownerIds = [...new Set(farms.map((f) => f.owner_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, phone, farm_name')
          .in('id', ownerIds);

        const profileIds = new Set(profiles?.map((p) => p.id) || []);
        const phoneMap = new Map(profiles?.map((p) => [p.id, p.phone]) || []);
        const farmNameMap = new Map(profiles?.map((p) => [p.id, p.farm_name]) || []);
        // Only farms whose owner still has a valid profile
        setAllFarms(
          farms
            .filter((f) => profileIds.has(f.owner_id))
            .map((f) => ({
              ...f,
              name: farmNameMap.get(f.owner_id) || f.name,
              owner_phone: phoneMap.get(f.owner_id) || '',
            })),
        );
      } catch (err) {
        console.warn('Could not fetch farms:', err);
      }
    };
    fetchAllFarms();
  }, [showFarmSelector]);

  // Auto-load credentials for the resolved farm
  useEffect(() => {
    const fetchCredentials = async (targetFarmId?: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let farm: { id: string; name: string } | null = null;

        if (targetFarmId) {
          const { data } = await supabase.from('farms').select('id, name').eq('id', targetFarmId).limit(1);
          farm = data?.[0] || null;
        } else if (!showFarmSelector) {
          const { data } = await supabase
            .from('farms')
            .select('id, name')
            .eq('owner_id', user.id)
            .eq('is_active', true)
            .limit(1);
          farm = data?.[0] || null;
        }
        if (!farm) return;

        setFarmId(farm.id);

        const { data: sheds } = await supabase.from('sheds').select('id, name').eq('farm_id', farm.id).limit(1);
        setShedId(sheds?.[0]?.id || '');
        setShedName(sheds?.[0]?.name || '');

        const { data: tokens } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('farm_id', farm.id)
          .eq('is_active', true)
          .limit(1);
        setDeviceToken(tokens?.[0]?.token || '');

        setAutoLoaded(true);
      } catch (err) {
        console.warn('Could not auto-load credentials:', err);
      }
    };

    if (showFarmSelector && selectedFarmId) fetchCredentials(selectedFarmId);
    else if (!showFarmSelector) fetchCredentials();
  }, [showFarmSelector, selectedFarmId]);

  const selectFarm = (id: string) => {
    setSelectedFarmId(id);
    setAutoLoaded(false);
    setDeviceToken('');
    setShedId('');
    setShedName('');
    setFarmId('');
  };

  return {
    allFarms,
    selectedFarmId,
    selectFarm,
    farmId,
    shedId,
    setShedId,
    shedName,
    setShedName,
    deviceToken,
    setDeviceToken,
    autoLoaded,
  };
}
