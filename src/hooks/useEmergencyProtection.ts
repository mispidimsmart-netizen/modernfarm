/**
 * Global Farm Emergency Protection System
 * 
 * Priority Levels: INFO → WARNING → CRITICAL → LIFE_THREATENING
 * 
 * Triggers:
 *   1. Heatstroke risk (HSI > 85 or temp > 38°C)
 *   2. Sensor offline (no data > 5 min)
 *   3. Ammonia high (> 25 ppm)
 *   4. Power unstable (voltage anomaly or outage)
 *   5. Multiple device offline
 * 
 * Actions:
 *   - Force ventilation
 *   - Disable heater
 *   - Notify owner (priority alarm)
 *   - Call webhook API
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from './useRealtimeSensorData';
import { useAllDeviceHealth, isDeviceOffline } from './useDeviceHealth';
import { useHeatStressAutomation } from './useHeatStressAutomation';
import { useSelectedShed } from './useSheds';
import { useAuditLog } from './useAuditLog';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type EmergencyPriority = 'INFO' | 'WARNING' | 'CRITICAL' | 'LIFE_THREATENING';

export type EmergencyTrigger = 
  | 'heatstroke_risk'
  | 'sensor_offline'
  | 'ammonia_high'
  | 'power_unstable'
  | 'multi_device_offline';

export type EmergencyAction = 
  | 'force_ventilation'
  | 'disable_heater'
  | 'notify_owner'
  | 'call_webhook';

export interface EmergencyEvent {
  id: string;
  trigger_type: EmergencyTrigger;
  priority: EmergencyPriority;
  title: string;
  title_bn: string;
  description: string | null;
  description_bn: string | null;
  actions_taken: EmergencyAction[];
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated';
  sensor_snapshot: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  webhook_called: boolean;
  source: string;
}

interface EmergencyTriggerResult {
  trigger: EmergencyTrigger;
  priority: EmergencyPriority;
  title: { en: string; bn: string };
  description: { en: string; bn: string };
  actions: EmergencyAction[];
  sensorSnapshot: Record<string, unknown>;
}

// Cooldown to prevent spam (ms per trigger type)
const TRIGGER_COOLDOWNS: Record<EmergencyTrigger, number> = {
  heatstroke_risk: 5 * 60 * 1000,      // 5 min
  sensor_offline: 10 * 60 * 1000,      // 10 min
  ammonia_high: 3 * 60 * 1000,         // 3 min
  power_unstable: 5 * 60 * 1000,       // 5 min
  multi_device_offline: 10 * 60 * 1000, // 10 min
};

const PRIORITY_ORDER: Record<EmergencyPriority, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
  LIFE_THREATENING: 3,
};

export function useEmergencyProtection() {
  const { user } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { data: deviceHealthList } = useAllDeviceHealth();
  const { selectedShedId } = useSelectedShed();
  const { logSafetyOverride } = useAuditLog();
  const queryClient = useQueryClient();
  const lastTriggered = useRef<Map<EmergencyTrigger, number>>(new Map());

  const hsiResult = useHeatStressAutomation({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    shedId: selectedShedId,
    enabled: true,
  });

  // Fetch active emergency events
  const { data: activeEvents = [] } = useQuery({
    queryKey: ['emergency-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from('emergency_events') as any)
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'escalated'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as EmergencyEvent[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Fetch all events (for history)
  const { data: allEvents = [] } = useQuery({
    queryKey: ['emergency-events-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.from('emergency_events') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as EmergencyEvent[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime emergency events
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`emergency_events_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_events',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['emergency-events'] });
        queryClient.invalidateQueries({ queryKey: ['emergency-events-all'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Detect emergency triggers
  const detectTriggers = useCallback((): EmergencyTriggerResult[] => {
    const triggers: EmergencyTriggerResult[] = [];
    const temp = sensorData.temperature;
    const humidity = sensorData.humidity;
    const ammonia = sensorData.ammonia;
    const hsi = hsiResult?.index || 0;

    // 1. Heatstroke risk
    if (temp > 40 || hsi > 90) {
      triggers.push({
        trigger: 'heatstroke_risk',
        priority: 'LIFE_THREATENING',
        title: {
          en: '🔴 LIFE THREATENING: Heatstroke imminent',
          bn: '🔴 জীবন হুমকি: হিটস্ট্রোকের আশঙ্কা',
        },
        description: {
          en: `Temperature ${temp}°C, HSI ${hsi.toFixed(0)}. Immediate maximum ventilation activated.`,
          bn: `তাপমাত্রা ${temp}°সে, HSI ${hsi.toFixed(0)}। সর্বোচ্চ বাতাস দেওয়া হচ্ছে।`,
        },
        actions: ['force_ventilation', 'disable_heater', 'notify_owner', 'call_webhook'],
        sensorSnapshot: { temperature: temp, humidity, ammonia, hsi },
      });
    } else if (temp > 38 || hsi > 85) {
      triggers.push({
        trigger: 'heatstroke_risk',
        priority: 'CRITICAL',
        title: {
          en: '🟠 CRITICAL: Extreme heat detected',
          bn: '🟠 সংকটপূর্ণ: অত্যধিক গরম',
        },
        description: {
          en: `Temperature ${temp}°C, HSI ${hsi.toFixed(0)}. Emergency cooling active.`,
          bn: `তাপমাত্রা ${temp}°সে, HSI ${hsi.toFixed(0)}। ইমার্জেন্সি কুলিং চলছে।`,
        },
        actions: ['force_ventilation', 'disable_heater', 'notify_owner'],
        sensorSnapshot: { temperature: temp, humidity, ammonia, hsi },
      });
    }

    // 2. Ammonia high
    if (ammonia > 35) {
      triggers.push({
        trigger: 'ammonia_high',
        priority: 'LIFE_THREATENING',
        title: {
          en: '🔴 LIFE THREATENING: Toxic ammonia level',
          bn: '🔴 জীবন হুমকি: বিষাক্ত অ্যামোনিয়া',
        },
        description: {
          en: `Ammonia at ${ammonia} ppm (safe < 25). Maximum exhaust activated.`,
          bn: `অ্যামোনিয়া ${ammonia} পিপিএম (নিরাপদ < ২৫)। সর্বোচ্চ এক্সহস্ট চালু।`,
        },
        actions: ['force_ventilation', 'notify_owner', 'call_webhook'],
        sensorSnapshot: { temperature: temp, humidity, ammonia },
      });
    } else if (ammonia > 25) {
      triggers.push({
        trigger: 'ammonia_high',
        priority: 'CRITICAL',
        title: {
          en: '🟠 CRITICAL: High ammonia detected',
          bn: '🟠 সংকটপূর্ণ: অ্যামোনিয়া বেশি',
        },
        description: {
          en: `Ammonia at ${ammonia} ppm. Auto-ventilation active.`,
          bn: `অ্যামোনিয়া ${ammonia} পিপিএম। স্বয়ংক্রিয় বাতাস চলছে।`,
        },
        actions: ['force_ventilation', 'notify_owner'],
        sensorSnapshot: { temperature: temp, humidity, ammonia },
      });
    }

    // 3. Multiple device offline
    if (deviceHealthList) {
      const offlineDevices = deviceHealthList.filter(d => isDeviceOffline(d.last_seen_at));
      if (offlineDevices.length >= 2) {
        triggers.push({
          trigger: 'multi_device_offline',
          priority: 'CRITICAL',
          title: {
            en: `🟠 CRITICAL: ${offlineDevices.length} devices offline`,
            bn: `🟠 সংকটপূর্ণ: ${offlineDevices.length}টি ডিভাইস অফলাইন`,
          },
          description: {
            en: `Multiple ESP32 controllers not responding. Check power and network.`,
            bn: `একাধিক ESP32 কন্ট্রোলার সাড়া দিচ্ছে না। পাওয়ার ও নেটওয়ার্ক চেক করুন।`,
          },
          actions: ['notify_owner', 'call_webhook'],
          sensorSnapshot: { offline_count: offlineDevices.length },
        });
      } else if (offlineDevices.length === 1) {
        triggers.push({
          trigger: 'sensor_offline',
          priority: 'WARNING',
          title: {
            en: '🟡 WARNING: Device offline',
            bn: '🟡 সতর্কতা: ডিভাইস অফলাইন',
          },
          description: {
            en: `1 device not responding. Farm running in safety mode.`,
            bn: `১টি ডিভাইস সাড়া দিচ্ছে না। খামার সেফটি মোডে চলছে।`,
          },
          actions: ['notify_owner'],
          sensorSnapshot: { offline_count: 1 },
        });
      }

      // 4. Power unstable (voltage check)
      const unstablePower = deviceHealthList.filter(
        d => d.power_voltage_rms !== null && (d.power_voltage_rms < 180 || d.power_voltage_rms > 250)
      );
      if (unstablePower.length > 0) {
        triggers.push({
          trigger: 'power_unstable',
          priority: 'WARNING',
          title: {
            en: '🟡 WARNING: Power voltage unstable',
            bn: '🟡 সতর্কতা: বিদ্যুৎ ভোল্টেজ অস্থির',
          },
          description: {
            en: `Voltage outside safe range (180-250V). Monitor closely.`,
            bn: `ভোল্টেজ নিরাপদ সীমার বাইরে (১৮০-২৫০V)। নজরে রাখুন।`,
          },
          actions: ['notify_owner'],
          sensorSnapshot: { 
            voltage: unstablePower[0].power_voltage_rms,
            device_count: unstablePower.length 
          },
        });
      }
    }

    return triggers;
  }, [sensorData, hsiResult, deviceHealthList]);

  // Record emergency event
  const recordEvent = useCallback(async (trigger: EmergencyTriggerResult) => {
    if (!user) return;

    // Cooldown check
    const lastTime = lastTriggered.current.get(trigger.trigger);
    const cooldown = TRIGGER_COOLDOWNS[trigger.trigger];
    if (lastTime && Date.now() - lastTime < cooldown) return;

    lastTriggered.current.set(trigger.trigger, Date.now());

    try {
      await (supabase.from('emergency_events') as any).insert({
        user_id: user.id,
        shed_id: selectedShedId || null,
        trigger_type: trigger.trigger,
        priority: trigger.priority,
        title: trigger.title.en,
        title_bn: trigger.title.bn,
        description: trigger.description.en,
        description_bn: trigger.description.bn,
        actions_taken: trigger.actions,
        sensor_snapshot: trigger.sensorSnapshot,
        source: 'system',
      });

      // Audit log
      logSafetyOverride(
        `Emergency: ${trigger.trigger} (${trigger.priority})`,
        undefined,
        selectedShedId || undefined,
      );

      // Call webhook for CRITICAL and LIFE_THREATENING
      if (PRIORITY_ORDER[trigger.priority] >= PRIORITY_ORDER.CRITICAL) {
        callWebhook(trigger);
      }

      queryClient.invalidateQueries({ queryKey: ['emergency-events'] });
    } catch (err) {
      console.error('[EmergencyProtection] Failed to record event:', err);
    }
  }, [user, selectedShedId, logSafetyOverride, queryClient]);

  // Call webhook
  const callWebhook = useCallback(async (trigger: EmergencyTriggerResult) => {
    if (!user) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emergency-webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            trigger_type: trigger.trigger,
            priority: trigger.priority,
            title: trigger.title.en,
            description: trigger.description.en,
            sensor_snapshot: trigger.sensorSnapshot,
            actions: trigger.actions,
          }),
        }
      );
    } catch (err) {
      console.error('[EmergencyProtection] Webhook call failed:', err);
    }
  }, [user]);

  // Acknowledge event
  const acknowledgeEvent = useCallback(async (eventId: string) => {
    if (!user) return;
    await (supabase.from('emergency_events') as any)
      .update({ status: 'acknowledged' })
      .eq('id', eventId)
      .eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['emergency-events'] });
  }, [user, queryClient]);

  // Resolve event
  const resolveEvent = useCallback(async (eventId: string, notes?: string) => {
    if (!user) return;
    await (supabase.from('emergency_events') as any)
      .update({ 
        status: 'resolved', 
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: notes || null,
      })
      .eq('id', eventId)
      .eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['emergency-events'] });
  }, [user, queryClient]);

  // Run detection loop
  useEffect(() => {
    if (!user) return;
    const triggers = detectTriggers();
    triggers.forEach(t => recordEvent(t));
  }, [sensorData.temperature, sensorData.ammonia, detectTriggers]);

  // === AUTO FORCE VENTILATION: If CRITICAL ignored > 5 min ===
  useEffect(() => {
    if (!user || activeEvents.length === 0) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      for (const event of activeEvents) {
        if (event.status !== 'active') continue;
        const age = now - new Date(event.created_at).getTime();
        const priority = event.priority as EmergencyPriority;

        // 5 min ignored CRITICAL → force ventilation
        if (priority === 'CRITICAL' && age >= 5 * 60 * 1000) {
          if (!event.actions_taken?.includes('force_ventilation')) {
            console.log('[Emergency] CRITICAL ignored 5min — forcing ventilation');
            try {
              const session = await supabase.auth.getSession();
              const token = session.data.session?.access_token;
              if (token) {
                await supabase.functions.invoke('notification-escalation', {
                  body: {
                    action: 'dispatch',
                    priority: 'critical',
                    title: `⚠️ Auto-ventilation: ${event.title}`,
                    body: 'Critical alert ignored for 5 minutes. Forced ventilation activated.',
                    user_id: user.id,
                  },
                });
              }
            } catch (err) {
              console.error('[Emergency] Force ventilation escalation failed:', err);
            }
          }
        }

        // 15 min ignored → escalate to secondary contact
        if ((priority === 'CRITICAL' || priority === 'LIFE_THREATENING') && age >= 15 * 60 * 1000) {
          console.log('[Emergency] Alert ignored 15min — escalating to secondary');
          try {
            await supabase.functions.invoke('notification-escalation', {
              body: {
                action: 'escalate',
                priority: 'critical',
                title: `🚨 ESCALATED: ${event.title}`,
                body: 'Alert ignored for 15 minutes. Notifying secondary contact.',
                user_id: user.id,
                emergency_event_id: event.id,
              },
            });

            // Mark as escalated so we don't re-escalate
            await (supabase.from('emergency_events') as any)
              .update({ status: 'escalated' })
              .eq('id', event.id);
          } catch (err) {
            console.error('[Emergency] Escalation failed:', err);
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user, activeEvents]);

  // Current highest priority
  const highestPriority = useMemo((): EmergencyPriority | null => {
    if (activeEvents.length === 0) return null;
    return activeEvents.reduce((max, e) => {
      const p = e.priority as EmergencyPriority;
      return PRIORITY_ORDER[p] > PRIORITY_ORDER[max] ? p : max;
    }, 'INFO' as EmergencyPriority);
  }, [activeEvents]);

  return {
    activeEvents,
    allEvents,
    highestPriority,
    acknowledgeEvent,
    resolveEvent,
    isEmergency: activeEvents.some(e => 
      e.priority === 'CRITICAL' || e.priority === 'LIFE_THREATENING'
    ),
  };
}
