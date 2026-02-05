import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';

interface DocSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
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

const InfoBox = ({ type, children }: { type: 'info' | 'warning' | 'success' | 'danger'; children: React.ReactNode }) => {
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
              FarmEye IoT সিস্টেমের পূর্ণাঙ্গ ডকুমেন্টেশন
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[calc(100vh-300px)] pr-4">
          <div className="space-y-4">
            
            {/* ========== SYSTEM OVERVIEW ========== */}
            <DocSection 
              title="🏠 সিস্টেম ওভারভিউ" 
              icon={<Server className="w-5 h-5 text-indigo-400" />}
              defaultOpen={true}
            >
              <p className="text-slate-300 leading-relaxed">
                FarmEye হলো একটি <strong className="text-white">ক্লাউড-বেসড IoT সিস্টেম</strong> যা বাংলাদেশের পোল্ট্রি খামারিদের জন্য ডিজাইন করা হয়েছে।
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                  <h4 className="font-semibold text-emerald-400 flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4" /> মোবাইল অ্যাপ
                  </h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• রিয়েল-টাইম সেন্সর ডেটা</li>
                    <li>• ফ্যান/লাইট কন্ট্রোল</li>
                    <li>• অ্যালার্ট নোটিফিকেশন</li>
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
              </div>
              
              <InfoBox type="info">
                <strong>আর্কিটেকচার:</strong> ক্লাউড হলো "সুপারভাইজার" এবং ESP32 হলো "লোকাল গার্ডিয়ান"।
              </InfoBox>
            </DocSection>

            {/* ========== FARM TYPES ========== */}
            <DocSection 
              title="🐔 ফার্মের ধরণ (Layer vs Broiler)" 
              icon={<Bird className="w-5 h-5 text-amber-400" />}
              badge="Profile System"
              badgeColor="bg-amber-500"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl border border-orange-500/30">
                  <h4 className="font-semibold text-orange-400 flex items-center gap-2 mb-3">
                    <Egg className="w-5 h-5" /> 🥚 লেয়ার ফার্ম
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">তাপমাত্রা:</span>
                      <span className="text-white font-medium">18-27°C (স্থির)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">HSI:</span>
                      <span className="text-white font-medium">70/75/80/85</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/30">
                  <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
                    <Bird className="w-5 h-5" /> 🐔 ব্রয়লার ফার্ম
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">তাপমাত্রা:</span>
                      <span className="text-white font-medium">বয়স-ভিত্তিক</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">HSI:</span>
                      <span className="text-white font-medium">38/42/45</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                <h5 className="font-semibold text-white mb-3">🐔 ব্রয়লার তাপমাত্রা কার্ভ:</h5>
                <ThresholdTable data={[
                  { label: 'Day 1-3', value: '34°C', action: 'সর্বোচ্চ উষ্ণতা', color: 'text-red-400' },
                  { label: 'Day 4-7', value: '32°C', action: 'প্রথম সপ্তাহ', color: 'text-orange-400' },
                  { label: 'Day 8-14', value: '29°C', action: 'দ্বিতীয় সপ্তাহ', color: 'text-amber-400' },
                  { label: 'Day 15-21', value: '27°C', action: 'তৃতীয় সপ্তাহ', color: 'text-yellow-400' },
                  { label: 'Day 22+', value: '24°C', action: 'বিক্রয় পর্যায়', color: 'text-green-400' },
                ]} />
              </div>
            </DocSection>

            {/* ========== HSI POLICY ========== */}
            <DocSection 
              title="🌡️ Heat Stress Index (HSI) পলিসি" 
              icon={<Thermometer className="w-5 h-5 text-red-400" />}
              badge="Critical"
              badgeColor="bg-red-500"
            >
              <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-400" /> HSI ফর্মুলা (THI)
                </h5>
                <code className="block p-3 bg-slate-900 rounded-lg text-emerald-400 text-sm font-mono">
                  HSI = 0.8 × Temp + (Humidity/100) × (Temp - 14.4) + 46.4
                </code>
              </div>
              
              <h5 className="font-semibold text-white mt-4 mb-3">🥚 লেয়ার HSI:</h5>
              <ThresholdTable data={[
                { label: 'স্বাভাবিক', value: 'HSI < 70', action: 'কোনো অ্যাকশন নেই', color: 'text-green-400' },
                { label: 'হালকা', value: '70-75', action: 'ফ্যান চালু', color: 'text-yellow-400' },
                { label: 'মাঝারি', value: '75-80', action: 'ফ্যান + সতর্কতা', color: 'text-orange-400' },
                { label: 'গুরুতর', value: '80-85', action: 'ফ্যান HIGH + অ্যালার্ট', color: 'text-red-400' },
                { label: 'জরুরি', value: '≥ 85', action: 'সকল ফ্যান MAX', color: 'text-red-500' },
              ]} />
              
              <InfoBox type="warning">
                <strong>গুরুত্বপূর্ণ:</strong> HSI ৮৫+ হলে মুরগির জীবন ঝুঁকিতে। ১৫-২০ মিনিটে ব্যবস্থা নিন।
              </InfoBox>
            </DocSection>

            {/* ========== AUTOMATION ========== */}
            <DocSection 
              title="⚡ অটোমেশন সিস্টেম" 
              icon={<Zap className="w-5 h-5 text-yellow-400" />}
              badge="Core Feature"
              badgeColor="bg-yellow-500"
            >
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                  <h5 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
                    <Fan className="w-4 h-4" /> ফ্যান স্পিড
                  </h5>
                  <ThresholdTable data={[
                    { label: 'OFF', value: '< 28°C', action: 'ফ্যান বন্ধ', color: 'text-green-400' },
                    { label: 'LOW', value: '28-30°C', action: 'ধীরে চালু', color: 'text-yellow-400' },
                    { label: 'MEDIUM', value: '30-33°C', action: 'মাঝারি গতি', color: 'text-orange-400' },
                    { label: 'HIGH', value: '≥ 33°C', action: 'সর্বোচ্চ গতি', color: 'text-red-400' },
                  ]} />
                </div>
                
                <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                  <h5 className="font-semibold text-purple-400 flex items-center gap-2 mb-3">
                    <Wind className="w-4 h-4" /> অ্যামোনিয়া সেফটি
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 mb-2">🥚 লেয়ার:</p>
                      <ul className="space-y-1">
                        <li className="text-yellow-400">• 15 ppm → ফ্যান LOW</li>
                        <li className="text-red-400">• 25 ppm → ফ্যান HIGH</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-2">🐔 ব্রয়লার:</p>
                      <ul className="space-y-1">
                        <li className="text-yellow-400">• 20 ppm → ফ্যান LOW</li>
                        <li className="text-red-400">• 30 ppm → ফ্যান HIGH</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DocSection>

            {/* ========== FAIL-SAFE ========== */}
            <DocSection 
              title="🛡️ ফেল-সেফ সিস্টেম" 
              icon={<Shield className="w-5 h-5 text-emerald-400" />}
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

            {/* ========== SENSORS ========== */}
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
                    <li>• GPIO: 4, 5</li>
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
                    <li>• GPIO: 27 (Interrupt)</li>
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
            </DocSection>

            {/* ========== CLOUD SYNC ========== */}
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

            {/* ========== TROUBLESHOOTING ========== */}
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
              </div>
            </DocSection>

          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}