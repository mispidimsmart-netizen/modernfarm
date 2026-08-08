import { Cable, Zap, Settings, CheckCircle2, ShoppingCart, Check, AlertTriangle, Info, Lightbulb, Droplets, Power, Bird, Egg, Fan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import relayAcWiringDiagram from '@/assets/relay-ac-wiring-diagram.png';

/**
 * AcWiringSection — extracted from InstallationWiringTab for readability.
 * Pure presentational: renders the wiring guide for one sensor's `acWiringInfo`.
 */
export function AcWiringSection({ info }: { info: any }) {
  return (
        <div className="mt-6 space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border-2 border-destructive/30">
            <Zap className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-bold text-sm text-destructive">{info.title}</p>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>
          </div>

          {/* AC Wiring Visual Diagram - Code Based for Clarity */}
          <div className="rounded-lg border-2 border-primary/30 overflow-hidden bg-background">
            <div className="bg-primary/5 p-2 border-b border-primary/30">
              <p className="text-xs font-bold text-center">📊 রিলে AC লোড কানেকশন ডায়াগ্রাম (ফ্যান উদাহরণ)</p>
            </div>

            {/* Visual Diagram */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900">
              {/* Main Wiring Diagram */}
              <div className="flex flex-col items-center gap-4">

                {/* AC Mains Source */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                  <Zap className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-bold">AC 220V মেইন সাপ্লাই</span>
                </div>

                {/* Wires going down */}
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-8 bg-red-500 rounded"></div>
                    <span className="text-xs text-red-500 font-bold">Live</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-1 h-8 bg-blue-500 rounded"></div>
                    <span className="text-xs text-blue-500 font-bold">Neutral</span>
                  </div>
                </div>

                {/* Relay Terminal Section */}
                <div className="w-full max-w-md">
                  <div className="bg-blue-600 rounded-t-lg p-2 text-center">
                    <span className="text-white text-xs font-bold">রিলে মডিউল (K1 - ফ্যান)</span>
                  </div>

                  {/* Screw Terminals */}
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
                        <span className="text-[10px] text-red-200">ব্যবহার নেই</span>
                      </div>

                      {/* COM Terminal */}
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-4 bg-red-500 rounded mb-1"></div>
                        <div className="w-10 h-10 bg-red-500 rounded border-2 border-red-600 flex items-center justify-center ring-2 ring-yellow-400">
                          <span className="text-xs font-bold text-white">COM</span>
                        </div>
                        <span className="text-xs text-white mt-1 font-bold">AC Live</span>
                        <span className="text-[10px] text-green-200">← এখানে</span>
                      </div>

                      {/* NO Terminal */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-green-500 rounded border-2 border-green-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">NO</span>
                        </div>
                        <div className="w-1 h-4 bg-black rounded mt-1"></div>
                        <span className="text-xs text-white">লোড</span>
                        <span className="text-[10px] text-green-200">ফ্যানে যাবে</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connection to Load */}
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-foreground/70">NO থেকে</span>
                    <div className="w-1 h-8 bg-black rounded"></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-foreground/70">সরাসরি</span>
                    <div className="w-1 h-8 bg-blue-500 rounded"></div>
                  </div>
                </div>

                {/* Fan/Load */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20 border-2 border-accent">
                  <div className="w-10 h-10 bg-accent/30 rounded-full flex items-center justify-center">
                    <span className="text-xl">🌀</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold">ফ্যান / লাইট</span>
                    <p className="text-xs text-muted-foreground">220V AC লোড</p>
                  </div>
                </div>
              </div>

              {/* Wire Legend */}
              <div className="mt-4 p-3 rounded-lg bg-background border">
                <p className="text-xs font-bold mb-2">🔌 তারের রঙ:</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-2 bg-red-500 rounded"></div>
                    <span className="text-xs">লাল = Live (Phase)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-2 bg-blue-500 rounded"></div>
                    <span className="text-xs">নীল = Neutral</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-2 bg-black rounded"></div>
                    <span className="text-xs">কালো = লোড</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/30 p-3 border-t">
              <div className="flex items-center justify-center gap-2 text-sm font-mono flex-wrap">
                <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">AC Live</span>
                <span>→</span>
                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">COM</span>
                <span className="text-muted-foreground">⟷</span>
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">NO</span>
                <span>→</span>
                <span className="bg-accent text-accent-foreground px-2 py-1 rounded text-xs">ফ্যান</span>
                <span>→</span>
                <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Neutral</span>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                ⚡ রিলে ON হলে COM ↔ NO কানেক্ট হয় = লোড চালু | রিলে OFF হলে সার্কিট খোলা = লোড বন্ধ
              </p>
            </div>
          </div>

          {/* Reference Image */}
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 p-2 border-b">
              <p className="text-xs font-medium text-center">📷 রেফারেন্স ডায়াগ্রাম</p>
            </div>
            <img 
              src={relayAcWiringDiagram} 
              alt="Relay NC COM NO Wiring Diagram" 
              loading="lazy"
              decoding="async"
              className="w-full h-auto bg-white"
            />
          </div>

          {/* Terminal Explanation */}
          <div className="space-y-2">
            <p className="text-sm font-bold">📍 টার্মিনাল চিনুন (বাম থেকে ডান):</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {info.terminals.map((terminal, tIdx) => (
                <div key={tIdx} className={`p-3 rounded-lg border-2 ${tIdx === 1 ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full ${terminal.color}`}></div>
                    <span className="font-bold text-sm">{terminal.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">অবস্থান: {terminal.position}</p>
                  <p className="text-sm font-medium text-primary">{terminal.useFor}</p>
                  <p className="text-xs text-muted-foreground mt-1">{terminal.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step by Step Wiring */}
          <div className="space-y-2">
            <p className="text-sm font-bold">🔧 ধাপে ধাপে ওয়্যারিং (ফ্যান উদাহরণ):</p>
            <div className="space-y-2">
              {info.wiringSteps.map((step, sIdx) => (
                <div key={sIdx} className={`flex items-start gap-3 p-3 rounded-lg ${sIdx === 3 ? 'bg-muted/30 border border-dashed border-muted-foreground/30' : 'bg-muted/50'}`}>
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full ${sIdx === 3 ? 'bg-muted-foreground/50' : 'bg-primary'} text-primary-foreground text-xs font-bold shrink-0`}>
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{step.title}</span>
                      <Badge variant="secondary" className="text-xs">🔌 {step.wire}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{step.instruction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Warnings */}
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
            <p className="text-sm font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              ⚠️ নিরাপত্তা সতর্কতা
            </p>
            <ul className="space-y-1">
              {info.safetyWarnings.map((warning, wIdx) => (
                <li key={wIdx} className="text-xs text-destructive/90">• {warning}</li>
              ))}
            </ul>
          </div>

          {/* Circuit Summary */}
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-sm font-bold flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-accent" />
              💡 সার্কিট সারসংক্ষেপ
            </p>
            <div className="flex items-center justify-center gap-2 text-sm font-mono bg-background p-2 rounded">
              <span className="text-red-500">AC Live</span>
              <span>→</span>
              <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">COM</span>
              <span>⇋</span>
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">NO</span>
              <span>→</span>
              <span className="text-yellow-600">ফ্যান/লাইট</span>
              <span>→</span>
              <span className="text-blue-500">Neutral</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              রিলে ON হলে COM ↔ NO কানেক্ট হয়, ফলে কারেন্ট প্রবাহিত হয়ে লোড চালু হয়।
            </p>
          </div>
        </div>
      )}
  );
}
