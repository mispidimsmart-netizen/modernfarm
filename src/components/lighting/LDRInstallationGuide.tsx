import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Wrench, Zap, CircuitBoard, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export function LDRInstallationGuide() {
  const { language } = useAuth();
  const [open, setOpen] = useState(false);

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
              {language === 'bn' ? '🛠️ LDR ইনস্টলেশন গাইড' : '🛠️ LDR Installation Guide'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'ধাপে ধাপে সংযোগ পদ্ধতি' : 'Step-by-step wiring instructions'}
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
            <div className="border-t p-5 space-y-5">
              {/* What you need */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <CircuitBoard size={16} className="text-primary" />
                  {language === 'bn' ? 'প্রয়োজনীয় উপকরণ' : 'What You Need'}
                </h4>
                <ul className="space-y-1.5 text-sm pl-6 list-disc text-muted-foreground">
                  <li>{language === 'bn' ? '১টি LDR (GL5528 বা সমতুল্য) — দাম ১০-২০ টাকা' : '1× LDR (GL5528 or equivalent) — ~$0.10'}</li>
                  <li>{language === 'bn' ? '১টি ১০kΩ রেজিস্টর (pull-down)' : '1× 10kΩ resistor (pull-down)'}</li>
                  <li>{language === 'bn' ? '৩টি জাম্পার ওয়্যার (female-to-female)' : '3× jumper wires (female-to-female)'}</li>
                  <li>{language === 'bn' ? 'হিট-শ্রিঙ্ক টিউব বা টেপ (অপশনাল)' : 'Heat-shrink tube or tape (optional)'}</li>
                </ul>
              </section>

              {/* Wiring */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <Zap size={16} className="text-amber-500" />
                  {language === 'bn' ? 'সংযোগ ডায়াগ্রাম' : 'Wiring Diagram'}
                </h4>
                <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
{`  ESP32 3.3V ────┬──── LDR ────┬──── ESP32 GPIO 36 (VP)
                 │             │
                 │             └──── 10kΩ ──── ESP32 GND
                 │
              (LDR ও Resistor এর মাঝে junction
               থেকে GPIO 36 এ তার যাবে)`}
                </pre>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border bg-red-50 p-2 text-center dark:bg-red-950/30 dark:border-red-900">
                    <p className="font-semibold text-red-600 dark:text-red-400">3.3V</p>
                    <p className="text-muted-foreground">{language === 'bn' ? 'পাওয়ার' : 'Power'}</p>
                  </div>
                  <div className="rounded-lg border bg-amber-50 p-2 text-center dark:bg-amber-950/30 dark:border-amber-900">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">GPIO 36</p>
                    <p className="text-muted-foreground">{language === 'bn' ? 'সিগন্যাল' : 'Signal'}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-100 p-2 text-center dark:bg-slate-900 dark:border-slate-700">
                    <p className="font-semibold">GND</p>
                    <p className="text-muted-foreground">{language === 'bn' ? 'গ্রাউন্ড' : 'Ground'}</p>
                  </div>
                </div>
              </section>

              {/* Steps */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 size={16} className="text-status-normal" />
                  {language === 'bn' ? 'ধাপসমূহ' : 'Steps'}
                </h4>
                <ol className="space-y-2 text-sm pl-2">
                  {(language === 'bn' ? [
                    'ESP32 এর পাওয়ার অফ করুন (USB/অ্যাডাপ্টার খুলে নিন)',
                    'LDR-এর এক পা ESP32 এর 3.3V পিনে সংযোগ দিন',
                    'LDR-এর অন্য পা GPIO 36 (VP) এবং ১০kΩ রেজিস্টরের এক পায়ের সাথে যোগ করুন',
                    'রেজিস্টরের অন্য পা ESP32 এর GND তে দিন',
                    'সংযোগ চেক করুন (শর্ট সার্কিট না হয়)',
                    'ESP32 চালু করুন — Serial Monitor এ "💡 LDR Sensor: DETECTED on GPIO 36" দেখার কথা',
                    'এই অ্যাপে ফিরে এসে "LDR সেটিংস" থেকে সুইচ অন করুন',
                    'বর্তমান lux মান দেখুন — হাত দিয়ে ঢাকলে কমে যাওয়ার কথা',
                  ] : [
                    'Power off the ESP32 (unplug USB/adapter)',
                    'Connect one leg of the LDR to the 3.3V pin on ESP32',
                    'Connect the other leg to GPIO 36 (VP) AND one leg of the 10kΩ resistor',
                    'Connect the other leg of the resistor to GND on ESP32',
                    'Double-check connections (no short circuits)',
                    'Power on the ESP32 — Serial Monitor should show "💡 LDR Sensor: DETECTED on GPIO 36"',
                    'Return to this app and toggle ON the "LDR Settings" switch',
                    'Watch live lux reading — covering with your hand should drop the value',
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

              {/* Warnings */}
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950/30 dark:border-amber-900">
                <h4 className="mb-1 flex items-center gap-2 font-semibold text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={16} />
                  {language === 'bn' ? 'গুরুত্বপূর্ণ সতর্কতা' : 'Important Warnings'}
                </h4>
                <ul className="text-xs space-y-1 text-amber-700 dark:text-amber-400 pl-5 list-disc">
                  <li>{language === 'bn'
                    ? 'GPIO 36 input-only — কখনো 5V সংযোগ দেবেন না, ESP32 পুড়ে যাবে'
                    : 'GPIO 36 is input-only — never connect 5V, will damage ESP32'}</li>
                  <li>{language === 'bn'
                    ? 'লেয়ার মুরগির ক্ষেত্রে "Sensor only" মোড এড়িয়ে চলুন — ১৪-১৬ ঘণ্টা আলো নিশ্চিত করুন'
                    : 'For layer hens, avoid "Sensor only" mode — must guarantee 14-16h of light'}</li>
                  <li>{language === 'bn'
                    ? 'LDR কে এমন জায়গায় রাখুন যেখানে লাইটের সরাসরি প্রতিফলন না পড়ে (false reading এড়াতে)'
                    : 'Place LDR away from direct light reflection (avoid false readings)'}</li>
                  <li>{language === 'bn'
                    ? 'বাইরের আলো বুঝতে শেডের জানালার কাছে রাখুন'
                    : 'For outdoor light detection, mount near a window'}</li>
                </ul>
              </section>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                {language === 'bn' ? 'গাইড বন্ধ করুন' : 'Close Guide'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
