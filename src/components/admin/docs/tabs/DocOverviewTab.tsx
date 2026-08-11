import { ScrollArea } from '@/components/ui/scroll-area';
import { DocSection, InfoBox } from '../DocPrimitives';
import { Server, Smartphone, Cpu, Database, Users, Layers } from 'lucide-react';

export function DocOverviewTab() {
  return (
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
  );
}
