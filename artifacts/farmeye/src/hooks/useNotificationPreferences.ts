import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type DigestMode = 'instant' | 'hourly' | 'daily';

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  farm_id: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  critical_bypass_quiet_hours: boolean;
  snooze_until: string | null;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  severity_min_for_push: SeverityLevel;
  severity_min_for_sms: SeverityLevel;
  severity_min_for_whatsapp: SeverityLevel;
  digest_mode: DigestMode;
}

const defaults = (user_id: string, farm_id: string | null): NotificationPreferences => ({
  user_id,
  farm_id,
  quiet_hours_start: null,
  quiet_hours_end: null,
  critical_bypass_quiet_hours: true,
  snooze_until: null,
  sound_enabled: true,
  vibration_enabled: true,
  severity_min_for_push: 'low',
  severity_min_for_sms: 'high',
  severity_min_for_whatsapp: 'high',
  digest_mode: 'instant',
});

export function useNotificationPreferences(farmId?: string | null) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const q = supabase
      .from('notification_preferences' as any)
      .select('*')
      .eq('user_id', user.id);
    const { data } = farmId
      ? await q.eq('farm_id', farmId).maybeSingle()
      : await q.is('farm_id', null).maybeSingle();
    setPrefs((data as any) ?? defaults(user.id, farmId ?? null));
    setLoading(false);
  }, [user, farmId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (patch: Partial<NotificationPreferences>) => {
    if (!user || !prefs) return;
    setSaving(true);
    const next = { ...prefs, ...patch, user_id: user.id, farm_id: farmId ?? null };
    const { data, error } = await supabase
      .from('notification_preferences' as any)
      .upsert(next, { onConflict: 'user_id,farm_id' })
      .select()
      .single();
    if (!error && data) setPrefs(data as any);
    setSaving(false);
    return { error };
  }, [user, prefs, farmId]);

  const snooze = useCallback(async (minutes: number) => {
    const { data, error } = await supabase.rpc('snooze_notifications' as any, {
      _minutes: minutes,
      _farm_id: farmId ?? null,
    });
    if (!error) await load();
    return { data, error };
  }, [farmId, load]);

  const isSnoozed = !!prefs?.snooze_until && new Date(prefs.snooze_until) > new Date();

  return { prefs, loading, saving, save, snooze, isSnoozed, reload: load };
}
