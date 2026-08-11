import type { ReactNode } from 'react';
import { Wind, Thermometer, Droplets, Fan, AlertTriangle, Gauge } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { NumberSetting, SwitchSetting } from './AutomationSettingFields';
import type { AdvSettings, AdvUpdatePayload } from './automationSettingsConstants';

export interface AutomationSection {
  id: string;
  icon: typeof Wind;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  isCritical: boolean;
  enabled: boolean;
  onToggle?: (v: boolean) => void;
  hidden?: boolean;
  content: ReactNode;
}

interface BuildArgs {
  language: string;
  settings?: AdvSettings;
  isLayer: boolean;
  isBroiler: boolean;
  update: (patch: AdvUpdatePayload) => void;
}

const BROILER_TEMP_CURVE = [
  ['Day 1-3', '33°C'],
  ['Day 4-7', '31°C'],
  ['Day 8-14', '29°C'],
  ['Day 15-21', '26°C'],
  ['Day 22-28', '24°C'],
  ['Day 29+', '22°C'],
];

export function buildAutomationSections({
  language,
  settings,
  isLayer,
  isBroiler,
  update,
}: BuildArgs): AutomationSection[] {
  const bn = language === 'bn';
  const sec = bn ? 'সেকেন্ড' : 'sec';

  return [
    {
      id: 'min_vent',
      icon: Wind,
      title: bn ? 'মিনিমাম ভেন্টিলেশন' : 'Minimum Ventilation',
      description: bn ? 'শীতে গ্যাস জমা প্রতিরোধ' : 'Prevent gas accumulation in winter',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      isCritical: true,
      enabled: settings?.min_vent_enabled ?? true,
      onToggle: (v) => update({ min_vent_enabled: v }),
      content: (
        <div className="space-y-4 pt-2">
          <NumberSetting
            label={bn ? 'তাপমাত্রা থ্রেশহোল্ড' : 'Temperature Threshold'}
            value={settings?.min_vent_temp_threshold ?? 26}
            unit="°C"
            onChange={(v) => update({ min_vent_temp_threshold: v })}
          />
          <NumberSetting
            label={bn ? 'সাইকেল সময়' : 'Cycle Duration'}
            value={settings?.min_vent_cycle_seconds ?? 40}
            unit={sec}
            onChange={(v) => update({ min_vent_cycle_seconds: v })}
          />
          <NumberSetting
            label={bn ? 'ইন্টারভাল' : 'Interval'}
            value={settings?.min_vent_interval_minutes ?? 5}
            unit={bn ? 'মিনিট' : 'min'}
            onChange={(v) => update({ min_vent_interval_minutes: v })}
          />
          <SwitchSetting
            label={bn ? 'সিলিং ফ্যান সবসময় চালু' : 'Ceiling Fan Always On'}
            checked={settings?.min_vent_ceiling_fan_always_on ?? true}
            onChange={(v) => update({ min_vent_ceiling_fan_always_on: v })}
          />
        </div>
      ),
    },
    {
      id: 'heater',
      icon: Thermometer,
      title: bn ? 'হিটার কন্ট্রোল' : 'Heater Control',
      description: isBroiler
        ? bn
          ? 'বয়স-ভিত্তিক তাপমাত্রা কার্ভ'
          : 'Age-based temperature curve'
        : bn
          ? 'থ্রেশহোল্ড-ভিত্তিক নিয়ন্ত্রণ'
          : 'Threshold-based control',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      isCritical: true,
      enabled: settings?.heater_enabled ?? true,
      onToggle: (v) => update({ heater_enabled: v }),
      content: isLayer ? (
        <div className="space-y-4 pt-2">
          <NumberSetting
            label={bn ? 'হিটার চালু হবে' : 'Heater ON temp'}
            value={settings?.heater_on_temp ?? 20}
            unit="°C"
            onChange={(v) => update({ heater_on_temp: v })}
          />
          <NumberSetting
            label={bn ? 'হিটার বন্ধ হবে' : 'Heater OFF temp'}
            value={settings?.heater_off_temp ?? 24}
            unit="°C"
            onChange={(v) => update({ heater_off_temp: v })}
          />
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {bn
              ? 'ব্রয়লারের জন্য বয়স অনুযায়ী তাপমাত্রা নিয়ন্ত্রিত হয়:'
              : 'For broilers, temperature is controlled by age:'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {BROILER_TEMP_CURVE.map(([day, temp]) => (
              <div key={day} className="bg-muted/50 rounded-lg p-2">
                <span className="font-medium">{day}:</span> {temp}
              </div>
            ))}
          </div>
          <div className="pt-2">
            <NumberSetting
              label={bn ? 'টলারেন্স' : 'Tolerance'}
              value={settings?.heater_tolerance ?? 0.7}
              unit="°C"
              step="0.1"
              onChange={(v) => update({ heater_tolerance: v })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'fogger',
      icon: Droplets,
      title: bn ? 'ফগার কুলিং' : 'Fogger Cooling',
      description: bn ? 'বুদ্ধিমান কুলিং সিস্টেম' : 'Intelligent cooling system',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      isCritical: false,
      enabled: settings?.fogger_enabled ?? false,
      onToggle: (v) => update({ fogger_enabled: v }),
      content: (
        <div className="space-y-4 pt-2">
          <NumberSetting
            label={bn ? 'শুরুর তাপমাত্রা' : 'Start Temperature'}
            value={settings?.fogger_start_temp ?? 32}
            unit="°C"
            onChange={(v) => update({ fogger_start_temp: v })}
          />
          <NumberSetting
            label={bn ? 'সর্বোচ্চ আর্দ্রতা' : 'Max Humidity to Start'}
            value={settings?.fogger_start_humidity_max ?? 85}
            unit="%"
            onChange={(v) => update({ fogger_start_humidity_max: v })}
          />
          <NumberSetting
            label={bn ? 'স্প্রে সময়' : 'Spray Duration'}
            value={settings?.fogger_on_seconds ?? 40}
            unit={sec}
            onChange={(v) => update({ fogger_on_seconds: v })}
          />
          <NumberSetting
            label={bn ? 'বিরতি সময়' : 'Pause Duration'}
            value={settings?.fogger_pause_seconds ?? 120}
            unit={sec}
            onChange={(v) => update({ fogger_pause_seconds: v })}
          />
          <Separator />
          <NumberSetting
            label={bn ? 'বন্ধ হওয়ার তাপমাত্রা' : 'Stop Temperature'}
            value={settings?.fogger_stop_temp ?? 30}
            unit="°C"
            onChange={(v) => update({ fogger_stop_temp: v })}
          />
          <NumberSetting
            label={bn ? 'বন্ধ হওয়ার আর্দ্রতা' : 'Stop Humidity'}
            value={settings?.fogger_stop_humidity ?? 90}
            unit="%"
            onChange={(v) => update({ fogger_stop_humidity: v })}
          />
        </div>
      ),
    },
    {
      id: 'airflow',
      icon: Fan,
      title: bn ? 'ব্রয়লার এয়ারফ্লো' : 'Broiler Airflow',
      description: bn ? 'বয়স-ভিত্তিক সার্কুলেশন' : 'Age-based circulation control',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      isCritical: false,
      enabled: settings?.airflow_enabled ?? true,
      onToggle: (v) => update({ airflow_enabled: v }),
      hidden: isLayer,
      content: (
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {bn ? 'বয়স অনুযায়ী সার্কুলেশন ফ্যান নিয়ন্ত্রণ:' : 'Circulation fan control by age:'}
          </p>
          <div className="space-y-2 text-sm">
            {[
              ['< 10 days', bn ? 'বন্ধ' : 'OFF'],
              ['10-20 days', '30s ON / 3min interval'],
              ['21+ days (day)', bn ? 'সবসময় চালু' : 'Always ON'],
              ['21+ days (night)', '1min ON / 5min interval'],
            ].map(([range, value]) => (
              <div key={range} className="flex justify-between bg-muted/50 rounded-lg p-2">
                <span>{range}</span>
                <span className="text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'curtain',
      icon: AlertTriangle,
      title: bn ? 'কার্টেন পরামর্শ' : 'Curtain Advisory',
      description: bn ? 'AI-ভিত্তিক পরামর্শ' : 'AI-based recommendations',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      isCritical: false,
      enabled: settings?.curtain_advisory_enabled ?? true,
      onToggle: (v) => update({ curtain_advisory_enabled: v }),
      content: (
        <div className="space-y-4 pt-2">
          <NumberSetting
            label={bn ? 'তাপমাত্রা পার্থক্য' : 'Temp Difference'}
            value={settings?.curtain_open_temp_diff ?? 3}
            unit="°C"
            onChange={(v) => update({ curtain_open_temp_diff: v })}
          />
          <SwitchSetting
            label={bn ? 'ঠান্ডায় বন্ধ করার পরামর্শ' : 'Close on Cold'}
            checked={settings?.curtain_close_on_cold ?? true}
            onChange={(v) => update({ curtain_close_on_cold: v })}
          />
        </div>
      ),
    },
    {
      id: 'water',
      icon: Gauge,
      title: bn ? 'পানি বিশ্লেষণ' : 'Water Analytics',
      description: bn ? 'স্বাস্থ্য মনিটরিং' : 'Health monitoring',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isCritical: false,
      enabled: true,
      content: (
        <div className="space-y-4 pt-2">
          <NumberSetting
            label={bn ? 'ড্রপ থ্রেশহোল্ড' : 'Drop Threshold'}
            value={settings?.water_drop_threshold_percent ?? 30}
            unit="%"
            onChange={(v) => update({ water_drop_threshold_percent: v })}
          />
          <SwitchSetting
            label={bn ? 'রাতে স্পাইক সতর্কতা' : 'Night Spike Alert'}
            checked={settings?.water_night_spike_enabled ?? true}
            onChange={(v) => update({ water_night_spike_enabled: v })}
          />
          <SwitchSetting
            label={bn ? 'শূন্য প্রবাহ সতর্কতা' : 'Zero Flow Alert'}
            checked={settings?.water_zero_flow_alert ?? true}
            onChange={(v) => update({ water_zero_flow_alert: v })}
          />
        </div>
      ),
    },
  ];
}
