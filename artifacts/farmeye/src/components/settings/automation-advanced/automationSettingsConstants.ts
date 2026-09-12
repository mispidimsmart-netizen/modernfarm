import type {
  useRawAdvancedAutomationSettings,
  useUpdateAdvancedAutomationSettings,
} from '@/hooks/useAdvancedAutomation';

export type AdvSettings = NonNullable<ReturnType<typeof useRawAdvancedAutomationSettings>['data']>;
export type AdvUpdateMutation = ReturnType<typeof useUpdateAdvancedAutomationSettings>;
export type AdvUpdatePayload = Parameters<AdvUpdateMutation['mutate']>[0];

/** Critical (dangerous) settings that need double confirmation */
export const CRITICAL_SETTINGS = ['min_vent', 'heater'];

/** Explanation text for each module */
export const MODULE_EXPLANATIONS: Record<string, { bn: string; en: string }> = {
  min_vent: {
    bn: 'অক্সিজেনের জন্য সবসময় কিছু বাতাস প্রয়োজন — এটি বন্ধ করলে গ্যাস জমে শ্বাসকষ্ট হতে পারে',
    en: 'Fresh air is always needed for oxygen — disabling can cause gas buildup and respiratory issues',
  },
  heater: {
    bn: 'বাচ্চা মুরগির জন্য হিটার অত্যন্ত গুরুত্বপূর্ণ — ঠান্ডায় মৃত্যু হতে পারে',
    en: 'Heater is critical for chicks — cold can be fatal',
  },
  fogger: {
    bn: 'অতিরিক্ত গরমে তাপমাত্রা কমায় — খামারে ফগার থাকলে চালু করুন',
    en: 'Reduces temperature during extreme heat — enable if fogger is installed',
  },
  airflow: {
    bn: 'বয়স অনুযায়ী বাতাস চলাচল নিয়ন্ত্রণ করে — বাচ্চাদের জন্য কম, বড়দের জন্য বেশি',
    en: 'Controls ventilation by age — less for chicks, more for adults',
  },
  curtain: {
    bn: 'বাইরের তাপমাত্রা অনুযায়ী পর্দা খোলা/বন্ধের পরামর্শ দেয়',
    en: 'Suggests curtain open/close based on outside temperature',
  },
  water: {
    bn: 'পানির ব্যবহার হঠাৎ কমে গেলে স্বাস্থ্য সমস্যার ইঙ্গিত হতে পারে',
    en: 'Sudden drop in water usage can indicate health problems',
  },
};

/** Safe defaults restored by the "Reset to Safe Defaults" button */
export const SAFE_AUTOMATION_DEFAULTS = {
  min_vent_enabled: true,
  min_vent_temp_threshold: 26,
  min_vent_cycle_seconds: 40,
  min_vent_interval_minutes: 5,
  min_vent_ceiling_fan_always_on: true,
  heater_enabled: true,
  heater_on_temp: 20,
  heater_off_temp: 24,
  heater_tolerance: 0.7,
  fogger_enabled: false,
  fogger_start_temp: 32,
  fogger_start_humidity_max: 85,
  fogger_on_seconds: 40,
  fogger_pause_seconds: 120,
  fogger_stop_temp: 30,
  fogger_stop_humidity: 90,
  airflow_enabled: true,
  curtain_advisory_enabled: true,
  water_drop_threshold_percent: 30,
  water_night_spike_enabled: true,
  water_zero_flow_alert: true,
};
