import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle2,
  Cpu,
  Shield,
  Zap,
  Activity,
  Wind,
  Globe,
  AlertTriangle,
  Layers,
  ChevronDown,
} from 'lucide-react';

/**
 * Single source of truth for "what's live in v9 automation" — shown at the top
 * of Installation Guide, App Documentation, Audit Report and Architecture pages.
 * Update this one file when phases ship; all admin tabs stay in sync.
 */

type PhaseRow = {
  phase: string;
  title: string;
  status: 'live' | 'beta' | 'planned';
  highlights: string[];
};

const PHASES: PhaseRow[] = [
  {
    phase: 'Phase 1-2',
    title: 'কোর সেন্সিং ও কন্ট্রোল',
    status: 'live',
    highlights: [
      'DHT22 + LDR + MQ-135 (legacy fallback)',
      '8-channel রিলে কন্ট্রোল (Fan/Heater/Light/Pump/Fogger/Curtain)',
      'Manual override (20 মিনিট auto-timeout)',
    ],
  },
  {
    phase: 'Phase 3',
    title: 'Hardware-as-Source-of-Truth',
    status: 'live',
    highlights: [
      'ESP32-WROOM-32 38-pin DevKit V1 (WROVER ❌)',
      '8 hardcoded safety invariants on-device',
      'Cloud শুধু `desired_*` লেখে — actual state ESP32 থেকে',
    ],
  },
  {
    phase: 'Phase 4',
    title: 'Emergency Survival Mode (ESM)',
    status: 'live',
    highlights: [
      '>38°C → সব Fan ON force, Heater OFF lock',
      'Sensor failure → safe-default (ventilation ON)',
      'Network down → local autonomous decisions',
    ],
  },
  {
    phase: 'Phase 5',
    title: 'Multi-Farm + RLS',
    status: 'live',
    highlights: [
      'প্রতিটি query farm_id-filtered',
      'user_roles সেপারেট টেবিল (privilege-escalation safe)',
      'Tenant isolation audit tab',
    ],
  },
  {
    phase: 'Phase 6',
    title: 'AI Anomaly + Forecast',
    status: 'live',
    highlights: [
      'Lovable AI Gateway (Gemini 2.5 Flash)',
      'Water trend, ammonia trend, heat-risk prediction',
      'Anomaly detection daily cron',
    ],
  },
  {
    phase: 'Phase 7',
    title: 'OTA + MQTT + GSM Failover',
    status: 'live',
    highlights: [
      'Signed firmware OTA (staged rollout)',
      'MQTT realtime + REST fallback',
      'GSM SMS relay (network outage alerts)',
    ],
  },
  {
    phase: 'Phase 8',
    title: 'Observability + Performance',
    status: 'live',
    highlights: [
      'Edge function metrics + latency tracking',
      'Forensic timeline (event reconstruction)',
      'Realtime device health dashboard',
    ],
  },
  {
    phase: 'Phase 9',
    title: 'Premium Air Quality Sensors',
    status: 'live',
    highlights: [
      'SHT31 (precise T/H), BH1750 (lux)',
      'ZE03-NH3 (true ammonia ppm)',
      'SCD41 (CO₂), PMS5003 (PM2.5/PM10)',
      'Auto-detect — পুরাতন ESP32 backward compatible',
    ],
  },
  {
    phase: 'Phase 10',
    title: 'Anonymized Farm Benchmarking',
    status: 'live',
    highlights: [
      '/benchmark — KPI vs নেটওয়ার্ক মিডিয়ান',
      'অ্যানোনিমাস leaderboard (নাম/মালিক প্রকাশ নয়)',
      'HSI percentile rank',
    ],
  },
];

const INVARIANTS = [
  '1. Temp > 38°C → Fan ON forced (Heater OFF locked)',
  '2. Temp < 18°C (broiler age-aware) → Heater ON allowed',
  '3. NH₃ > 25 ppm → Exhaust Fan ON forced',
  '4. Manual override → 20 min hard auto-revert',
  '5. Sensor read failure → safe-default ventilation',
  '6. Cloud write conflict → ESP32 local state wins',
  '7. Network outage > 60s → local autonomous mode',
  '8. Heater + closed curtains → interlock blocks heater',
];

export function CurrentAutomationStatusBanner() {
  const liveCount = PHASES.filter((p) => p.status === 'live').length;

  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Activity className="h-5 w-5 text-primary" />
          বর্তমান অটোমেশন স্ট্যাটাস
          <Badge variant="default" className="bg-primary">v10 Live</Badge>
          <Badge variant="outline" className="border-emerald-500 text-emerald-600">
            {liveCount}/{PHASES.length} Phases Active
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          এই পেজের তথ্য নিচের সকল live phases এর সাথে align করা। এক জায়গায় আপডেট
          → সব admin tab-এ propagate। (Source: <code className="text-[10px]">CurrentAutomationStatusBanner.tsx</code>)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PHASES.map((p) => (
            <div
              key={p.phase}
              className="border rounded-lg p-3 bg-card/50 hover:bg-card transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      p.status === 'live'
                        ? 'text-emerald-600'
                        : p.status === 'beta'
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
                    }`}
                  />
                  <div className="font-semibold text-sm truncate">{p.title}</div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {p.phase}
                </Badge>
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 ml-6">
                {p.highlights.map((h, i) => (
                  <li key={i} className="list-disc list-outside">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 8 Invariants — most safety-critical */}
        <div className="border-2 border-destructive/30 rounded-lg p-3 bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-sm">৮টি Hardware Safety Invariants</span>
            <Badge variant="destructive" className="text-[10px]">
              ESP32 enforced
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            এগুলো ESP32-এর firmware-এ hardcoded — Cloud কখনোই override করতে পারবে না।
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
            {INVARIANTS.map((inv) => (
              <div key={inv} className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                <span>{inv}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture quick reference */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Stat icon={<Cpu className="h-3 w-3" />} label="Board" value="ESP32-WROOM-32 (38-pin)" />
          <Stat icon={<Zap className="h-3 w-3" />} label="Relays" value="8-channel" />
          <Stat icon={<Wind className="h-3 w-3" />} label="Sensors" value="DHT22/SHT31/BH1750/ZE03/SCD41/PMS5003" />
          <Stat icon={<Layers className="h-3 w-3" />} label="Tables" value="sensor_readings (active), sensor_logs (legacy)" />
          <Stat icon={<Shield className="h-3 w-3" />} label="Auth" value="RLS + user_roles separate table" />
          <Stat icon={<Activity className="h-3 w-3" />} label="Realtime" value="Supabase Realtime + MQTT" />
          <Stat icon={<Globe className="h-3 w-3" />} label="OTA" value="Signed firmware, staged rollout" />
          <Stat icon={<CheckCircle2 className="h-3 w-3" />} label="Failover" value="GSM SMS + local autonomous mode" />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border rounded-md p-2 bg-card/50">
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-medium text-[11px] leading-tight">{value}</div>
    </div>
  );
}
