import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Wrench, Zap, CircuitBoard, CheckCircle2, AlertTriangle, ShieldAlert, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * LDR (Light Dependent Resistor) installation guide.
 * Hardware: LDR + 10kΩ pull-down voltage divider → ESP32 GPIO 36 (VP, ADC1_CH0).
 * IMPORTANT: GPIO 36 is INPUT-ONLY. Voltage MUST stay within 0–3.3V. Never connect 5V.
 */
export function LDRInstallationGuide() {
  const { language } = useAuth();
  const [open, setOpen] = useState(false);
  const bn = language === 'bn';

  return (
    <div className="rounded-2xl bg-card shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Wrench size={20} />
          </div>
          <div>
            <h3 className="font-semibold">
              {bn ? '🛠️ LDR ইনস্টলেশন গাইড' : '🛠️ LDR Installation Guide'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {bn ? 'সঠিক ওয়্যারিং, রেজিস্টর ও পিন ম্যাপিং' : 'Correct wiring, resistor & pin mapping'}
            </p>
          </div>
        </div>
        <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t p-5 space-y-6">
              {/* ── CRITICAL VOLTAGE WARNING ───────────────────────────── */}
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:bg-red-950/40 dark:border-red-900">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={22} />
                  <div className="text-sm">
                    <p className="font-bold text-red-700 dark:text-red-300 mb-1">
                      {bn ? '⚠️ ভোল্টেজ সতর্কতা — ৩.৩V মাত্র' : '⚠️ Voltage Warning — 3.3V ONLY'}
                    </p>
                    <p className="text-red-700/90 dark:text-red-300/90 leading-relaxed">
                      {bn
                        ? 'GPIO 36 (VP) input-only পিন। সর্বোচ্চ অনুমোদিত ভোল্টেজ ৩.৩V। ৫V সংযোগ দিলে ESP32 চিরতরে নষ্ট হবে। সবসময় ESP32 এর 3.3V পিন থেকে পাওয়ার নেবেন, কখনো VIN বা 5V থেকে নয়।'
                        : 'GPIO 36 (VP) is input-only. Max allowed voltage is 3.3V. Connecting 5V will permanently damage the ESP32. Always power the divider from the ESP32 3.3V pin — never VIN or 5V.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── EXACT PIN MAPPING TABLE ────────────────────────────── */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <CircuitBoard size={16} className="text-primary" />
                  {bn ? 'ESP32 পিন ম্যাপিং (নির্দিষ্ট)' : 'ESP32 Pin Mapping (exact)'}
                </h4>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-semibold">{bn ? 'ESP32 পিন' : 'ESP32 Pin'}</th>
                        <th className="p-2 text-left font-semibold">{bn ? 'লেবেল' : 'Label'}</th>
                        <th className="p-2 text-left font-semibold">{bn ? 'কাজ' : 'Purpose'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="p-2"><Badge variant="outline" className="font-mono">3V3</Badge></td>
                        <td className="p-2 text-muted-foreground">3.3V</td>
                        <td className="p-2">{bn ? 'ডিভাইডারের পাওয়ার ইনপুট' : 'Power input for divider'}</td>
                      </tr>
                      <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                        <td className="p-2"><Badge className="bg-amber-500 hover:bg-amber-500 text-white font-mono">GPIO 36</Badge></td>
                        <td className="p-2 text-muted-foreground">VP / ADC1_CH0</td>
                        <td className="p-2 font-medium">{bn ? 'LDR সিগন্যাল ইনপুট (analog)' : 'LDR signal input (analog)'}</td>
                      </tr>
                      <tr>
                        <td className="p-2"><Badge variant="outline" className="font-mono">GND</Badge></td>
                        <td className="p-2 text-muted-foreground">Ground</td>
                        <td className="p-2">{bn ? 'রেজিস্টরের অপর প্রান্ত' : 'Other end of pull-down resistor'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {bn
                    ? 'GPIO 36 = ADC1 চ্যানেল ০, input-only, WiFi এর সাথে কনফ্লিক্ট নেই — তাই LDR এর জন্য সবচেয়ে নিরাপদ পিন।'
                    : 'GPIO 36 = ADC1 channel 0, input-only, no WiFi conflict — the safest pin for LDR.'}
                </p>
              </section>

              {/* ── PARTS / RESISTOR ──────────────────────────────────── */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <Zap size={16} className="text-amber-500" />
                  {bn ? 'প্রয়োজনীয় উপকরণ ও রেজিস্টর' : 'Parts & Resistor Selection'}
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                    <p className="font-semibold mb-1">{bn ? 'LDR সেন্সর' : 'LDR Sensor'}</p>
                    <p className="text-xs text-muted-foreground">
                      {bn
                        ? 'GL5528 (অথবা সমতুল্য 5–10kΩ আলোতে / 200kΩ+ অন্ধকারে)। দাম ১০–২০ টাকা।'
                        : 'GL5528 (or equivalent: 5–10kΩ in light, 200kΩ+ in dark). ~$0.10.'}
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30 dark:border-emerald-900">
                    <p className="font-semibold mb-1 text-emerald-700 dark:text-emerald-300">
                      {bn ? 'পুল-ডাউন রেজিস্টর' : 'Pull-down Resistor'}
                    </p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                      <strong>10kΩ {bn ? 'প্রস্তাবিত' : 'recommended'}</strong> ({bn ? 'রেঞ্জ' : 'range'}: 4.7kΩ – 22kΩ).
                      <br />
                      {bn
                        ? '১০kΩ = পুরো ০.৩V (অন্ধকার) থেকে ৩.১V (উজ্জ্বল রোদ) পর্যন্ত পরিসীমা পাবেন।'
                        : '10kΩ gives the widest 0.3V (dark) → 3.1V (bright sun) swing on ADC.'}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                    <p className="font-semibold mb-1">{bn ? 'জাম্পার ওয়্যার' : 'Jumper Wires'}</p>
                    <p className="text-xs text-muted-foreground">
                      {bn ? '৩টি female-to-female (২০ সেমি)' : '3× female-to-female (20cm)'}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                    <p className="font-semibold mb-1">{bn ? 'ইনসুলেশন' : 'Insulation'}</p>
                    <p className="text-xs text-muted-foreground">
                      {bn ? 'হিট-শ্রিঙ্ক টিউব বা ইলেকট্রিক্যাল টেপ' : 'Heat-shrink tube or electrical tape'}
                    </p>
                  </div>
                </div>
              </section>

              {/* ── WIRING DIAGRAM ────────────────────────────────────── */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <Zap size={16} className="text-amber-500" />
                  {bn ? 'ভোল্টেজ ডিভাইডার ডায়াগ্রাম' : 'Voltage Divider Wiring'}
                </h4>
                <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
{`   ESP32 3V3 ──────┬─────[ LDR ]─────┬────► GPIO 36 (VP)
                                      │
                                      ├──[ 10kΩ ]──── ESP32 GND
                                      │
                              (junction → GPIO 36)

   ${bn ? 'কাজের নীতি' : 'How it works'}:
     ${bn ? 'উজ্জ্বল আলো → LDR কম রেজিস্ট্যান্স → GPIO 36 এ বেশি ভোল্টেজ → বেশি lux'
          : 'Bright light → low LDR resistance → high voltage on GPIO 36 → high lux'}
     ${bn ? 'অন্ধকার → LDR বেশি রেজিস্ট্যান্স → GPIO 36 এ কম ভোল্টেজ → কম lux'
          : 'Dark        → high LDR resistance → low voltage on GPIO 36 → low lux'}`}
                </pre>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border bg-red-50 p-2 text-center dark:bg-red-950/30 dark:border-red-900">
                    <p className="font-semibold text-red-600 dark:text-red-400">3.3V</p>
                    <p className="text-muted-foreground">{bn ? 'পাওয়ার (3V3)' : 'Power (3V3)'}</p>
                  </div>
                  <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-2 text-center dark:bg-amber-950/30 dark:border-amber-700">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">GPIO 36</p>
                    <p className="text-muted-foreground">{bn ? 'সিগন্যাল (VP)' : 'Signal (VP)'}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-100 p-2 text-center dark:bg-slate-900 dark:border-slate-700">
                    <p className="font-semibold">GND</p>
                    <p className="text-muted-foreground">{bn ? 'গ্রাউন্ড' : 'Ground'}</p>
                  </div>
                </div>
              </section>

              {/* ── STEP-BY-STEP ──────────────────────────────────────── */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 size={16} className="text-status-normal" />
                  {bn ? 'ধাপে ধাপে সংযোগ' : 'Step-by-step'}
                </h4>
                <ol className="space-y-2 text-sm">
                  {(bn ? [
                    'ESP32 এর পাওয়ার অফ করুন (USB/অ্যাডাপ্টার খুলুন)',
                    'LDR-এর এক পা ESP32 এর 3V3 (3.3V) পিনে দিন — কখনো VIN/5V নয়',
                    'LDR-এর অন্য পা GPIO 36 (VP) এবং ১০kΩ রেজিস্টরের এক পায়ের সাথে junction করুন',
                    'রেজিস্টরের অন্য পা ESP32 এর GND তে দিন',
                    'মাল্টিমিটার থাকলে continuity test করুন (শর্ট না হয়)',
                    'ESP32 চালু করুন — Serial Monitor এ "💡 LDR Sensor: DETECTED on GPIO 36" দেখুন',
                    'অ্যাপের Lighting পেজে গিয়ে LDR সুইচ অন করুন',
                    'হাত দিয়ে LDR ঢাকুন — lux মান ১০-এর নিচে নেমে যাওয়ার কথা',
                  ] : [
                    'Power off the ESP32 (unplug USB / adapter)',
                    'Connect one leg of the LDR to the ESP32 3V3 (3.3V) pin — never VIN/5V',
                    'Junction: other leg of LDR + one leg of 10kΩ resistor + GPIO 36 (VP)',
                    'Connect the other leg of the resistor to ESP32 GND',
                    'If you have a multimeter, run a continuity test (no shorts)',
                    'Power on the ESP32 — Serial Monitor should print "💡 LDR Sensor: DETECTED on GPIO 36"',
                    'Open the Lighting page in this app and toggle the LDR switch ON',
                    'Cover the LDR with your hand — lux value should drop below 10',
                  ]).map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* ── TROUBLESHOOTING ───────────────────────────────────── */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <Search size={16} className="text-blue-500" />
                  {bn ? 'সমস্যা সমাধান' : 'Troubleshooting'}
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg border bg-muted/30 p-2.5">
                    <p className="font-semibold">{bn ? '❌ "Not detected" দেখাচ্ছে' : '❌ Shows "Not detected"'}</p>
                    <p className="text-muted-foreground">
                      {bn ? 'GPIO 36 এ তার ঠিকমতো লাগেনি অথবা রেজিস্টর missing। সংযোগ আবার চেক করুন।'
                          : 'Wire to GPIO 36 is loose, or pull-down resistor is missing. Re-check connections.'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-2.5">
                    <p className="font-semibold">{bn ? '⚠️ lux সবসময় ০' : '⚠️ Lux always 0'}</p>
                    <p className="text-muted-foreground">
                      {bn ? '3.3V লাইনে পাওয়ার নেই — multimeter দিয়ে 3V3 পিন চেক করুন।'
                          : 'No power on 3.3V rail — check 3V3 pin with multimeter.'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-2.5">
                    <p className="font-semibold">{bn ? '⚠️ lux সবসময় সর্বোচ্চ (~4000)' : '⚠️ Lux always at max (~4000)'}</p>
                    <p className="text-muted-foreground">
                      {bn ? 'রেজিস্টর GND-তে যাচ্ছে না — pull-down ছাড়া GPIO 36 floating হয়ে যায়।'
                          : 'Pull-down resistor not connected to GND — GPIO 36 floats without it.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* ── FINAL WARNINGS ───────────────────────────────────── */}
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/30 dark:border-amber-900">
                <h4 className="mb-1 flex items-center gap-2 font-semibold text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={16} />
                  {bn ? 'গুরুত্বপূর্ণ সতর্কতা' : 'Important Warnings'}
                </h4>
                <ul className="text-xs space-y-1 text-amber-700 dark:text-amber-400 pl-5 list-disc">
                  <li>{bn ? 'GPIO 36 input-only — কখনো 5V সংযোগ দেবেন না, ESP32 পুড়ে যাবে'
                          : 'GPIO 36 is input-only — never connect 5V, will damage ESP32'}</li>
                  <li>{bn ? 'লেয়ার মুরগির ক্ষেত্রে "Sensor only" মোড এড়িয়ে চলুন — ১৪–১৬ ঘণ্টা আলো নিশ্চিত করুন'
                          : 'For layer hens, avoid "Sensor only" mode — must guarantee 14–16h of light'}</li>
                  <li>{bn ? 'LDR কে এমন জায়গায় রাখুন যেখানে বাতির সরাসরি প্রতিফলন না পড়ে (false reading এড়াতে)'
                          : 'Place LDR away from direct lamp reflection (avoid false readings)'}</li>
                  <li>{bn ? 'বাইরের আলো বুঝতে শেডের জানালার কাছে মাউন্ট করুন'
                          : 'For outdoor light detection, mount near a window'}</li>
                  <li>{bn ? 'লম্বা তার ব্যবহার করলে (>২ মিটার) shielded cable নিন — noise কমবে'
                          : 'For long runs (>2m) use shielded cable to reduce ADC noise'}</li>
                </ul>
              </section>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                {bn ? 'গাইড বন্ধ করুন' : 'Close Guide'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
