import { Cable, Zap, Settings, CheckCircle2, ShoppingCart, Check, AlertTriangle, Info, Lightbulb, Droplets, Power, Bird, Egg, Fan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import relayAcWiringDiagram from '@/assets/relay-ac-wiring-diagram.png';

/**
 * McbContactorSection — extracted from InstallationWiringTab for readability.
 * Pure presentational: renders the wiring guide for one sensor's `mcbContactorInfo`.
 */
export function McbContactorSection({ info }: { info: any }) {
  return (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border-2 border-destructive/30">
              <Zap className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-bold text-sm">{info.title}</p>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-bold mb-2">🔧 প্রয়োজনীয় যন্ত্রাংশ:</p>
              <div className="space-y-2">
                {info.commonParts.map((part: any, pIdx: number) => (
                  <div key={pIdx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">{part.name}</span>
                      <span className="text-muted-foreground"> — {part.purpose}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer Wiring */}
            <div className="rounded-lg border-2 border-amber-500/30 overflow-hidden">
              <div className="p-3 bg-amber-500/10">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Egg className="h-4 w-4" />
                  {info.layerWiring.title}
                </p>
              </div>
              <div className="p-3 space-y-3">
                <div className="p-2 rounded bg-muted/80 overflow-x-auto">
                  <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed">{info.layerWiring.diagram}</pre>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left py-1.5 px-1">চ্যানেল</th><th className="text-left py-1.5 px-1">ডিভাইস</th><th className="text-left py-1.5 px-1">MCB</th><th className="text-left py-1.5 px-1">কন্ট্যাক্টর</th></tr></thead>
                    <tbody>
                      {info.layerWiring.relays.map((r: any, rIdx: number) => (
                        <tr key={rIdx} className="border-b border-border/50">
                          <td className="py-1.5 px-1 font-mono text-primary">{r.ch}</td>
                          <td className="py-1.5 px-1">{r.device}</td>
                          <td className="py-1.5 px-1">{r.mcb}</td>
                          <td className="py-1.5 px-1">{r.contactor ? '✅ হ্যাঁ' : '❌ না'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-bold mb-2">🔌 কন্ট্যাক্টর ওয়্যারিং স্টেপ (পাম্পের জন্য):</p>
                  <div className="space-y-1.5">
                    {info.layerWiring.contactorWiring.map((s: any, sIdx: number) => (
                      <div key={sIdx} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] shrink-0">{s.step}</Badge>
                        <span>{s.instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2 rounded bg-accent/20 text-xs">
                  <span className="font-semibold">কন্ট্যাক্টর সংখ্যা: {info.layerWiring.totalContactor}টি</span>
                  <span className="text-muted-foreground"> — {info.layerWiring.contactorNote}</span>
                </div>
              </div>
            </div>

            {/* Broiler Wiring */}
            <div className="rounded-lg border-2 border-orange-500/30 overflow-hidden">
              <div className="p-3 bg-orange-500/10">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Bird className="h-4 w-4" />
                  {info.broilerWiring.title}
                </p>
              </div>
              <div className="p-3 space-y-3">
                <div className="p-2 rounded bg-muted/80 overflow-x-auto">
                  <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed">{info.broilerWiring.diagram}</pre>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b"><th className="text-left py-1.5 px-1">চ্যানেল</th><th className="text-left py-1.5 px-1">ডিভাইস</th><th className="text-left py-1.5 px-1">MCB</th><th className="text-left py-1.5 px-1">কন্ট্যাক্টর</th></tr></thead>
                    <tbody>
                      {info.broilerWiring.relays.map((r: any, rIdx: number) => (
                        <tr key={rIdx} className="border-b border-border/50">
                          <td className="py-1.5 px-1 font-mono text-primary">{r.ch}</td>
                          <td className="py-1.5 px-1">{r.device}</td>
                          <td className="py-1.5 px-1">{r.mcb}</td>
                          <td className="py-1.5 px-1">{r.contactor ? '✅ হ্যাঁ' : '❌ না'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-bold mb-2">🔌 কন্ট্যাক্টর ওয়্যারিং স্টেপ (পাম্পের জন্য):</p>
                  <div className="space-y-1.5">
                    {info.broilerWiring.contactorWiring.map((s: any, sIdx: number) => (
                      <div key={sIdx} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] shrink-0">{s.step}</Badge>
                        <span>{s.instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2 rounded bg-accent/20 text-xs">
                  <span className="font-semibold">কন্ট্যাক্টর সংখ্যা: {info.broilerWiring.totalContactor}টি</span>
                  <span className="text-muted-foreground"> — {info.broilerWiring.contactorNote}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">⚠️ বড় ইন্ডাস্ট্রিয়াল ফ্যান (&gt;1HP) বা হাই-ওয়াটেজ হিটার (&gt;1000W) থাকলে:</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    <li>• ফ্যানের জন্য আলাদা কন্ট্যাক্টর (CH1 রিলে → কন্ট্যাক্টর কয়েল → ফ্যান)</li>
                    <li>• হিটারের জন্য আলাদা কন্ট্যাক্টর (CH3 রিলে → কন্ট্যাক্টর কয়েল → হিটার)</li>
                    <li>• এক্ষেত্রে মোট ২-৩টি কন্ট্যাক্টর প্রয়োজন হবে</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Detailed Contactor Installation Guide */}
            {info.contactorDetailGuide && (() => {
              const guide = info.contactorDetailGuide;
              return (
                <div className="space-y-4">
                  {/* Section Title */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
                    <Zap className="h-5 w-5 text-primary" />
                    <p className="font-bold text-sm">{guide.title}</p>
                  </div>

                  {/* What is Contactor */}
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs font-bold mb-2">{guide.whatIs.title}</p>
                    <ul className="space-y-1.5">
                      {guide.whatIs.points.map((p: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* When Needed */}
                  <div className="p-3 rounded-lg border border-border space-y-3">
                    <p className="text-xs font-bold">{guide.whenNeeded.title}</p>
                    <div>
                      <p className="text-xs font-semibold text-destructive mb-1.5">✅ কন্ট্যাক্টর লাগবে:</p>
                      <div className="space-y-1.5">
                        {guide.whenNeeded.needed.map((item: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-destructive/5 border border-destructive/20 text-xs">
                            <span className="font-semibold">{item.device}</span>
                            <span className="text-muted-foreground"> — {item.condition}</span>
                            <p className="text-muted-foreground mt-0.5">💡 {item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1.5">❌ কন্ট্যাক্টর লাগবে না:</p>
                      <ul className="space-y-1">
                        {guide.whenNeeded.notNeeded.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Parts Identification */}
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
                    <p className="text-xs font-bold">{guide.partsIdentification.title}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {guide.partsIdentification.parts.map((part: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-background border border-border text-xs">
                          <div className="flex items-center gap-1.5">
                            <span>{part.color}</span>
                            <span className="font-bold font-mono">{part.name}</span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">📍 {part.location}</p>
                          <p className="text-muted-foreground">→ {part.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step by Step Wiring */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold">{guide.wiringSteps.title}</p>
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs font-semibold text-destructive">
                      {guide.wiringSteps.warning}
                    </div>
                    {guide.wiringSteps.steps.map((step: any, sIdx: number) => (
                      <div key={sIdx} className="rounded-lg border-2 border-border overflow-hidden">
                        <div className="p-2.5 bg-primary/10 flex items-center gap-2">
                          <Badge className="text-xs">{step.step}</Badge>
                          <span className="text-xs font-bold">{step.title}</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                          <div className="space-y-2">
                            {step.wires.map((w: any, wIdx: number) => (
                              <div key={wIdx} className="p-2 rounded bg-muted/50 border border-border text-xs">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="font-mono text-primary">{w.from}</span>
                                  <span>→</span>
                                  <span className="font-mono text-primary">{w.to}</span>
                                  {w.wire && <Badge variant="outline" className="text-[10px]">{w.wire}</Badge>}
                                </div>
                                <p className="text-muted-foreground mt-1">{w.note}</p>
                              </div>
                            ))}
                          </div>
                          <div className="p-2 rounded bg-primary/5 text-xs font-semibold text-primary">
                            {step.result}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Full Wiring Diagram */}
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs font-bold mb-2">{guide.fullDiagram.title}</p>
                    <div className="p-3 rounded bg-background overflow-x-auto">
                      <pre className="text-[10px] sm:text-xs font-mono whitespace-pre leading-relaxed text-foreground">{guide.fullDiagram.diagram}</pre>
                    </div>
                  </div>

                  {/* Common Mistakes */}
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                    <p className="text-xs font-bold text-destructive">{guide.commonMistakes.title}</p>
                    <div className="space-y-2">
                      {guide.commonMistakes.mistakes.map((m: any, mIdx: number) => (
                        <div key={mIdx} className="p-2 rounded bg-background border border-border text-xs">
                          <p className="font-semibold text-destructive">❌ {m.mistake}</p>
                          <p className="text-muted-foreground">⚠️ সমস্যা: {m.problem}</p>
                          <p className="text-primary">✅ সমাধান: {m.solution}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Testing Steps */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                    <p className="text-xs font-bold">{guide.testingSteps.title}</p>
                    <div className="space-y-1.5">
                      {guide.testingSteps.steps.map((s: any, sIdx: number) => (
                        <div key={sIdx} className="flex items-start gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{s.step}</Badge>
                          <span className="text-muted-foreground">{s.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Safety Warnings */}
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs font-bold mb-2 text-destructive">⚠️ নিরাপত্তা সতর্কতা:</p>
              <ul className="space-y-1">
                {info.safetyWarnings.map((w: string, wIdx: number) => (
                  <li key={wIdx} className="text-xs text-muted-foreground">{w}</li>
                ))}
              </ul>
            </div>
          </div>
  );
}
