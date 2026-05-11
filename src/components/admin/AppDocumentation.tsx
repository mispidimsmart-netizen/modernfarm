import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrentAutomationStatusBanner } from './CurrentAutomationStatusBanner';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Thermometer,
  Droplets,
  Wind,
  Fan,
  AlertTriangle,
  Zap,
  Cpu,
  Wifi,
  WifiOff,
  Battery,
  Sun,
  Moon,
  Clock,
  Shield,
  Bell,
  Settings,
  Activity,
  TrendingUp,
  Database,
  Smartphone,
  Server,
  RefreshCw,
  Power,
  Lightbulb,
  Gauge,
  Target,
  CheckCircle,
  XCircle,
  Info,
  Egg,
  Bird,
  Users,
  Lock,
  Flame,
  Snowflake,
  CloudSun,
  Timer,
  BarChart3,
  Layers,
} from 'lucide-react';

interface DocSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}

const DocSection = ({ title, icon, children, defaultOpen = false, badge, badgeColor = 'bg-indigo-500' }: DocSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/70 rounded-xl border border-white/10 transition-all">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-white">{title}</span>
            {badge && (
              <Badge className={`${badgeColor} text-white text-xs`}>{badge}</Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-indigo-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-5 bg-slate-900/50 rounded-xl border border-white/5 space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const InfoBox = ({ type, children }: { type: 'info' | 'warning' | 'success' | 'danger'; children: ReactNode }) => {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    danger: 'bg-red-500/10 border-red-500/30 text-red-300',
  };
  
  const icons = {
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    danger: <XCircle className="w-5 h-5" />,
  };
  
  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles[type]}`}>
      {icons[type]}
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
};

const ThresholdTable = ({ data }: { data: { label: string; value: string; action: string; color?: string }[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          <th className="text-left py-2 px-3 text-slate-400 font-medium">মান</th>
          <th className="text-left py-2 px-3 text-slate-400 font-medium">থ্রেশহোল্ড</th>
          <th className="text-left py-2 px-3 text-slate-400 font-medium">অ্যাকশন</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-white/5">
            <td className={`py-2 px-3 font-medium ${row.color || 'text-white'}`}>{row.label}</td>
            <td className="py-2 px-3 text-slate-300">{row.value}</td>
            <td className="py-2 px-3 text-slate-400">{row.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export function AppDocumentation() {
  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-indigo-500/20 shadow-xl">
      <CardHeader className="border-b border-indigo-500/10">
        <CardTitle className="text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
              📖 সম্পূর্ণ অ্যাপ গাইডলাইন
            </span>
            <p className="text-sm text-slate-400 font-normal mt-1">
              FarmEye IoT সিস্টেমের পূর্ণাঙ্গ ডকুমেন্টেশন (v2.0)
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 gap-2 mb-6 bg-slate-800/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="text-xs">🏠 ওভারভিউ</TabsTrigger>
            <TabsTrigger value="farmtypes" className="text-xs">🐔 ফার্ম টাইপ</TabsTrigger>
            <TabsTrigger value="automation" className="text-xs">⚡ অটোমেশন</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">🔧 টেকনিক্যাল</TabsTrigger>
          </TabsList>
          
          {/* ========== OVERVIEW TAB ========== */}
          <TabsContent value="overview">
            <ScrollArea className="h-[calc(100vh-380px)] pr-4">
              <div className="space-y-4">
                
                {/* System Overview */}
                <DocSection 
                  title="🏠 সিস্টেম ওভারভিউ" 
                  icon={<Server className="w-5 h-5 text-indigo-400" />}
                  defaultOpen={true}
                >
                  <p className="text-slate-300 leading-relaxed">
                    FarmEye হলো একটি <strong className="text-white">ক্লাউড-বেসড IoT সিস্টেম</strong> যা বাংলাদেশের পোল্ট্রি খামারিদের জন্য ডিজাইন করা হয়েছে। এটি <strong className="text-orange-400">লেয়ার</strong> এবং <strong className="text-blue-400">ব্রয়লার</strong> উভয় ফার্মের জন্য সম্পূর্ণ স্বয়ংক্রিয় পরিবেশ নিয়ন্ত্রণ প্রদান করে।
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                      <h4 className="font-semibold text-emerald-400 flex items-center gap-2 mb-2">
                        <Smartphone className="w-4 h-4" /> মোবাইল অ্যাপ
                      </h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• রিয়েল-টাইম সেন্সর ডেটা</li>
                        <li>• ডিভাইস কন্ট্রোল</li>
                        <li>• স্মার্ট অ্যালার্ট</li>
                        <li>• ফার্ম ম্যানেজমেন্ট</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                      <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4" /> ESP32 ডিভাইস
                      </h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• সেন্সর ডেটা সংগ্রহ</li>
                        <li>• লোকাল অটোমেশন</li>
                        <li>• ক্লাউড সিঙ্ক</li>
                        <li>• ফেল-সেফ মোড</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                      <h4 className="font-semibold text-purple-400 flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4" /> ক্লাউড ব্যাকএন্ড
                      </h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• ডেটা স্টোরেজ</li>
                        <li>• অ্যানালিটিক্স</li>
                        <li>• পুশ নোটিফিকেশন</li>
                        <li>• OTA আপডেট</li>
                      </ul>
                    </div>
                  </div>
                  
                  <InfoBox type="info">
                    <strong>আর্কিটেকচার:</strong> ক্লাউড হলো "সুপারভাইজার" এবং ESP32 হলো "লোকাল গার্ডিয়ান"।
                  </InfoBox>
                </DocSection>

                {/* RBAC System */}
                <DocSection 
                  title="👥 রোল-বেসড অ্যাক্সেস কন্ট্রোল (RBAC)" 
                  icon={<Users className="w-5 h-5 text-purple-400" />}
                  badge="Security"
                  badgeColor="bg-purple-500"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-slate-500/10 to-gray-500/5 rounded-xl border border-slate-500/30">
                      <h4 className="font-semibold text-slate-300 flex items-center gap-2 mb-3">
                        👁️ Viewer
                      </h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>✅ ড্যাশবোর্ড দেখা</li>
                        <li>✅ অ্যালার্ট দেখা</li>
                        <li>❌ ডিভাইস কন্ট্রোল</li>
                        <li>❌ সেটিংস পরিবর্তন</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/30">
                      <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
                        🧑‍🌾 Farmer
                      </h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>✅ সব কিছু দেখা</li>
                        <li>✅ ডিভাইস কন্ট্রোল (সাময়িক)</li>
                        <li>✅ ফার্ম ডেটা এন্ট্রি</li>
                        <li>❌ অ্যাডভান্সড সেটিংস</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl border border-amber-500/30">
                      <h4 className="font-semibold text-amber-400 flex items-center gap-2 mb-3">
                        👨‍💼 Admin
                      </h4>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>✅ সম্পূর্ণ কন্ট্রোল</li>
                        <li>✅ থ্রেশহোল্ড পরিবর্তন</li>
                        <li>✅ OTA আপডেট</li>
                        <li>✅ ইউজার ম্যানেজমেন্ট</li>
                      </ul>
                    </div>
                  </div>
                  
                  <InfoBox type="warning">
                    <strong>সুপার অ্যাডমিন:</strong> সকল ফার্মের ডেটা দেখতে এবং সিস্টেম-ওয়াইড নোটিফিকেশন পাঠাতে পারেন।
                  </InfoBox>
                </DocSection>

                {/* Multi-Shed System */}
                <DocSection 
                  title="🏭 মাল্টি-শেড সিস্টেম" 
                  icon={<Layers className="w-5 h-5 text-cyan-400" />}
                  badge="Scalable"
                  badgeColor="bg-cyan-500"
                >
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                    <h5 className="font-semibold text-white mb-3">Big Farm Design Rules:</h5>
                    <ul className="text-sm text-slate-300 space-y-2">
                      <li>• প্রতিটি শেড → <strong className="text-emerald-400">স্বাধীন ফেল-সেফ ইউনিট</strong></li>
                      <li>• একটি শেড ফেইল হলে → <strong className="text-blue-400">অন্য শেড প্রভাবিত হবে না</strong></li>
                      <li>• প্রতি শেডে → <strong className="text-purple-400">আলাদা ESP32 + সেন্সর</strong></li>
                      <li>• সেন্ট্রাল ড্যাশবোর্ড → <strong className="text-amber-400">সব শেড একসাথে মনিটর</strong></li>
                    </ul>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-center">
                      <p className="text-2xl font-bold text-emerald-400">∞</p>
                      <p className="text-xs text-slate-400">শেড সাপোর্ট</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 text-center">
                      <p className="text-2xl font-bold text-blue-400">1:1</p>
                      <p className="text-xs text-slate-400">শেড:ডিভাইস</p>
                    </div>
                  </div>
                </DocSection>

              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* ========== FARM TYPES TAB ========== */}
          <TabsContent value="farmtypes">
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
          </TabsContent>
          
          {/* ========== AUTOMATION TAB ========== */}
          <TabsContent value="automation">
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
                    {[
                      { num: 1, title: 'Safety (সেফটি)', desc: 'সেন্সর ফেইল, ইমার্জেন্সি', icon: <Shield className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
                      { num: 2, title: 'Heating (হিটিং)', desc: 'তাপমাত্রা কম হলে হিটার', icon: <Flame className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
                      { num: 3, title: 'Cooling (কুলিং)', desc: 'তাপমাত্রা/HSI বেশি হলে ফ্যান', icon: <Fan className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
                      { num: 4, title: 'Ventilation (ভেন্টিলেশন)', desc: 'অ্যামোনিয়া কন্ট্রোল', icon: <Wind className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
                      { num: 5, title: 'Lighting (লাইটিং)', desc: 'সময়সূচী অনুযায়ী লাইট', icon: <Lightbulb className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
                      { num: 6, title: 'Advisory (পরামর্শ)', desc: 'পর্দা খোলা/বন্ধ পরামর্শ', icon: <CloudSun className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
                    ].map((item) => (
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
          </TabsContent>
          
          {/* ========== TECHNICAL TAB ========== */}
          <TabsContent value="technical">
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
                    {[
                      { type: 'high_temp', label: 'উচ্চ তাপমাত্রা', desc: 'সেট থ্রেশহোল্ডের উপরে', color: 'text-red-400' },
                      { type: 'low_temp', label: 'নিম্ন তাপমাত্রা', desc: 'সেট থ্রেশহোল্ডের নিচে', color: 'text-blue-400' },
                      { type: 'broiler_cold', label: 'ব্রয়লার ঠান্ডা', desc: 'বয়স-ভিত্তিক টার্গেট থেকে কম', color: 'text-cyan-400' },
                      { type: 'broiler_hot', label: 'ব্রয়লার গরম', desc: 'বয়স-ভিত্তিক টার্গেট থেকে বেশি', color: 'text-orange-400' },
                      { type: 'high_ammonia', label: 'উচ্চ অ্যামোনিয়া', desc: 'বিপদসীমার উপরে', color: 'text-purple-400' },
                      { type: 'water_anomaly', label: 'পানি অস্বাভাবিক', desc: 'বেসলাইন থেকে ২০%+ ড্রপ', color: 'text-teal-400' },
                      { type: 'power_outage', label: 'বিদ্যুৎ বিভ্রাট', desc: 'মেইন পাওয়ার অফ', color: 'text-amber-400' },
                      { type: 'device_offline', label: 'ডিভাইস অফলাইন', desc: '৫ মিনিট+ কোনো ডেটা নেই', color: 'text-slate-400' },
                    ].map((alert) => (
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
          </TabsContent>
        </Tabs>
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400">
            A <span className="text-indigo-300 font-semibold">Nexiot Labs</span> Product
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            © 2026 Nexiot Labs · FarmEye Automation Platform
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
