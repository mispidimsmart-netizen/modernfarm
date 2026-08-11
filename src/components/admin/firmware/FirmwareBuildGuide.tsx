import {
  Upload, HelpCircle, ChevronDown, FileCode, Wrench,
  Settings as SettingsIcon, Download, AlertCircle, Globe,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  t: (bn: string, en: string) => string;
}

export function FirmwareBuildGuide({ t }: Props) {
  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-amber-500/30">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 list-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-white">
                {t('কীভাবে নতুন ফার্মওয়্যার তৈরি ও আপলোড করবেন?', 'How to build & upload new firmware?')}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {t('ধাপে ধাপে গাইড — .bin ফাইল, বোর্ড সেটিংস, পার্টিশন', 'Step-by-step guide — .bin file, board settings, partition')}
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-amber-500/20 p-4 space-y-4">
          {/* Downloadable PDF guide */}
          <a
            href="/ota-firmware-guide-bn.pdf"
            download="OTA-ফার্মওয়্যার-গাইড.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 p-3 hover:bg-emerald-500/20 transition-colors group/dl"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-emerald-400">
                  {t('সম্পূর্ণ গাইড PDF ডাউনলোড করুন', 'Download full PDF guide')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {t(
                    'বাংলায় ৩ পৃষ্ঠার নির্দেশিকা ও প্রথমবার আপলোডের চেকলিস্ট (PDF, ৪০KB)',
                    '3-page Bengali guide with first-time upload checklist (PDF, 40KB)',
                  )}
                </div>
              </div>
            </div>
            <Download className="h-4 w-4 text-emerald-400 shrink-0 transition-transform group-hover/dl:translate-y-0.5" />
          </a>

          {/* Step 1 — Source file */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">১</div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-amber-400" />
                <h4 className="font-semibold text-sm text-white">{t('সোর্স ফাইল খুঁজুন', 'Find the source file')}</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  "প্রজেক্টের public/ ফোল্ডারে ESP32 সোর্স কোড পাওয়া যাবে। অনুমোদিত প্রধান ফাইল:",
                  "ESP32 source code is in the project's public/ folder. Authorized main file:",
                )}
              </p>
              <div className="rounded-md bg-slate-950/60 border border-slate-700 p-2 font-mono text-xs space-y-1 text-slate-300">
                <div>📄 <span className="text-emerald-400 font-semibold">public/esp32-industrial.ino</span> {t('— ✅ অনুমোদিত (v8.2)', '— ✅ Authorized (v8.2)')}</div>
                <div>📄 <span className="text-emerald-400/70">public/esp32-safety-engine.h</span> {t('— সেফটি হেডার', '— safety header')}</div>
                <div className="text-red-400/70">⛔ public/esp32-unified.ino {t('— DISABLED stub, ব্যবহার করবেন না', '— DISABLED stub, do not use')}</div>
                <div className="text-slate-500">📄 public/esp32-failsafe.ino {t('— ফলব্যাক', '— fallback')}</div>
              </div>
            </div>
          </div>

          {/* Step 2 — Compile */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">২</div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-400" />
                <h4 className="font-semibold text-sm text-white">{t('Arduino IDE-তে কম্পাইল করুন', 'Compile in Arduino IDE')}</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  'Arduino IDE 2.x বা PlatformIO খুলে .ino ফাইল লোড করুন। তারপর নিচের মতো সেটিংস বাছাই করুন:',
                  'Open Arduino IDE 2.x or PlatformIO and load the .ino file. Then select these settings:',
                )}
              </p>
              <div className="rounded-md bg-slate-950/60 border border-slate-700 p-3 text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between gap-2"><span className="text-slate-500">{t('বোর্ড', 'Board')}:</span><span className="font-mono font-semibold text-right">ESP32 Dev Module</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">{t('চিপ', 'Chip')}:</span><span className="font-mono font-semibold text-right">ESP32-WROOM-32</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">{t('ফ্ল্যাশ সাইজ', 'Flash Size')}:</span><span className="font-mono font-semibold text-right">4MB (32Mb)</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">{t('আপলোড স্পিড', 'Upload Speed')}:</span><span className="font-mono font-semibold text-right">115200</span></div>
                <div className="flex justify-between gap-2"><span className="text-slate-500">CPU Frequency:</span><span className="font-mono font-semibold text-right">240MHz</span></div>
              </div>
            </div>
          </div>

          {/* Step 3 — Partition Scheme */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৩</div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-amber-400" />
                <h4 className="font-semibold text-sm text-white">
                  {t('পার্টিশন স্কিম (গুরুত্বপূর্ণ!)', 'Partition Scheme (Important!)')}
                </h4>
              </div>
              <div className="rounded-md border-2 border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
                <div className="font-mono font-bold text-emerald-400">
                  Minimal SPIFFS (1.9MB APP with OTA / 190KB SPIFFS)
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 p-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 leading-relaxed">
                  {t(
                    'OTA সাপোর্টের জন্য এই পার্টিশন স্কিম বাধ্যতামূলক। অন্য কিছু বাছাই করলে রিমোট আপডেট কাজ করবে না।',
                    'This partition scheme is mandatory for OTA support. Other choices will break remote updates.',
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 — Export Binary */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৪</div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-amber-400" />
                <h4 className="font-semibold text-sm text-white">{t('.bin ফাইল এক্সপোর্ট করুন', 'Export the .bin file')}</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  'Arduino IDE মেনু থেকে: Sketch → Export Compiled Binary (Ctrl+Alt+S)। এটি .ino ফাইলের পাশে .bin ফাইল তৈরি করবে।',
                  'Arduino IDE menu: Sketch → Export Compiled Binary (Ctrl+Alt+S). This creates a .bin file next to your .ino file.',
                )}
              </p>
              <div className="rounded-md bg-slate-950/60 border border-slate-700 p-2 font-mono text-xs text-slate-300">
                ✅ esp32-industrial.ino.esp32.<span className="text-emerald-400 font-semibold">bin</span>
              </div>
            </div>
          </div>

          {/* Step 5 — Upload (here in this tab) */}
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৫</div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-amber-400" />
                <h4 className="font-semibold text-sm text-white">{t('নিচের ফর্ম থেকে আপলোড করুন', 'Upload using the form below')}</h4>
              </div>
              <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
                <li>{t('ভার্সন: সেমান্টিক ফরম্যাট, যেমন', 'Version: semantic format, e.g.')} <span className="font-mono text-slate-200">v1.2.3</span></li>
                <li>{t('চ্যানেল: প্রথমে', 'Channel: first')} <span className="font-mono text-slate-200">beta</span> {t(', পরে', ', then')} <span className="font-mono text-slate-200">stable</span></li>
                <li>{t('সিস্টেম স্বয়ংক্রিয়ভাবে CRC32 চেকসাম যাচাই করবে', 'System will auto-verify CRC32 checksum')}</li>
                <li>{t('শুধু .bin ফাইল গ্রহণযোগ্য — .ino সরাসরি আপলোড হবে না', 'Only .bin accepted — .ino cannot be uploaded directly')}</li>
              </ul>
            </div>
          </div>

          {/* Reference link */}
          <div className="rounded-md bg-slate-950/60 border border-slate-700 p-3 text-xs flex items-start gap-2">
            <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-slate-400 leading-relaxed">
              {t('বিস্তারিত গাইড: ', 'Detailed guide: ')}
              <a
                href="https://docs.espressif.com/projects/arduino-esp32/en/latest/ota_web_update.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline font-medium"
              >
                Espressif OTA Documentation
              </a>
            </p>
          </div>
        </div>
      </details>
    </Card>
  );
}
