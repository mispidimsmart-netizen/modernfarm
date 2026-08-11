import { ScrollArea } from '@/components/ui/scroll-area';
import { DocSection, InfoBox, ThresholdTable } from '../DocPrimitives';
import { Zap, Shield, Flame, Fan, Wind, Lightbulb, CloudSun, Droplets, Sun, Moon, Clock, Timer } from 'lucide-react';

const PRIORITY_ITEMS = [
  { num: 1, title: 'Safety (সেফটি)', desc: 'সেন্সর ফেইল, ইমার্জেন্সি', icon: <Shield className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  { num: 2, title: 'Heating (হিটিং)', desc: 'তাপমাত্রা কম হলে হিটার', icon: <Flame className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { num: 3, title: 'Cooling (কুলিং)', desc: 'তাপমাত্রা/HSI বেশি হলে ফ্যান', icon: <Fan className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { num: 4, title: 'Ventilation (ভেন্টিলেশন)', desc: 'অ্যামোনিয়া কন্ট্রোল', icon: <Wind className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  { num: 5, title: 'Lighting (লাইটিং)', desc: 'সময়সূচী অনুযায়ী লাইট', icon: <Lightbulb className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { num: 6, title: 'Advisory (পরামর্শ)', desc: 'পর্দা খোলা/বন্ধ পরামর্শ', icon: <CloudSun className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
];

export function DocAutomationTab() {
  return (
    <ScrollArea className="h-[calc(100vh-380px)] pr-4">
      <div className="space-y-4">
        {/* Automation Priority */}
        <DocSection
          title="⚡ অটোমেশন প্রায়োরিটি অর্ডার"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          defaultOpen={true}
          badge="Core Logic"
          badgeColor="bg-yellow-500"
        >
          <p className="text-slate-300 text-sm mb-4">
            সিস্টেম এই অগ্রাধিকার ক্রমে সিদ্ধান্ত নেয়। উপরের রুল নিচেরগুলোকে ওভাররাইড করে।
          </p>

          <div className="space-y-2">
            {PRIORITY_ITEMS.map((item) => (
              <div key={item.num} className={`flex items-center gap-4 p-3 rounded-xl border ${item.bg}`}>
                <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                  {item.num}
                </span>
                <span className={item.color}>{item.icon}</span>
                <div className="flex-1">
                  <p className={`font-medium ${item.color}`}>{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <InfoBox type="success">
            <strong>ম্যানুয়াল ওভাররাইড:</strong> সার্ভার থেকে আসা ম্যানুয়াল কমান্ড সব অটোমেশনের উপরে প্রাধান্য পায়।
          </InfoBox>
        </DocSection>

        {/* Fan Speed Automation */}
        <DocSection
          title="🌀 ফ্যান স্পিড অটোমেশন"
          icon={<Fan className="w-5 h-5 text-blue-400" />}
        >
          <ThresholdTable data={[
            { label: 'OFF', value: '< 28°C', action: 'ফ্যান বন্ধ', color: 'text-green-400' },
            { label: 'LOW', value: '28-30°C', action: 'ধীরে চালু', color: 'text-yellow-400' },
            { label: 'MEDIUM', value: '30-33°C', action: 'মাঝারি গতি', color: 'text-orange-400' },
            { label: 'HIGH', value: '≥ 33°C', action: 'সর্বোচ্চ গতি', color: 'text-red-400' },
          ]} />

          <InfoBox type="info">
            থ্রেশহোল্ড সেটিংস থেকে কাস্টমাইজ করা যায়।
          </InfoBox>
        </DocSection>

        {/* Heater Control */}
        <DocSection
          title="🔥 হিটার কন্ট্রোল"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          badge="Farm-Type"
          badgeColor="bg-orange-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <h5 className="font-semibold text-orange-400 mb-2">🥚 লেয়ার:</h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• <strong className="text-white">চালু:</strong> &lt;18-20°C</li>
                <li>• <strong className="text-white">বন্ধ:</strong> &gt;24°C</li>
                <li>• <strong className="text-white">সেফটি:</strong> &gt;34°C Force OFF</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
              <h5 className="font-semibold text-blue-400 mb-2">🐔 ব্রয়লার:</h5>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• <strong className="text-white">চালু:</strong> টার্গেট -0.7°C</li>
                <li>• <strong className="text-white">বন্ধ:</strong> টার্গেট +0.7°C</li>
                <li>• <strong className="text-white">সেফটি:</strong> &gt;34°C Force OFF</li>
              </ul>
            </div>
          </div>
        </DocSection>

        {/* Fogger System */}
        <DocSection
          title="💦 ফগার কুলিং সিস্টেম"
          icon={<Droplets className="w-5 h-5 text-blue-400" />}
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 mb-1">চালু শর্ত:</p>
              <p className="text-white font-medium">Temp ≥32°C & Humidity &lt;85%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 mb-1">বন্ধ শর্ত:</p>
              <p className="text-white font-medium">Temp ≤30°C or Humidity ≥90%</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 mb-1">অন টাইম:</p>
              <p className="text-white font-medium">40 সেকেন্ড</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 mb-1">পজ টাইম:</p>
              <p className="text-white font-medium">120 সেকেন্ড</p>
            </div>
          </div>
        </DocSection>

        {/* Ammonia Safety */}
        <DocSection
          title="☁️ অ্যামোনিয়া সেফটি"
          icon={<Wind className="w-5 h-5 text-purple-400" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <h5 className="font-semibold text-orange-400 mb-2">🥚 লেয়ার:</h5>
              <ul className="text-sm space-y-1">
                <li className="text-yellow-400">• 15 ppm → ফ্যান LOW</li>
                <li className="text-red-400">• 25 ppm → ফ্যান HIGH + অ্যালার্ট</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
              <h5 className="font-semibold text-blue-400 mb-2">🐔 ব্রয়লার:</h5>
              <ul className="text-sm space-y-1">
                <li className="text-yellow-400">• 20 ppm → ফ্যান LOW</li>
                <li className="text-red-400">• 30 ppm → ফ্যান HIGH + অ্যালার্ম</li>
              </ul>
            </div>
          </div>

          <InfoBox type="warning">
            MQ-137 সেন্সর প্রথম ২৪ ঘণ্টা প্রিহিটিং প্রয়োজন। এই সময়ে রিডিং সঠিক নাও হতে পারে।
          </InfoBox>
        </DocSection>

        {/* Lighting Schedule */}
        <DocSection
          title="💡 লাইটিং সিডিউল"
          icon={<Lightbulb className="w-5 h-5 text-amber-400" />}
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-800/50 rounded-lg flex items-center gap-3">
              <Sun className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-slate-400">ডিফল্ট শুরু:</p>
                <p className="text-white font-medium">05:00 AM</p>
              </div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg flex items-center gap-3">
              <Moon className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-slate-400">ডিফল্ট শেষ:</p>
                <p className="text-white font-medium">09:00 PM</p>
              </div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-slate-400">মোট সময়:</p>
                <p className="text-white font-medium">16 ঘণ্টা</p>
              </div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg flex items-center gap-3">
              <Timer className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-slate-400">ফেড ইন/আউট:</p>
                <p className="text-white font-medium">30 মিনিট</p>
              </div>
            </div>
          </div>
        </DocSection>
      </div>
    </ScrollArea>
  );
}
