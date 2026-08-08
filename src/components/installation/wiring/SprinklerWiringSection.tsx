import { Cable, Zap, Settings, CheckCircle2, ShoppingCart, Check, AlertTriangle, Info, Lightbulb, Droplets, Power, Bird, Egg, Fan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import relayAcWiringDiagram from '@/assets/relay-ac-wiring-diagram.png';

/**
 * SprinklerWiringSection — extracted from InstallationWiringTab for readability.
 * Pure presentational: renders the wiring guide for one sensor's `sprinklerWiringInfo`.
 */
export function SprinklerWiringSection({ info }: { info: any }) {
  return (
        <div className="mt-6 space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-500/10 border-2 border-sky-500/30">
            <Droplets className="h-5 w-5 text-sky-500" />
            <div>
              <p className="font-bold text-sm text-sky-600 dark:text-sky-400">{info.title}</p>
              <p className="text-xs text-muted-foreground">ছাদে পানি স্প্রে করে তাপমাত্রা কমায়</p>
            </div>
          </div>

          {/* Visual Wiring Diagram */}
          <div className="rounded-lg border-2 border-sky-500/30 overflow-hidden bg-background">
            <div className="bg-sky-500/10 p-2 border-b border-sky-500/30">
              <p className="text-xs font-bold text-center">📊 স্প্রিংকলার DC সোলেনয়েড ওয়্যারিং ডায়াগ্রাম</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900">
              <div className="flex flex-col items-center gap-4">
                {/* 12V DC Adapter */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border-2 border-green-500/30">
                  <Zap className="h-5 w-5 text-green-600" />
                  <div className="text-center">
                    <span className="text-sm font-bold">12V DC অ্যাডাপ্টার</span>
                    <p className="text-xs text-muted-foreground">(স্প্রিংকলার সোলেনয়েড ভালভ পাওয়ার)</p>
                  </div>
                </div>

                {/* DC wires */}
                <div className="flex items-center gap-12">
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-10 bg-red-500 rounded"></div>
                    <span className="text-xs text-red-500 font-bold">+ (পজিটিভ)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-10 bg-gray-700 dark:bg-gray-400 rounded"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-bold">− (GND)</span>
                  </div>
                </div>

                {/* Relay Module */}
                <div className="w-full max-w-sm">
                  <div className="bg-sky-600 rounded-t-lg p-2 text-center">
                    <span className="text-white text-xs font-bold">রিলে IN7 (GPIO 15 দ্বারা নিয়ন্ত্রিত)</span>
                  </div>
                  <div className="bg-gradient-to-b from-sky-500 to-sky-600 p-3 rounded-b-lg">
                    <div className="grid grid-cols-3 gap-2">
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
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                        <div className="w-10 h-10 bg-red-500 rounded border-2 border-red-600 flex items-center justify-center ring-2 ring-yellow-400">
                          <span className="text-xs font-bold text-white">COM</span>
                        </div>
                        <span className="text-xs text-white mt-1 font-bold">12V (+)</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-green-500 rounded border-2 border-green-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">NO</span>
                        </div>
                        <span className="text-xs text-white mt-1">ভালভ (+)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wire to Solenoid */}
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">NO থেকে</span>
                    <div className="w-1 h-8 bg-sky-500 rounded"></div>
                  </div>
                </div>

                {/* Solenoid Valve */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-sky-500/10 border-2 border-sky-500/50">
                  <div className="w-14 h-14 bg-sky-500/30 rounded-full flex items-center justify-center border-2 border-sky-500">
                    <span className="text-2xl">🚿</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold">DC সোলেনয়েড ভালভ (স্প্রিংকলার)</span>
                    <p className="text-xs text-muted-foreground">12V DC, 3/4" NC</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">লাল (+) → NO</Badge>
                      <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-300">কালো (−) → GND</Badge>
                    </div>
                  </div>
                </div>

                {/* Sprinkler Heads */}
                <div className="w-full p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
                  <p className="text-xs font-bold text-center mb-2">🔗 ভালভ আউটপুট → PVC পাইপ → স্প্রিংকলার হেড</p>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <div key={n} className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-sky-400 flex items-center justify-center text-xs">🚿</div>
                        <span className="text-[10px] text-muted-foreground">হেড {n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Flow */}
            <div className="bg-muted/30 p-3 border-t">
              <div className="flex items-center justify-center gap-2 text-sm font-mono flex-wrap">
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">12V (+)</span>
                <span>→</span>
                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">COM</span>
                <span className="text-muted-foreground">⟷</span>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">NO</span>
                <span>→</span>
                <span className="bg-sky-500 text-white px-2 py-1 rounded text-xs">ভালভ (+)</span>
                <span>→</span>
                <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs">GND (−)</span>
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
                    step.color === 'blue' ? 'bg-blue-500' :
                    step.color === 'black' ? 'bg-gray-700' :
                    step.color === 'teal' ? 'bg-teal-500' : 'bg-primary'
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

          {/* Parts Needed */}
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-sm font-bold flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-accent" />
              🛒 প্রয়োজনীয় উপাদান:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {info.partsNeeded.map((part: { name: string; spec: string; price: string }, pIdx: number) => (
                <div key={pIdx} className="p-2 rounded bg-background border">
                  <p className="text-sm font-medium">{part.name}</p>
                  <p className="text-xs text-muted-foreground">{part.spec}</p>
                  <p className="text-xs text-primary font-medium">{part.price}</p>
                </div>
              ))}
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
        </div>
  );
}
