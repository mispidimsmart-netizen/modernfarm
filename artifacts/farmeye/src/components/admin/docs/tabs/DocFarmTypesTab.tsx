import { ScrollArea } from '@/components/ui/scroll-area';
import { DocSection, InfoBox, ThresholdTable } from '../DocPrimitives';
import { Bird, Egg, TrendingUp, Flame, AlertTriangle, Wind, Thermometer, Target } from 'lucide-react';

export function DocFarmTypesTab() {
  return (
    <ScrollArea className="h-[calc(100vh-380px)] pr-4">
      <div className="space-y-4">
        {/* Layer vs Broiler */}
        <DocSection
          title="🐔 ফার্মের ধরণ (Layer vs Broiler)"
          icon={<Bird className="w-5 h-5 text-amber-400" />}
          defaultOpen={true}
          badge="Auto-Switch"
          badgeColor="bg-amber-500"
        >
          <p className="text-slate-300 text-sm mb-4">
            প্রোফাইল সেটিংস থেকে ফার্ম টাইপ সিলেক্ট করলে সম্পূর্ণ সিস্টেম স্বয়ংক্রিয়ভাবে অ্যাডজাস্ট হয়।
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl border border-orange-500/30">
              <h4 className="font-semibold text-orange-400 flex items-center gap-2 mb-3">
                <Egg className="w-5 h-5" /> 🥚 লেয়ার ফার্ম
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">তাপমাত্রা:</span>
                  <span className="text-white font-medium bg-orange-500/20 px-2 py-1 rounded">18-27°C (স্থির)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">HSI থ্রেশহোল্ড:</span>
                  <span className="text-white font-medium">70 / 75 / 80 / 85</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">অ্যামোনিয়া:</span>
                  <span className="text-white font-medium">15 / 25 ppm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">হিটার:</span>
                  <span className="text-white font-medium">&lt;20°C চালু</span>
                </div>
                <hr className="border-white/10" />
                <p className="text-slate-500 text-xs">📊 ডিম উৎপাদন, গ্রেডিং, লাইটিং কার্ভ</p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/30">
              <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
                <Bird className="w-5 h-5" /> 🐔 ব্রয়লার ফার্ম
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">তাপমাত্রা:</span>
                  <span className="text-white font-medium bg-blue-500/20 px-2 py-1 rounded">বয়স-ভিত্তিক</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">HSI থ্রেশহোল্ড:</span>
                  <span className="text-white font-medium">38 / 42 / 45</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">অ্যামোনিয়া:</span>
                  <span className="text-white font-medium">20 / 30 ppm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">হিটার:</span>
                  <span className="text-white font-medium">বয়স-ভিত্তিক ±0.7°C</span>
                </div>
                <hr className="border-white/10" />
                <p className="text-slate-500 text-xs">📊 ব্যাচ ট্র্যাকিং, FCR, ওজন মনিটরিং</p>
              </div>
            </div>
          </div>
        </DocSection>

        {/* Broiler Temperature Curve */}
        <DocSection
          title="📈 ব্রয়লার তাপমাত্রা কার্ভ"
          icon={<TrendingUp className="w-5 h-5 text-red-400" />}
          badge="Age-Based"
          badgeColor="bg-red-500"
        >
          <InfoBox type="warning">
            <strong>গুরুত্বপূর্ণ:</strong> ব্রয়লারের তাপমাত্রা চাহিদা বয়সের সাথে কমতে থাকে। ভুল তাপমাত্রায় মৃত্যুহার বাড়ে।
          </InfoBox>

          <div className="mt-4">
            <ThresholdTable data={[
              { label: 'Day 1-3', value: '33-34°C', action: 'সর্বোচ্চ উষ্ণতা (ব্রুডিং)', color: 'text-red-400' },
              { label: 'Day 4-7', value: '32°C', action: 'প্রথম সপ্তাহ শেষে', color: 'text-orange-400' },
              { label: 'Day 8-14', value: '30°C', action: 'দ্বিতীয় সপ্তাহ', color: 'text-amber-400' },
              { label: 'Day 15-21', value: '28°C', action: 'তৃতীয় সপ্তাহ', color: 'text-yellow-400' },
              { label: 'Day 22-28', value: '26°C', action: 'চতুর্থ সপ্তাহ', color: 'text-lime-400' },
              { label: 'Day 29-35', value: '24°C', action: 'পঞ্চম সপ্তাহ', color: 'text-green-400' },
              { label: 'Day 36+', value: '22-23°C', action: 'বিক্রয় পর্যায়', color: 'text-emerald-400' },
            ]} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-amber-400 flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4" /> হিটার অন
              </h5>
              <p className="text-sm text-slate-400">
                টার্গেট তাপমাত্রা থেকে <strong className="text-white">-0.7°C</strong> নিচে গেলে হিটার চালু
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <h5 className="font-semibold text-red-400 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> সেফটি কাটঅফ
              </h5>
              <p className="text-sm text-slate-400">
                তাপমাত্রা <strong className="text-white">34°C</strong> পার হলে হিটার Force OFF
              </p>
            </div>
          </div>
        </DocSection>

        {/* Broiler Airflow */}
        <DocSection
          title="💨 ব্রয়লার এয়ারফ্লো গ্রোথ"
          icon={<Wind className="w-5 h-5 text-cyan-400" />}
          badge="Age-Based"
          badgeColor="bg-cyan-500"
        >
          <ThresholdTable data={[
            { label: 'Day 1-9', value: 'বন্ধ', action: 'বাচ্চা মুরগি সংবেদনশীল', color: 'text-slate-400' },
            { label: 'Day 10-20', value: '3min অন্তর 30sec', action: 'হালকা সার্কুলেশন', color: 'text-blue-400' },
            { label: 'Day 21+ (দিন)', value: 'একটানা', action: 'পূর্ণ ভেন্টিলেশন', color: 'text-green-400' },
            { label: 'Day 21+ (রাত)', value: '5min অন্তর 1min', action: 'রাতে কম বাতাস', color: 'text-purple-400' },
          ]} />

          <InfoBox type="info">
            <strong>সার্কুলেশন ফ্যান:</strong> মূল এক্সহস্ট ফ্যানের চেয়ে আলাদা। শেডের ভেতরে বাতাস সার্কুলেট করে।
          </InfoBox>
        </DocSection>

        {/* HSI Comparison */}
        <DocSection
          title="🌡️ HSI থ্রেশহোল্ড তুলনা"
          icon={<Thermometer className="w-5 h-5 text-red-400" />}
          badge="Critical"
          badgeColor="bg-red-500"
        >
          <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10 mb-4">
            <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" /> HSI ফর্মুলা (THI)
            </h5>
            <code className="block p-3 bg-slate-900 rounded-lg text-emerald-400 text-sm font-mono">
              HSI = 0.8 × Temp + (Humidity/100) × (Temp - 14.4) + 46.4
            </code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <h5 className="font-semibold text-orange-400 mb-3">🥚 লেয়ার HSI:</h5>
              <ThresholdTable data={[
                { label: 'স্বাভাবিক', value: 'HSI < 70', action: 'কোনো অ্যাকশন নেই', color: 'text-green-400' },
                { label: 'হালকা', value: '70-75', action: 'ফ্যান চালু', color: 'text-yellow-400' },
                { label: 'মাঝারি', value: '75-80', action: 'ফ্যান + সতর্কতা', color: 'text-orange-400' },
                { label: 'গুরুতর', value: '80-85', action: 'ফ্যান HIGH + অ্যালার্ট', color: 'text-red-400' },
                { label: 'জরুরি', value: '≥ 85', action: 'সকল ফ্যান MAX', color: 'text-red-500' },
              ]} />
            </div>

            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
              <h5 className="font-semibold text-blue-400 mb-3">🐔 ব্রয়লার HSI:</h5>
              <ThresholdTable data={[
                { label: 'স্বাভাবিক', value: 'HSI < 38', action: 'কোনো অ্যাকশন নেই', color: 'text-green-400' },
                { label: 'সতর্কতা', value: '38-42', action: 'ফ্যান HIGH', color: 'text-yellow-400' },
                { label: 'বিপদ', value: '42-45', action: 'ফ্যান MAX + অ্যালার্ম', color: 'text-orange-400' },
                { label: 'জরুরি', value: '≥ 45', action: 'জরুরি মোড', color: 'text-red-500' },
              ]} />
            </div>
          </div>
        </DocSection>
      </div>
    </ScrollArea>
  );
}
