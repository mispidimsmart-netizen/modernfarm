import { ScrollArea } from '@/components/ui/scroll-area';
import { DocSection, InfoBox } from '../DocPrimitives';
import { Shield, Gauge, Thermometer, Wind, Droplets, Power, RefreshCw, Bell, Activity, Database } from 'lucide-react';

const ALERT_TYPES = [
  { type: 'high_temp', label: 'উচ্চ তাপমাত্রা', desc: 'সেট থ্রেশহোল্ডের উপরে', color: 'text-red-400' },
  { type: 'low_temp', label: 'নিম্ন তাপমাত্রা', desc: 'সেট থ্রেশহোল্ডের নিচে', color: 'text-blue-400' },
  { type: 'broiler_cold', label: 'ব্রয়লার ঠান্ডা', desc: 'বয়স-ভিত্তিক টার্গেট থেকে কম', color: 'text-cyan-400' },
  { type: 'broiler_hot', label: 'ব্রয়লার গরম', desc: 'বয়স-ভিত্তিক টার্গেট থেকে বেশি', color: 'text-orange-400' },
  { type: 'high_ammonia', label: 'উচ্চ অ্যামোনিয়া', desc: 'বিপদসীমার উপরে', color: 'text-purple-400' },
  { type: 'water_anomaly', label: 'পানি অস্বাভাবিক', desc: 'বেসলাইন থেকে ২০%+ ড্রপ', color: 'text-teal-400' },
  { type: 'power_outage', label: 'বিদ্যুৎ বিভ্রাট', desc: 'মেইন পাওয়ার অফ', color: 'text-amber-400' },
  { type: 'device_offline', label: 'ডিভাইস অফলাইন', desc: '৫ মিনিট+ কোনো ডেটা নেই', color: 'text-slate-400' },
];

