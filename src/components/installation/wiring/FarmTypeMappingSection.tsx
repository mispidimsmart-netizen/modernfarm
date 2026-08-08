import { Cable, Zap, Settings, CheckCircle2, ShoppingCart, Check, AlertTriangle, Info, Lightbulb, Droplets, Power, Bird, Egg, Fan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import relayAcWiringDiagram from '@/assets/relay-ac-wiring-diagram.png';

/**
 * FarmTypeMappingSection — extracted from InstallationWiringTab for readability.
 * Pure presentational: renders the wiring guide for one sensor's `farmTypeMapping`.
 */
export function FarmTypeMappingSection({ info }: { info: any }) {
  return (
          <div className="mt-6 space-y-4">
            {/* Section Header */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border-2 border-primary/30">
              <Bird className="h-5 w-5 text-primary" />
              <div>
                <p className="font-bold text-sm">{info.title}</p>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </div>
            </div>

            {/* Relay Cards */}
            <div className="space-y-3">
              {info.relays.map((r, rIdx) => (
                <div key={rIdx} className="rounded-lg border-2 border-border overflow-hidden">
                  {/* Relay Header */}
                  <div className={`p-2 flex items-center justify-between ${r.shared ? 'bg-accent/20' : 'bg-primary/10'}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.shared ? "secondary" : "default"} className="text-xs font-mono">{r.relay}</Badge>
                      <span className="text-xs font-mono text-muted-foreground">{r.gpio}</span>
                    </div>
                    {r.shared && <Badge variant="outline" className="text-[10px]">উভয় ফার্মে একই</Badge>}
                  </div>

                  {r.shared ? (
                    /* Shared relay - single device */
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{r.sharedDevice?.split(' ')[0]}</span>
                        <span className="font-medium text-sm">{r.sharedDevice}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.sharedNote}</p>
                    </div>
                  ) : (
                    /* Dual-use relay - different per farm type */
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      {/* Layer Column */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Egg className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">🥚 লেয়ার ফার্ম</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="font-medium text-sm">{r.layerDevice}</p>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground text-xs">⚙️ অটোমেশন লজিক:</p>
                          <p>{r.layerAutomation}</p>
                        </div>
                      </div>

                      {/* Broiler Column */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Bird className="h-4 w-4 text-orange-500" />
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">🐔 ব্রয়লার ফার্ম</span>
                        </div>
                        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                          <p className="font-medium text-sm">{r.broilerDevice}</p>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground text-xs">⚙️ অটোমেশন লজিক:</p>
                          <p>{r.broilerAutomation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Important Note */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-bold flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                ⚠️ গুরুত্বপূর্ণ তথ্য
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                 <li>• অ্যাপে ফার্ম টাইপ সিলেক্ট করলে ESP32 <strong>স্বয়ংক্রিয়ভাবে</strong> সঠিক সফটওয়্যার লজিক প্রয়োগ করে।</li>
                 <li>• ৮-চ্যানেল রিলের সব ডিভাইস <strong>NO পোর্টে</strong> ফিজিক্যালি কানেক্ট করুন।</li>
                 <li>• <strong>লেয়ার ফার্মে</strong> হিটার (IN4) সাধারণত অব্যবহৃত থাকে — সফটওয়্যার স্বয়ংক্রিয়ভাবে এড়িয়ে যায়।</li>
                 <li>• <strong>ব্রয়লার ফার্মে</strong> হিটার (IN4) ব্রুডিং তাপমাত্রায় ব্যবহৃত হয়।</li>
                 <li>• একই শেডে লেয়ার↔ব্রয়লার পরিবর্তন করলে শুধু অ্যাপ থেকে ফার্ম টাইপ বদলান — হার্ডওয়্যার একই থাকে।</li>
              </ul>
            </div>
          </div>
  );
}
