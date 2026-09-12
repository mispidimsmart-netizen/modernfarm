import { Cable, Zap, Settings, CheckCircle2, ShoppingCart, Check, AlertTriangle, Info, Lightbulb, Droplets, Power, Bird, Egg, Fan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import relayAcWiringDiagram from '@/assets/relay-ac-wiring-diagram.png';

/**
 * BuzzerWiringSection — extracted from InstallationWiringTab for readability.
 * Pure presentational: renders the wiring guide for one sensor's `buzzerWiringInfo`.
 */
export function BuzzerWiringSection({ info }: { info: any }) {
  return (
        <div className="mt-6 space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border-2 border-orange-500/30">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-bold text-sm text-orange-600 dark:text-orange-400">{info.title}</p>
              <p className="text-xs text-muted-foreground">রিলে দিয়ে নিরাপদে বাজার কন্ট্রোল করুন</p>
            </div>
          </div>

          {/* Why Relay Section */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {info.whyRelay.title}
            </p>
            <ul className="space-y-1">
              {info.whyRelay.points.map((point: string, pIdx: number) => (
                <li key={pIdx} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual Wiring Diagram */}
          <div className="rounded-lg border-2 border-orange-500/30 overflow-hidden bg-background">
            <div className="bg-orange-500/10 p-2 border-b border-orange-500/30">
              <p className="text-xs font-bold text-center">📊 বাজার ওয়্যারিং ডায়াগ্রাম</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900">
              <div className="flex flex-col items-center gap-4">

                {/* Power Supply */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border-2 border-red-500/30">
                  <Zap className="h-5 w-5 text-red-500" />
                  <div className="text-center">
                    <span className="text-sm font-bold">12V/24V DC পাওয়ার সাপ্লাই</span>
                    <p className="text-xs text-muted-foreground">(বাজারের রেটিং অনুযায়ী)</p>
                  </div>
                </div>

                {/* Power wires going down */}
                <div className="flex items-center gap-12">
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-10 bg-red-500 rounded"></div>
                    <span className="text-xs text-red-500 font-bold">+ (পজিটিভ)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-10 bg-gray-600 rounded"></div>
                    <span className="text-xs text-gray-500 font-bold">- (নেগেটিভ/GND)</span>
                  </div>
                </div>

                {/* Relay Module Section */}
                <div className="w-full max-w-sm">
                  <div className="bg-blue-600 rounded-t-lg p-2 text-center">
                    <span className="text-white text-xs font-bold">রিলে IN3 (GPIO 33 দ্বারা নিয়ন্ত্রিত)</span>
                  </div>

                  {/* Relay Terminals */}
                  <div className="bg-gradient-to-b from-blue-500 to-blue-600 p-3 rounded-b-lg">
                    <div className="grid grid-cols-3 gap-2">
                      {/* NC Terminal */}
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-400 rounded border-2 border-gray-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">NC</span>
                          </div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">✕</span>
                          </div>
                        </div>
                        <span className="text-xs text-white mt-1">খালি</span>
                      </div>

                      {/* COM Terminal */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-orange-500 rounded border-2 border-orange-600 flex items-center justify-center ring-2 ring-yellow-400">
                          <span className="text-xs font-bold text-white">COM</span>
                        </div>
                        <span className="text-xs text-white mt-1 font-bold">বাজার +</span>
                        <span className="text-[10px] text-green-200">← এখানে</span>
                      </div>

                      {/* NO Terminal */}
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                        <div className="w-10 h-10 bg-green-500 rounded border-2 border-green-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">NO</span>
                        </div>
                        <span className="text-xs text-white mt-1">পাওয়ার +</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wire from COM to Buzzer */}
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">COM থেকে</span>
                    <div className="w-1 h-8 bg-orange-500 rounded"></div>
                  </div>
                </div>

                {/* Buzzer */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border-2 border-orange-500/50">
                  <div className="w-14 h-14 bg-orange-500/30 rounded-full flex items-center justify-center border-2 border-orange-500">
                    <span className="text-2xl">🔔</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold">SFM-27 বাজার</span>
                    <p className="text-xs text-muted-foreground">DC 3-24V, ~100mA</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">+ লাল তার</Badge>
                      <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-300">- কালো তার</Badge>
                    </div>
                  </div>
                </div>

                {/* GND connection */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1 h-6 bg-gray-600 rounded"></div>
                  <span>বাজারের - (কালো) → পাওয়ার সাপ্লাই GND</span>
                </div>
              </div>

              {/* Wire Legend */}
              <div className="mt-4 p-3 rounded-lg bg-background border">
                <p className="text-xs font-bold mb-2">🔌 তারের রঙ:</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-2 bg-red-500 rounded"></div>
                    <span className="text-xs">লাল = পাওয়ার + / বাজার +</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-2 bg-gray-600 rounded"></div>
                    <span className="text-xs">কালো = GND / বাজার -</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-2 bg-purple-500 rounded"></div>
                    <span className="text-xs">বেগুনি = GPIO 33 → IN3</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Flow */}
            <div className="bg-muted/30 p-3 border-t">
              <div className="flex items-center justify-center gap-2 text-sm font-mono flex-wrap">
                <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">পাওয়ার +</span>
                <span>→</span>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">NO</span>
                <span className="text-muted-foreground">⟷</span>
                <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">COM</span>
                <span>→</span>
                <span className="bg-orange-400 text-white px-2 py-1 rounded text-xs">বাজার +</span>
                <span>→</span>
                <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">GND</span>
              </div>
            </div>
          </div>

          {/* Step by Step Connection */}
          <div className="space-y-2">
            <p className="text-sm font-bold">🔧 ধাপে ধাপে কানেকশন:</p>
            <div className="space-y-2">
              {info.connectionSteps.map((step: { step: number; title: string; desc: string; color: string }, sIdx: number) => (
                <div key={sIdx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                    step.color === 'purple' ? 'bg-purple-500' :
                    step.color === 'red' ? 'bg-red-500' :
                    step.color === 'black' ? 'bg-gray-700' : 'bg-primary'
                  } text-white text-xs font-bold shrink-0`}>
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{step.title}</span>
                    <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it Works */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                🔴 {info.workingLogic.offState.title}
              </p>
              <p className="text-xs text-muted-foreground">{info.workingLogic.offState.desc}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
              <p className="text-sm font-bold text-green-700 dark:text-green-300 mb-1">
                🟢 {info.workingLogic.onState.title}
              </p>
              <p className="text-xs text-muted-foreground">{info.workingLogic.onState.desc}</p>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              🔍 সমস্যা সমাধান:
            </p>
            <div className="space-y-2">
              {info.troubleshooting.map((item: { problem: string; solutions: string[] }, tIdx: number) => (
                <div key={tIdx} className="p-3 rounded-lg bg-muted/30 border">
                  <p className="text-sm font-medium text-destructive mb-1">❌ {item.problem}</p>
                  <ul className="space-y-0.5">
                    {item.solutions.map((sol: string, solIdx: number) => (
                      <li key={solIdx} className="text-xs text-muted-foreground">✓ {sol}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Components Needed */}
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-sm font-bold flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-accent" />
              🛒 প্রয়োজনীয় উপাদান:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {info.components.map((comp: { name: string; spec: string }, cIdx: number) => (
                <div key={cIdx} className="p-2 rounded bg-background border">
                  <p className="text-sm font-medium">{comp.name}</p>
                  <p className="text-xs text-muted-foreground">{comp.spec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
  );
}