export function DocTechnicalTab() {
  return (
    <ScrollArea className="h-[calc(100vh-380px)] pr-4">
      <div className="space-y-4">
        {/* Fail-Safe System */}
        <DocSection
          title="🛡️ ফেল-সেফ সিস্টেম"
          icon={<Shield className="w-5 h-5 text-emerald-400" />}
          defaultOpen={true}
          badge="Safety Critical"
          badgeColor="bg-emerald-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-xl border border-red-500/30">
              <h5 className="font-semibold text-red-400 mb-3">🔴 সেন্সর ফেইলার</h5>
              <ul className="text-sm space-y-1 text-slate-300">
                <li>• ফ্যান → <strong className="text-white">HIGH</strong></li>
                <li>• অ্যালার্ম → <strong className="text-white">২০সে অন্তর বীপ</strong></li>
              </ul>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/30">
              <h5 className="font-semibold text-blue-400 mb-3">📡 ইন্টারনেট অফলাইন</h5>
              <ul className="text-sm space-y-1 text-slate-300">
                <li>• মোড → <strong className="text-white">লোকাল অটো</strong></li>
                <li>• এসএমএস → <strong className="text-white">সক্রিয়</strong></li>
              </ul>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-xl border border-purple-500/30">
              <h5 className="font-semibold text-purple-400 mb-3">⏱️ ওয়াচডগ</h5>
              <ul className="text-sm space-y-1 text-slate-300">
                <li>• ৮সে হ্যাং → <strong className="text-white">অটো রিস্টার্ট</strong></li>
                <li>• সেটিংস → <strong className="text-white">EEPROM রিকভার</strong></li>
              </ul>
            </div>

            <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-teal-500/5 rounded-xl border border-cyan-500/30">
              <h5 className="font-semibold text-cyan-400 mb-3">💧 পানি ফেইলার</h5>
              <ul className="text-sm space-y-1 text-slate-300">
                <li>• ৬ঘণ্টা → <strong className="text-white">অ্যালার্ম বীপ</strong></li>
                <li>• পুশ → <strong className="text-white">জরুরি নোটিফিকেশন</strong></li>
              </ul>
            </div>
          </div>

          <InfoBox type="success">
            <strong>ম্যানুয়াল ওভাররাইড:</strong> GPIO 32 বাটন ৩সে চেপে ধরুন।
          </InfoBox>
        </DocSection>

        {/* Sensors & Hardware */}
        <DocSection
          title="📊 সেন্সর ও হার্ডওয়্যার"
          icon={<Gauge className="w-5 h-5 text-cyan-400" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-rose-400 flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4" /> DHT22
              </h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• তাপমাত্রা: -40 to 80°C</li>
                <li>• আর্দ্রতা: 0-100%</li>
                <li>• GPIO: <strong>4</strong> (DHT #1), <strong>16/RX2</strong> (DHT #2)</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-purple-400 flex items-center gap-2 mb-2">
                <Wind className="w-4 h-4" /> MQ-137
              </h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• অ্যামোনিয়া: 0-100 ppm</li>
                <li>• প্রিহিটিং: 24 ঘণ্টা</li>
                <li>• GPIO: 34 (ADC)</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-cyan-400 flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4" /> YF-S201
              </h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• পানি: 1-30 L/min</li>
                <li>• GPIO: <strong>18</strong> (Pulse)</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-amber-400 flex items-center gap-2 mb-2">
                <Power className="w-4 h-4" /> ZMPT101B
              </h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• এসি: 0-250V</li>
                <li>• GPIO: 35 (ADC)</li>
              </ul>
            </div>
          </div>

          {/* 8-Channel Relay Map (v8.0 - 2026) */}
          <div className="mt-4 p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-xl border border-emerald-500/30">
            <h5 className="font-semibold text-emerald-400 mb-3">⚡ 8-চ্যানেল রিলে ম্যাপিং (v8.0)</h5>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div>IN1 → GPIO <strong>25</strong> · এক্সহস্ট ফ্যান</div>
              <div>IN2 → GPIO <strong>26</strong> · সিলিং ফ্যান</div>
              <div>IN3 → GPIO <strong>27</strong> · লাইট</div>
              <div>IN4 → GPIO <strong>14</strong> · হিটার</div>
              <div>IN5 → GPIO <strong>12</strong> · ফগার</div>
              <div>IN6 → GPIO <strong>13</strong> · অ্যালার্ম</div>
              <div>IN7 → GPIO <strong>15</strong> · স্প্রিংকলার</div>
              <div>IN8 → GPIO <strong>33</strong> · সার্কুলেশন ফ্যান</div>
            </div>
            <p className="mt-2 text-xs text-amber-300">⚠️ ESP32-WROOM-32 only — WROVER নিষিদ্ধ (PSRAM GPIO 16/17 conflict)</p>
          </div>
        </DocSection>

        {/* Cloud Sync */}
        <DocSection
          title="☁️ ক্লাউড সিঙ্ক"
          icon={<RefreshCw className="w-5 h-5 text-sky-400" />}
        >
          <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
            <h5 className="font-semibold text-white mb-3">সিঙ্ক সাইকেল (প্রতি ৩০সে):</h5>
            <ol className="text-sm text-slate-300 space-y-2">
              <li>1. ESP32 থেকে <strong className="text-emerald-400">সেন্সর ডেটা পাঠানো</strong></li>
              <li>2. Cloud এ <strong className="text-blue-400">sensor_readings সংরক্ষণ</strong></li>
              <li>3. Cloud থেকে <strong className="text-purple-400">পেন্ডিং কমান্ড চেক</strong></li>
              <li>4. ESP32 তে <strong className="text-amber-400">কমান্ড এক্সিকিউট</strong></li>
            </ol>
          </div>

          <InfoBox type="info">
            <strong>অফলাইন বাফার:</strong> ESP32 সর্বোচ্চ ৫০টি রিডিং মেমোরিতে জমা রাখে।
          </InfoBox>
        </DocSection>

        {/* Smart Alerts */}
        <DocSection
          title="🔔 স্মার্ট অ্যালার্ট সিস্টেম"
          icon={<Bell className="w-5 h-5 text-rose-400" />}
        >
          <div className="space-y-3">
            {ALERT_TYPES.map((alert) => (
              <div key={alert.type} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
                <span className={`w-2 h-2 rounded-full ${alert.color.replace('text-', 'bg-')}`} />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${alert.color}`}>{alert.label}</p>
                  <p className="text-xs text-slate-500">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DocSection>

        {/* Troubleshooting */}
        <DocSection
          title="🔧 সমস্যা সমাধান"
          icon={<Activity className="w-5 h-5 text-rose-400" />}
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-white mb-2">❓ ডিভাইস অফলাইন</h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>1. WiFi চেক করুন</li>
                <li>2. ESP32 রিস্টার্ট করুন</li>
                <li>3. ৫ মিনিট অপেক্ষা করুন</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-white mb-2">❓ সেন্সর ভুল রিডিং</h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>1. ক্যালিব্রেশন অফসেট সেট করুন</li>
                <li>2. ওয়্যারিং চেক করুন</li>
                <li>3. MQ-137 ২৪ঘণ্টা প্রিহিট দিন</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-white mb-2">❓ অটোমেশন কাজ করছে না</h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>1. ম্যানুয়াল ওভাররাইড চেক করুন</li>
                <li>2. থ্রেশহোল্ড সেটিংস যাচাই করুন</li>
                <li>3. ডিভাইস মোড AUTO আছে কিনা দেখুন</li>
              </ul>
            </div>
          </div>
        </DocSection>

        {/* API Endpoints */}
        <DocSection
          title="🔗 API এন্ডপয়েন্ট"
          icon={<Database className="w-5 h-5 text-indigo-400" />}
        >
          <div className="space-y-2 text-sm font-mono">
            <div className="p-3 bg-slate-900 rounded-lg">
              <span className="text-emerald-400">POST</span>
              <span className="text-slate-400 ml-2">/functions/v1/esp32-api</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg">
              <span className="text-blue-400">GET</span>
              <span className="text-slate-400 ml-2">/functions/v1/health-score</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg">
              <span className="text-blue-400">GET</span>
              <span className="text-slate-400 ml-2">/functions/v1/heat-risk</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg">
              <span className="text-purple-400">POST</span>
              <span className="text-slate-400 ml-2">/functions/v1/send-push-notification</span>
            </div>
          </div>
        </DocSection>
      </div>
    </ScrollArea>
  );
}
