import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Radio, Signal, ShieldCheck } from 'lucide-react';

type Status = 'done' | 'in_progress' | 'planned';

type Item = {
  title: string;
  status: Status;
  detail?: string;
};

type Track = {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  goal: string;
  items: Item[];
};

const TRACKS: Track[] = [
  {
    id: 'lora',
    name: 'LoRa Mesh (>500m coverage)',
    icon: Radio,
    color: 'text-purple-400',
    goal: 'বড় ফার্মে (একাধিক শেড, দূরত্ব >500m) WiFi ছাড়া sensor → gateway communication।',
    items: [
      { title: 'Architecture spec — point-to-multipoint vs mesh', status: 'done', detail: 'SX1276 868MHz star topology চূড়ান্ত (Bangladesh ISM)।' },
      { title: 'LoRa node firmware skeleton (esp32-lora-node.ino)', status: 'in_progress', detail: 'sensor packet → JSON over LoRa → gateway।' },
      { title: 'Gateway forwarder (LoRa → MQTT → cloud)', status: 'planned' },
      { title: 'Hardware BoM ও supplier list (BD-sourced)', status: 'planned' },
      { title: 'Field test report (১০০০m line-of-sight)', status: 'planned' },
    ],
  },
  {
    id: 'dualsim',
    name: 'Dual-SIM Failover',
    icon: Signal,
    color: 'text-blue-400',
    goal: 'Primary GSM SIM fail হলে ৩০ সেকেন্ডের মধ্যে secondary SIM-এ auto-switch।',
    items: [
      { title: 'SIM7600 dual-SIM module evaluation', status: 'done' },
      { title: 'Firmware: signal-strength based SIM swap', status: 'in_progress', detail: 'CSQ <8 অথবা PDP fail → AT+CSIMSEL=2।' },
      { title: 'Cloud: log SIM swap events to device_health', status: 'planned' },
      { title: 'Cost analyzer: per-SIM data usage billing', status: 'planned' },
      { title: 'Field rollout (১০ ফার্ম pilot)', status: 'planned' },
    ],
  },
  {
    id: 'iso',
    name: 'ISO 27001-lite / SOC 2 Track',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    goal: 'Enterprise/export client-দের জন্য third-party verifiable security posture।',
    items: [
      { title: 'Security policy document (public)', status: 'done', detail: '/security পেজে publish করা।' },
      { title: 'Audit logging (180-day retention)', status: 'done' },
      { title: 'RLS isolation testing (RPC + automated)', status: 'done' },
      { title: 'Annual third-party pentest', status: 'in_progress', detail: 'ভেন্ডর শর্টলিস্ট চলছে।' },
      { title: 'Disaster recovery runbook', status: 'planned' },
      { title: 'Vendor risk assessment (Supabase, Twilio)', status: 'planned' },
      { title: 'Incident response playbook', status: 'planned' },
      { title: 'Annual employee security training log', status: 'planned' },
    ],
  },
];

const StatusIcon = ({ s }: { s: Status }) =>
  s === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> :
  s === 'in_progress' ? <Clock className="w-4 h-4 text-amber-400 shrink-0" /> :
  <Circle className="w-4 h-4 text-slate-500 shrink-0" />;

const statusBadge = (s: Status) =>
  s === 'done' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' :
  s === 'in_progress' ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' :
  'border-slate-500/40 text-slate-400 bg-slate-500/10';

const statusLabel = (s: Status) =>
  s === 'done' ? '✓ সম্পন্ন' : s === 'in_progress' ? '◐ চলমান' : 'পরিকল্পিত';

export const PhaseCRoadmapPanel = () => {
  const [openTrack, setOpenTrack] = useState<string | null>('lora');

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-purple-500/20 shadow-xl">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-purple-400" />
          Phase C রোডম্যাপ — LoRa, Dual-SIM, ISO Track
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">
          দীর্ঘমেয়াদী hardware + compliance work-এর প্রগ্রেস ট্র্যাকার
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {TRACKS.map((track) => {
          const total = track.items.length;
          const done = track.items.filter((i) => i.status === 'done').length;
          const inProgress = track.items.filter((i) => i.status === 'in_progress').length;
          const pct = Math.round(((done + inProgress * 0.5) / total) * 100);
          const isOpen = openTrack === track.id;

          return (
            <div key={track.id} className="rounded-lg border border-white/10 bg-slate-800/40 overflow-hidden">
              <button
                onClick={() => setOpenTrack(isOpen ? null : track.id)}
                className="w-full p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <track.icon className={`w-5 h-5 ${track.color}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{track.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{track.goal}</p>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {done}/{total} • {pct}%
                  </Badge>
                </div>
                <Progress value={pct} className="h-1.5" />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                  {track.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2.5 rounded-md bg-slate-900/40"
                    >
                      <StatusIcon s={item.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="text-sm text-white">{item.title}</p>
                          <Badge variant="outline" className={`text-xs ${statusBadge(item.status)}`}>
                            {statusLabel(item.status)}
                          </Badge>
                        </div>
                        {item.detail && (
                          <p className="text-xs text-slate-400 mt-1">{item.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-white/5">
          সর্বশেষ হালনাগাদ: 2026-05 · Nexiot Labs Engineering
        </div>
      </CardContent>
    </Card>
  );
};

export default PhaseCRoadmapPanel;
