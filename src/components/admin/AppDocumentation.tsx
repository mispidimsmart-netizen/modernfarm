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
 
 const DocSection = ({ title, icon, children, defaultOpen = false, badge, badgeColor = 'bg-blue-500' }: DocSectionProps) => {
   const [isOpen, setIsOpen] = useState(defaultOpen);
   
   return (
     <Collapsible open={isOpen} onOpenChange={setIsOpen}>
       <CollapsibleTrigger className="w-full">
         <div className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/70 rounded-xl border border-white/10 transition-all">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
               {icon}
             </div>
             <span className="text-lg font-semibold text-white">{title}</span>
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
                 এটি ESP32 মাইক্রোকন্ট্রোলার ব্যবহার করে রিয়েল-টাইম মনিটরিং এবং অটোমেটেড কন্ট্রোল প্রদান করে।
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h4 className="font-semibold text-emerald-400 flex items-center gap-2 mb-2">
                     <Smartphone className="w-4 h-4" /> মোবাইল অ্যাপ
                   </h4>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>• রিয়েল-টাইম সেন্সর ডেটা দেখা</li>
                     <li>• ফ্যান/লাইট ম্যানুয়াল কন্ট্রোল</li>
                     <li>• অ্যালার্ট ও নোটিফিকেশন পাওয়া</li>
                     <li>• ফার্ম ম্যানেজমেন্ট (ডিম, ফিড, মৃত্যু)</li>
                     <li>• রিপোর্ট ও অ্যানালিটিক্স</li>
                   </ul>
                 </div>
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-2">
                     <Cpu className="w-4 h-4" /> ESP32 ডিভাইস
                   </h4>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>• সেন্সর ডেটা সংগ্রহ</li>
                     <li>• লোকাল অটোমেশন এক্সিকিউশন</li>
                     <li>• ক্লাউড সিঙ্ক (৩০ সেকেন্ড)</li>
                     <li>• ফেল-সেফ মোড পরিচালনা</li>
                     <li>• GSM এসএমএস অ্যালার্ট (অফলাইনে)</li>
                   </ul>
                 </div>
               </div>
               
               <InfoBox type="info">
                 <strong>আর্কিটেকচার:</strong> ক্লাউড হলো "সুপারভাইজার" এবং ESP32 হলো "লোকাল গার্ডিয়ান"। 
                 ইন্টারনেট না থাকলেও ESP32 স্বয়ংক্রিয়ভাবে খামার সুরক্ষিত রাখে।
               </InfoBox>
             </DocSection>
 
             {/* ========== FARM TYPES ========== */}
             <DocSection 
               title="🐔 ফার্মের ধরণ (Layer vs Broiler)" 
               icon={<Bird className="w-5 h-5 text-amber-400" />}
               badge="Profile System"
               badgeColor="bg-amber-500"
             >
               <p className="text-slate-300 leading-relaxed">
                 সিস্টেমটি দুই ধরণের ফার্ম সাপোর্ট করে এবং প্রতিটির জন্য সম্পূর্ণ আলাদা অটোমেশন রুলস প্রয়োগ করে।
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 {/* Layer */}
                 <div className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl border border-orange-500/30">
                   <h4 className="font-semibold text-orange-400 flex items-center gap-2 mb-3">
                     <Egg className="w-5 h-5" /> 🥚 লেয়ার ফার্ম
                   </h4>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between">
                       <span className="text-slate-400">আইডিয়াল তাপমাত্রা:</span>
                       <span className="text-white font-medium">18-27°C (স্থির)</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-400">HSI থ্রেশহোল্ড:</span>
                       <span className="text-white font-medium">70/75/80/85</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-400">অ্যামোনিয়া সীমা:</span>
                       <span className="text-white font-medium">15/25 ppm</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-400">লাইটিং প্রোটেকশন:</span>
                       <span className="text-emerald-400 font-medium">✓ সক্রিয়</span>
                     </div>
                   </div>
                 </div>
                 
                 {/* Broiler */}
                 <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/30">
                   <h4 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
                     <Bird className="w-5 h-5" /> 🐔 ব্রয়লার ফার্ম
                   </h4>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between">
                       <span className="text-slate-400">তাপমাত্রা:</span>
                       <span className="text-white font-medium">বয়স-ভিত্তিক কার্ভ</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-400">HSI থ্রেশহোল্ড:</span>
                       <span className="text-white font-medium">38/42/45</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-400">অ্যামোনিয়া সীমা:</span>
                       <span className="text-white font-medium">20/30 ppm</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-400">হিটার সাপোর্ট:</span>
                       <span className="text-emerald-400 font-medium">✓ সক্রিয়</span>
                     </div>
                   </div>
                 </div>
               </div>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">🐔 ব্রয়লার বয়স-ভিত্তিক তাপমাত্রা কার্ভ:</h5>
                 <ThresholdTable data={[
                   { label: 'Day 1-3', value: '34°C (32-35°C)', action: 'সর্বোচ্চ উষ্ণতা', color: 'text-red-400' },
                   { label: 'Day 4-7', value: '32°C (30-33°C)', action: 'প্রথম সপ্তাহ', color: 'text-orange-400' },
                   { label: 'Day 8-14', value: '29°C (27-30°C)', action: 'দ্বিতীয় সপ্তাহ', color: 'text-amber-400' },
                   { label: 'Day 15-21', value: '27°C (25-28°C)', action: 'তৃতীয় সপ্তাহ', color: 'text-yellow-400' },
                   { label: 'Day 22-28', value: '25°C (23-27°C)', action: 'চতুর্থ সপ্তাহ', color: 'text-lime-400' },
                   { label: 'Day 29-35', value: '24°C (22-26°C)', action: 'পঞ্চম সপ্তাহ', color: 'text-green-400' },
                   { label: 'Day 36+', value: '23°C (21-25°C)', action: 'বিক্রয় পর্যায়', color: 'text-emerald-400' },
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
               <p className="text-slate-300 leading-relaxed">
                 HSI হলো তাপমাত্রা ও আর্দ্রতার সমন্বয়ে গণনা করা একটি সূচক যা মুরগির তাপ চাপের মাত্রা নির্দেশ করে।
               </p>
               
               <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10 mt-4">
                 <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
                   <Target className="w-4 h-4 text-blue-400" /> HSI গণনার ফর্মুলা (THI)
                 </h5>
                 <code className="block p-3 bg-slate-900 rounded-lg text-emerald-400 text-sm font-mono">
                   HSI = 0.8 × Temperature + (Humidity/100) × (Temperature - 14.4) + 46.4
                 </code>
                 <p className="text-slate-400 text-sm mt-2">
                   উদাহরণ: 32°C তাপমাত্রা + 80% আর্দ্রতা = HSI 77.5 (মাঝারি চাপ)
                 </p>
               </div>
               
               <h5 className="font-semibold text-white mt-4 mb-3">🥚 লেয়ার HSI থ্রেশহোল্ড:</h5>
               <ThresholdTable data={[
                 { label: 'স্বাভাবিক', value: 'HSI < 70', action: 'কোনো অ্যাকশন নেই', color: 'text-green-400' },
                 { label: 'হালকা চাপ', value: 'HSI 70-75', action: '🌀 ফ্যান চালু', color: 'text-yellow-400' },
                 { label: 'মাঝারি চাপ', value: 'HSI 75-80', action: '🌀 ফ্যান + ⚠️ সতর্কতা', color: 'text-orange-400' },
                 { label: 'গুরুতর চাপ', value: 'HSI 80-85', action: '🌀 ফ্যান HIGH + 🔴 অ্যালার্ট', color: 'text-red-400' },
                 { label: 'জরুরি অবস্থা', value: 'HSI ≥ 85', action: '🚨 সকল ফ্যান MAX + জরুরি বিপদ সংকেত', color: 'text-red-500' },
               ]} />
               
               <h5 className="font-semibold text-white mt-4 mb-3">🐔 ব্রয়লার HSI থ্রেশহোল্ড:</h5>
               <ThresholdTable data={[
                 { label: 'স্বাভাবিক', value: 'HSI < 38', action: 'কোনো অ্যাকশন নেই', color: 'text-green-400' },
                 { label: 'ফ্যান HIGH', value: 'HSI ≥ 38', action: '🌀 ফ্যান HIGH স্পিড', color: 'text-yellow-400' },
                 { label: 'অ্যালার্ম', value: 'HSI ≥ 42', action: '🌀 ফ্যান MAX + 🔔 অ্যালার্ম বীপ', color: 'text-orange-400' },
                 { label: 'জরুরি', value: 'HSI ≥ 45', action: '🚨 ক্রমাগত অ্যালার্ম + জরুরি নোটিফিকেশন', color: 'text-red-500' },
               ]} />
               
               <InfoBox type="warning">
                 <strong>গুরুত্বপূর্ণ:</strong> HSI ৮৫ এর বেশি (লেয়ার) বা ৪৫ এর বেশি (ব্রয়লার) হলে মুরগির জীবন ঝুঁকিতে। 
                 ১৫-২০ মিনিটের মধ্যে ব্যবস্থা না নিলে বড় ক্ষতি হতে পারে।
               </InfoBox>
             </DocSection>
 
             {/* ========== AUTOMATION SYSTEM ========== */}
             <DocSection 
               title="⚡ অটোমেশন সিস্টেম" 
               icon={<Zap className="w-5 h-5 text-yellow-400" />}
               badge="Core Feature"
               badgeColor="bg-yellow-500"
             >
               <p className="text-slate-300 leading-relaxed">
                 অটোমেশন সিস্টেমটি <strong className="text-white">ESP32-তে লোকালি</strong> চলে, তাই ইন্টারনেট না থাকলেও কাজ করে।
               </p>
               
               <div className="space-y-4 mt-4">
                 {/* Fan Speed Automation */}
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
                     <Fan className="w-4 h-4" /> ফ্যান স্পিড অটোমেশন
                   </h5>
                   <ThresholdTable data={[
                     { label: 'OFF', value: '< 28°C', action: 'ফ্যান বন্ধ', color: 'text-green-400' },
                     { label: 'LOW', value: '28-30°C', action: 'ধীরে ফ্যান চালু', color: 'text-yellow-400' },
                     { label: 'MEDIUM', value: '30-33°C', action: 'মাঝারি গতি', color: 'text-orange-400' },
                     { label: 'HIGH', value: '≥ 33°C', action: 'সর্বোচ্চ গতি', color: 'text-red-400' },
                   ]} />
                 </div>
                 
                 {/* Ammonia Safety */}
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-purple-400 flex items-center gap-2 mb-3">
                     <Wind className="w-4 h-4" /> অ্যামোনিয়া সেফটি
                   </h5>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                       <p className="text-slate-400 mb-2">🥚 লেয়ার:</p>
                       <ul className="space-y-1">
                         <li className="text-yellow-400">• 15 ppm → ফ্যান LOW</li>
                         <li className="text-red-400">• 25 ppm → ফ্যান HIGH + অ্যালার্ট</li>
                       </ul>
                     </div>
                     <div>
                       <p className="text-slate-400 mb-2">🐔 ব্রয়লার:</p>
                       <ul className="space-y-1">
                         <li className="text-yellow-400">• 20 ppm → ফ্যান LOW</li>
                         <li className="text-red-400">• 30 ppm → ফ্যান HIGH + অ্যালার্ট</li>
                       </ul>
                     </div>
                   </div>
                 </div>
                 
                 {/* Broiler Heater */}
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-orange-400 flex items-center gap-2 mb-3">
                     <Zap className="w-4 h-4" /> ব্রয়লার হিটার কন্ট্রোল
                   </h5>
                   <p className="text-slate-400 text-sm mb-2">
                     টার্গেট তাপমাত্রার চেয়ে কম হলে হিটার চালু হয়:
                   </p>
                   <ul className="text-sm space-y-1">
                     <li className="text-blue-400">• -2°C deviation → হিটার ON</li>
                     <li className="text-green-400">• টার্গেটে পৌঁছালে → হিটার OFF</li>
                   </ul>
                 </div>
                 
                 {/* Smart Lighting */}
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-amber-400 flex items-center gap-2 mb-3">
                     <Lightbulb className="w-4 h-4" /> স্মার্ট লাইটিং কার্ভ
                   </h5>
                   <p className="text-slate-400 text-sm mb-2">
                     লেয়ার ফার্মে ধীরে ধীরে আলো বাড়ানো/কমানো (মুরগির চাপ কমাতে):
                   </p>
                   <ul className="text-sm space-y-1">
                     <li className="text-amber-400">• Fade-in: সকাল ৫:০০ থেকে ৩০ মিনিটে 0% → 100%</li>
                     <li className="text-indigo-400">• Fade-out: রাত ৮:০০ থেকে ৩০ মিনিটে 100% → 0%</li>
                   </ul>
                 </div>
               </div>
             </DocSection>
 
             {/* ========== FAIL-SAFE SYSTEM ========== */}
             <DocSection 
               title="🛡️ ফেল-সেফ সিস্টেম" 
               icon={<Shield className="w-5 h-5 text-emerald-400" />}
               badge="Safety Critical"
               badgeColor="bg-emerald-500"
             >
               <p className="text-slate-300 leading-relaxed">
                 ফেল-সেফ সিস্টেম <strong className="text-white">প্রোফাইল নির্বিশেষে</strong> সবসময় সক্রিয় থাকে এবং যেকোনো সমস্যায় খামার সুরক্ষিত রাখে।
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/5 rounded-xl border border-red-500/30">
                   <h5 className="font-semibold text-red-400 mb-3">🔴 সেন্সর ফেইলার</h5>
                   <p className="text-slate-400 text-sm">
                     ১৫ সেকেন্ড সেন্সর ডেটা না পেলে:
                   </p>
                   <ul className="text-sm mt-2 space-y-1 text-slate-300">
                     <li>• ফ্যান → <strong className="text-white">HIGH স্পিড</strong></li>
                     <li>• অ্যালার্ম → <strong className="text-white">২০ সেকেন্ড অন্তর বীপ</strong></li>
                   </ul>
                 </div>
                 
                 <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/30">
                   <h5 className="font-semibold text-blue-400 mb-3">📡 ইন্টারনেট অফলাইন</h5>
                   <p className="text-slate-400 text-sm">
                     ৫ মিনিট ক্লাউড সিঙ্ক না হলে:
                   </p>
                   <ul className="text-sm mt-2 space-y-1 text-slate-300">
                     <li>• মোড → <strong className="text-white">লোকাল অটো</strong></li>
                     <li>• রিমোট কমান্ড → <strong className="text-white">ইগনোর</strong></li>
                     <li>• এসএমএস অ্যালার্ট → <strong className="text-white">সক্রিয়</strong></li>
                   </ul>
                 </div>
                 
                 <div className="p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-xl border border-purple-500/30">
                   <h5 className="font-semibold text-purple-400 mb-3">⏱️ ওয়াচডগ রিস্টার্ট</h5>
                   <p className="text-slate-400 text-sm">
                     ৮ সেকেন্ড সিস্টেম হ্যাং হলে:
                   </p>
                   <ul className="text-sm mt-2 space-y-1 text-slate-300">
                     <li>• হার্ডওয়্যার রিস্টার্ট → <strong className="text-white">অটোমেটিক</strong></li>
                     <li>• সেটিংস → <strong className="text-white">EEPROM থেকে রিকভার</strong></li>
                   </ul>
                 </div>
                 
                 <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-teal-500/5 rounded-xl border border-cyan-500/30">
                   <h5 className="font-semibold text-cyan-400 mb-3">💧 পানি ফেইলার</h5>
                   <p className="text-slate-400 text-sm">
                     ৬ ঘণ্টা পানি প্রবাহ না থাকলে:
                   </p>
                   <ul className="text-sm mt-2 space-y-1 text-slate-300">
                     <li>• অ্যালার্ম → <strong className="text-white">ইন্টারমিটেন্ট বীপ</strong></li>
                     <li>• পুশ নোটিফিকেশন → <strong className="text-white">জরুরি</strong></li>
                   </ul>
                 </div>
               </div>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-amber-400 mb-3">💡 লাইটিং প্রোটেকশন (শুধু লেয়ার)</h5>
                 <p className="text-slate-400 text-sm">
                   দিনের বেলায় (৫:০০-২০:০০) লাইট ১০ মিনিটের বেশি বন্ধ থাকলে অ্যালার্ম বীপ।
                   কারণ: আলো বন্ধ থাকলে লেয়ারের ডিম উৎপাদন কমে যায়।
                 </p>
               </div>
               
               <InfoBox type="success">
                 <strong>ম্যানুয়াল ওভাররাইড:</strong> GPIO 32-তে থাকা ফিজিক্যাল বাটন ৩ সেকেন্ড চেপে ধরলে 
                 সকল অটোমেশন বন্ধ হয়ে ম্যানুয়াল কন্ট্রোল সক্রিয় হয়।
               </InfoBox>
             </DocSection>
 
             {/* ========== POWER MANAGEMENT ========== */}
             <DocSection 
               title="🔋 পাওয়ার ম্যানেজমেন্ট" 
               icon={<Battery className="w-5 h-5 text-green-400" />}
             >
               <p className="text-slate-300 leading-relaxed">
                 বিদ্যুৎ বিভ্রাটেও সিস্টেম সচল রাখতে ব্যাটারি ব্যাকআপ সিস্টেম।
               </p>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">ব্যাটারি স্ট্যাটাস ও অ্যাকশন:</h5>
                 <ThresholdTable data={[
                   { label: 'পূর্ণ', value: '৮০% এর উপরে', action: 'সব ডিভাইস সক্রিয়', color: 'text-green-400' },
                   { label: 'মাঝারি', value: '৪০-৮০%', action: 'স্বাভাবিক অপারেশন', color: 'text-yellow-400' },
                   { label: 'কম', value: '২০-৪০%', action: 'ব্যাটারি সতর্কতা', color: 'text-orange-400' },
                   { label: 'সংকট', value: '২০% এর নিচে', action: '🚨 জরুরি মোড + শুধু ফ্যান', color: 'text-red-400' },
                 ]} />
               </div>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">পাওয়ার আউটেজ হ্যান্ডলিং:</h5>
                 <ol className="text-sm text-slate-300 space-y-2">
                   <li>1. বিদ্যুৎ গেলে → <strong className="text-white">ব্যাটারি সুইচওভার (১ সেকেন্ডের কম)</strong></li>
                   <li>2. ক্লাউডে → <strong className="text-white">পাওয়ার আউটেজ লগ</strong></li>
                   <li>3. ৩০ মিনিট পরে → <strong className="text-white">ক্রিটিকাল অ্যালার্ট পুশ</strong></li>
                   <li>4. বিদ্যুৎ ফিরলে → <strong className="text-white">২০ সেকেন্ড Air Refresh (ফ্যান ON)</strong></li>
                 </ol>
               </div>
             </DocSection>
 
             {/* ========== ALERT SYSTEM ========== */}
             <DocSection 
               title="🔔 অ্যালার্ট সিস্টেম" 
               icon={<Bell className="w-5 h-5 text-rose-400" />}
             >
               <p className="text-slate-300 leading-relaxed">
                 দ্বৈত অ্যালার্ট সিস্টেম: অনলাইনে পুশ নোটিফিকেশন, অফলাইনে এসএমএস।
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
                     <Wifi className="w-4 h-4" /> অনলাইন অ্যালার্ট
                   </h5>
                   <ul className="text-sm text-slate-300 space-y-1">
                     <li>• পুশ নোটিফিকেশন (মোবাইলে)</li>
                     <li>• ইন-অ্যাপ অ্যালার্ট</li>
                     <li>• ইমেইল (ঐচ্ছিক)</li>
                   </ul>
                 </div>
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-orange-400 flex items-center gap-2 mb-3">
                     <WifiOff className="w-4 h-4" /> অফলাইন অ্যালার্ট
                   </h5>
                   <ul className="text-sm text-slate-300 space-y-1">
                     <li>• SIM800L এসএমএস</li>
                     <li>• লোকাল পিজো বাজার</li>
                     <li>• LED ইন্ডিকেটর</li>
                   </ul>
                 </div>
               </div>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">অ্যালার্ট সেভারিটি:</h5>
                 <ThresholdTable data={[
                   { label: '🟢 Info', value: 'তথ্যমূলক', action: 'শুধু ইন-অ্যাপ', color: 'text-blue-400' },
                   { label: '🟡 Warning', value: 'সতর্কতা', action: 'পুশ নোটিফিকেশন', color: 'text-yellow-400' },
                   { label: '🔴 Danger', value: 'বিপদ', action: 'পুশ + সাউন্ড + এসএমএস', color: 'text-red-400' },
                 ]} />
               </div>
               
               <InfoBox type="info">
                 <strong>কুলডাউন:</strong> একই ধরণের অ্যালার্ট ৫ মিনিটের মধ্যে পুনরায় পাঠানো হয় না 
                 (স্প্যাম এড়াতে)।
               </InfoBox>
             </DocSection>
 
             {/* ========== SENSORS ========== */}
             <DocSection 
               title="📊 সেন্সর ও হার্ডওয়্যার" 
               icon={<Gauge className="w-5 h-5 text-cyan-400" />}
             >
               <p className="text-slate-300 leading-relaxed">
                 সিস্টেমে ব্যবহৃত সেন্সর এবং তাদের স্পেসিফিকেশন।
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-rose-400 flex items-center gap-2 mb-2">
                     <Thermometer className="w-4 h-4" /> DHT22 (x2)
                   </h5>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>• তাপমাত্রা: -40 to 80°C (±0.5°C)</li>
                     <li>• আর্দ্রতা: 0-100% (±2%)</li>
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
                     <li>• পানি প্রবাহ: 1-30 L/min</li>
                     <li>• পালস ফ্রিকোয়েন্সি: 7.5 Hz/L</li>
                     <li>• GPIO: 27 (Interrupt)</li>
                   </ul>
                 </div>
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-amber-400 flex items-center gap-2 mb-2">
                     <Power className="w-4 h-4" /> ZMPT101B
                   </h5>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>• এসি ভোল্টেজ: 0-250V</li>
                     <li>• পাওয়ার ডিটেকশন</li>
                     <li>• GPIO: 35 (ADC)</li>
                   </ul>
                 </div>
               </div>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">আউটপুট ডিভাইস:</h5>
                 <div className="grid grid-cols-3 gap-4 text-sm text-center">
                   <div className="p-3 bg-slate-900/50 rounded-lg">
                     <Fan className="w-6 h-6 mx-auto text-blue-400 mb-1" />
                     <p className="text-slate-300">৪-চ্যানেল রিলে</p>
                     <p className="text-slate-500 text-xs">ফ্যান কন্ট্রোল</p>
                   </div>
                   <div className="p-3 bg-slate-900/50 rounded-lg">
                     <Lightbulb className="w-6 h-6 mx-auto text-amber-400 mb-1" />
                     <p className="text-slate-300">PWM ডিমার</p>
                     <p className="text-slate-500 text-xs">GPIO 25</p>
                   </div>
                   <div className="p-3 bg-slate-900/50 rounded-lg">
                     <Bell className="w-6 h-6 mx-auto text-rose-400 mb-1" />
                     <p className="text-slate-300">পিজো বাজার</p>
                     <p className="text-slate-500 text-xs">GPIO 26</p>
                   </div>
                 </div>
               </div>
             </DocSection>
 
             {/* ========== CLOUD SYNC ========== */}
             <DocSection 
               title="☁️ ক্লাউড সিঙ্ক" 
               icon={<RefreshCw className="w-5 h-5 text-sky-400" />}
             >
               <p className="text-slate-300 leading-relaxed">
                 ESP32 প্রতি ৩০ সেকেন্ড ক্লাউডে ডেটা পাঠায় এবং কমান্ড গ্রহণ করে।
               </p>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">সিঙ্ক সাইকেল:</h5>
                 <ol className="text-sm text-slate-300 space-y-2">
                   <li>1. ESP32 থেকে <strong className="text-emerald-400">সেন্সর ডেটা পাঠানো হয়</strong> (temp, humidity, ammonia, water)</li>
                   <li>2. Cloud এ <strong className="text-blue-400">sensor_readings টেবিলে সংরক্ষণ</strong></li>
                   <li>3. Cloud থেকে <strong className="text-purple-400">পেন্ডিং কমান্ড চেক</strong> (device_commands)</li>
                   <li>4. ESP32 তে <strong className="text-amber-400">কমান্ড গ্রহণ ও এক্সিকিউট</strong></li>
                   <li>5. ESP32 থেকে <strong className="text-rose-400">device_health আপডেট</strong></li>
                 </ol>
               </div>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">API এন্ডপয়েন্ট:</h5>
                 <code className="block p-3 bg-slate-900 rounded-lg text-emerald-400 text-sm font-mono">
                   POST /esp32-api/sync
                   POST /esp32-api/set-farm-profile
                   POST /esp32-api/update-age
                 </code>
               </div>
               
               <InfoBox type="info">
                 <strong>অফলাইন বাফার:</strong> ইন্টারনেট না থাকলে ESP32 সর্বোচ্চ ৫০টি সেন্সর রিডিং 
                 মেমোরিতে জমা রাখে এবং কানেকশন ফিরলে আপলোড করে।
               </InfoBox>
             </DocSection>
 
             {/* ========== DATA STORAGE ========== */}
             <DocSection 
               title="💾 ডেটা স্টোরেজ" 
               icon={<Database className="w-5 h-5 text-violet-400" />}
             >
               <p className="text-slate-300 leading-relaxed">
                 সকল ডেটা Supabase (PostgreSQL) ক্লাউড ডেটাবেসে সংরক্ষিত।
               </p>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">প্রধান টেবিল:</h5>
                 <div className="grid grid-cols-2 gap-2 text-sm">
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">sensor_readings</div>
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">device_status</div>
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">device_health</div>
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">alerts</div>
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">egg_production</div>
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">feed_consumption</div>
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">mortality_records</div>
                   <div className="p-2 bg-slate-900/50 rounded text-slate-300">broiler_batches</div>
                 </div>
               </div>
               
               <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                 <h5 className="font-semibold text-white mb-3">ESP32 EEPROM স্টোরেজ:</h5>
                 <ul className="text-sm text-slate-300 space-y-1">
                   <li>• <strong>FarmConfig:</strong> farmType, chickAgeDays, tempOffset, nh3Offset</li>
                   <li>• <strong>Magic Number:</strong> 0x46524D43 (ডেটা ভ্যালিডেশন)</li>
                   <li>• <strong>সাইজ:</strong> ~64 বাইট</li>
                 </ul>
               </div>
             </DocSection>
 
             {/* ========== SMART MODES ========== */}
             <DocSection 
               title="🎛️ স্মার্ট মোড প্রোফাইল" 
               icon={<Settings className="w-5 h-5 text-teal-400" />}
             >
               <p className="text-slate-300 leading-relaxed">
                 এক ক্লিকে সব থ্রেশহোল্ড পরিবর্তনের জন্য প্রিসেট প্রোফাইল।
               </p>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                 <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl border border-amber-500/30 text-center">
                   <Sun className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                   <h5 className="font-semibold text-amber-400">গ্রীষ্ম</h5>
                   <p className="text-xs text-slate-400 mt-1">তাপমাত্রা: ↓ সংবেদনশীল</p>
                 </div>
                 <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/30 text-center">
                   <Moon className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                   <h5 className="font-semibold text-blue-400">শীত</h5>
                   <p className="text-xs text-slate-400 mt-1">হিটার: ↑ সক্রিয়</p>
                 </div>
                 <div className="p-4 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 rounded-xl border border-teal-500/30 text-center">
                   <Droplets className="w-8 h-8 mx-auto text-teal-400 mb-2" />
                   <h5 className="font-semibold text-teal-400">বর্ষা</h5>
                   <p className="text-xs text-slate-400 mt-1">আর্দ্রতা: ↑ টলারেন্স</p>
                 </div>
                 <div className="p-4 bg-gradient-to-br from-red-500/10 to-rose-500/5 rounded-xl border border-red-500/30 text-center">
                   <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
                   <h5 className="font-semibold text-red-400">জরুরি</h5>
                   <p className="text-xs text-slate-400 mt-1">সব: ↑ ম্যাক্সিমাম</p>
                 </div>
               </div>
               
               <InfoBox type="success">
                 <strong>ওয়েদার অটো মোড:</strong> আবহাওয়া API থেকে ডেটা নিয়ে স্বয়ংক্রিয়ভাবে 
                 সঠিক প্রোফাইল সিলেক্ট করে।
               </InfoBox>
             </DocSection>
 
             {/* ========== REPORTS ========== */}
             <DocSection 
               title="📈 রিপোর্ট ও অ্যানালিটিক্স" 
               icon={<TrendingUp className="w-5 h-5 text-lime-400" />}
             >
               <p className="text-slate-300 leading-relaxed">
                 খামারের পারফরম্যান্স বিশ্লেষণের জন্য বিভিন্ন রিপোর্ট।
               </p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-orange-400 mb-2">🥚 লেয়ার রিপোর্ট</h5>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>• দৈনিক ডিম উৎপাদন</li>
                     <li>• গ্রেড অনুযায়ী বিভাজন (A/B/C)</li>
                     <li>• মৃত্যু হার বিশ্লেষণ</li>
                     <li>• খরচ ও আয় হিসাব</li>
                     <li>• তাপমাত্রা-উৎপাদন সম্পর্ক</li>
                   </ul>
                 </div>
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-blue-400 mb-2">🐔 ব্রয়লার রিপোর্ট</h5>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>• ব্যাচ ম্যানেজমেন্ট</li>
                     <li>• ওজন বৃদ্ধি ট্র্যাকিং</li>
                     <li>• FCR (Feed Conversion Ratio)</li>
                     <li>• প্রতি কেজি খরচ</li>
                     <li>• লাভ/ক্ষতি বিশ্লেষণ</li>
                   </ul>
                 </div>
               </div>
             </DocSection>
 
             {/* ========== TROUBLESHOOTING ========== */}
             <DocSection 
               title="🔧 সমস্যা সমাধান" 
               icon={<Activity className="w-5 h-5 text-rose-400" />}
             >
               <div className="space-y-4">
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-white mb-2">❓ ডিভাইস অফলাইন দেখাচ্ছে</h5>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>1. WiFi সংযোগ চেক করুন</li>
                     <li>2. ESP32 রিস্টার্ট করুন</li>
                     <li>3. ৫ মিনিট অপেক্ষা করুন (অটো রিকানেক্ট)</li>
                     <li>4. সমস্যা থাকলে নতুন টোকেন জেনারেট করুন</li>
                   </ul>
                 </div>
                 
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-white mb-2">❓ সেন্সর ভুল রিডিং দিচ্ছে</h5>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>1. সেন্সর ক্যালিব্রেশন অফসেট সেট করুন</li>
                     <li>2. সেন্সর ওয়্যারিং চেক করুন</li>
                     <li>3. MQ-137 এ ২৪ ঘণ্টা প্রিহিটিং দিন</li>
                     <li>4. DHT22 এ 10K রেজিস্টর আছে কিনা দেখুন</li>
                   </ul>
                 </div>
                 
                 <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
                   <h5 className="font-semibold text-white mb-2">❓ অ্যালার্ম বন্ধ হচ্ছে না</h5>
                   <ul className="text-sm text-slate-400 space-y-1">
                     <li>1. সমস্যার মূল কারণ সমাধান করুন</li>
                     <li>2. অ্যাপ থেকে "Acknowledge" করুন</li>
                     <li>3. ম্যানুয়াল ওভাররাইড বাটন (৩ সেকেন্ড) চাপুন</li>
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