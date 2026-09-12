import { Zap, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import capacitorWiringDiagram from '@/assets/esp32-capacitor-wiring.png';

interface PowerSetupStep {
  icon: string;
  text: string;
  step?: string | number;
}

export interface PowerSetupInfo {
  title: string;
  diagram: string;
  beforeStart: PowerSetupStep[];
  jumperWarning: { title: string; before: string; after: string; explanation: string };
  voltageCheckSteps: PowerSetupStep[];
}

/** 12V power distribution + LM2596 setup block shown under relay wiring. */
export function PowerSetupDiagram({ info }: { info: PowerSetupInfo }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border-2 border-destructive/30 overflow-hidden">
        <div className="bg-destructive/10 p-2 border-b border-destructive/30">
          <p className="text-xs font-bold text-center">{info.title}</p>
        </div>
        <div className="p-3 overflow-x-auto">
          <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed">{info.diagram}</pre>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <p className="text-xs font-bold mb-2">🛑 শুরুর আগে:</p>
        <div className="space-y-1.5">
          {info.beforeStart.map((s, sIdx) => (
            <div key={sIdx} className="flex items-start gap-2 text-xs">
              <span>{s.icon}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-destructive/10 border-2 border-destructive/40">
        <p className="text-xs font-bold text-destructive mb-2">{info.jumperWarning.title}</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="p-2 rounded bg-muted/50 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">❌ আগে (ভুল)</p>
            <code className="text-xs font-mono">{info.jumperWarning.before}</code>
          </div>
          <div className="p-2 rounded bg-primary/10 text-center border border-primary/30">
            <p className="text-[10px] text-primary mb-1">✅ এখন (সঠিক)</p>
            <code className="text-xs font-mono">{info.jumperWarning.after}</code>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{info.jumperWarning.explanation}</p>
      </div>

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs font-bold mb-2">📟 LM2596 ভোল্টেজ সেটআপ (গুরুত্বপূর্ণ!):</p>
        <div className="space-y-2">
          {info.voltageCheckSteps.map((s, sIdx) => (
            <div key={sIdx} className="flex items-start gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] shrink-0">{s.icon} {s.step}</Badge>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 1000μF capacitor across VIN/GND — visual + reference photo. */
export function CapacitorDiagram() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-amber-500/30 overflow-hidden bg-background">
        <div className="bg-amber-500/10 p-2 border-b border-amber-500/30">
          <p className="text-xs font-bold text-center">📊 ক্যাপাসিটর কানেকশন ডায়াগ্রাম</p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">5V পাওয়ার সাপ্লাই / USB</span>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center">
                <div className="w-1 h-6 bg-red-500 rounded"></div>
                <span className="text-xs text-red-500 font-bold">+5V</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-1 h-6 bg-foreground/50 rounded"></div>
                <span className="text-xs text-muted-foreground font-bold">GND</span>
              </div>
            </div>

            <div className="w-full max-w-sm">
              <div className="bg-blue-700 rounded-t-lg p-2 text-center">
                <span className="text-white text-xs font-bold">ESP32 DevKit</span>
              </div>

              <div className="bg-blue-600 p-4 rounded-b-lg">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-yellow-600">
                      <span className="text-[10px] font-bold text-yellow-900">VIN</span>
                    </div>
                    <span className="text-[10px] text-white mt-1">5V পাওয়ার</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-6 h-12 bg-gradient-to-b from-gray-800 to-gray-900 rounded-sm border border-gray-600 flex items-center justify-center">
                        <div className="absolute -top-1 left-0 right-0 flex justify-center">
                          <span className="text-[8px] text-green-400 font-bold">+</span>
                        </div>
                        <span className="text-[8px] text-white font-bold rotate-90">1000μF</span>
                        <div className="absolute top-0 bottom-0 right-0 w-1 bg-gray-400"></div>
                      </div>
                      <div className="absolute -bottom-3 left-1 w-0.5 h-3 bg-gray-400"></div>
                      <div className="absolute -bottom-3 right-1 w-0.5 h-3 bg-gray-400"></div>
                    </div>
                    <div className="mt-4 flex gap-2 text-[9px]">
                      <span className="text-red-300">+ লম্বা</span>
                      <span className="text-gray-300">- ছোট</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-1 h-4 bg-foreground/50 rounded mb-1"></div>
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600">
                      <span className="text-[10px] font-bold text-white">GND</span>
                    </div>
                    <span className="text-[10px] text-white mt-1">গ্রাউন্ড</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="flex items-center">
                    <div className="w-8 h-0.5 bg-red-500"></div>
                    <span className="text-[8px] text-red-300 mx-1">→</span>
                    <div className="w-4 h-0.5 bg-red-500"></div>
                  </div>
                  <div className="px-2 py-1 bg-gray-800 rounded text-[8px] text-white">ক্যাপাসিটর</div>
                  <div className="flex items-center">
                    <div className="w-4 h-0.5 bg-gray-500"></div>
                    <span className="text-[8px] text-gray-300 mx-1">→</span>
                    <div className="w-8 h-0.5 bg-gray-500"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 max-w-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-destructive">পোলারিটি গুরুত্বপূর্ণ!</span>
                <p className="text-muted-foreground">+ (লম্বা পা) → VIN | - (ছোট পা/স্ট্রাইপ) → GND</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-background border">
            <p className="text-xs font-bold mb-2">🔍 ক্যাপাসিটরের + ও - চেনার উপায়:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 rounded bg-green-500/10">
                <div className="w-4 h-8 bg-gray-800 rounded-sm relative">
                  <div className="absolute top-0 w-full text-center text-[8px] text-green-400">+</div>
                </div>
                <div className="text-xs">
                  <p className="font-bold text-green-600">+ পজিটিভ</p>
                  <p className="text-muted-foreground">লম্বা পা</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-gray-500/10">
                <div className="w-4 h-8 bg-gray-800 rounded-sm relative">
                  <div className="absolute top-0 bottom-0 right-0 w-1 bg-white/50"></div>
                  <div className="absolute top-0 w-full text-center text-[8px] text-gray-400">-</div>
                </div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">- নেগেটিভ</p>
                  <p className="text-muted-foreground">ছোট পা + সাদা স্ট্রাইপ</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="bg-muted/50 p-2">
            <p className="text-xs font-medium text-center">📷 রেফারেন্স ছবি</p>
          </div>
          <img
            src={capacitorWiringDiagram}
            alt="ESP32 Capacitor Wiring"
            loading="lazy"
            decoding="async"
            className="w-full h-auto bg-white"
          />
        </div>
      </div>
    </div>
  );
}
