import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, KeyRound, FileCheck2, Bug, ScrollText } from 'lucide-react';

type Finding = {
  id: string;
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'fixed' | 'mitigated' | 'accepted';
  detail: string;
};

const FINDINGS: Finding[] = [
  { id: 'P-001', title: 'Device secret HMAC + nonce replay protection', severity: 'high', status: 'fixed',
    detail: 'ESP32 → API requests use HMAC-SHA256 + per-request nonce। ২৪-ঘন্টা grace সহ secret rotation।' },
  { id: 'P-002', title: 'Multi-tenant RLS isolation', severity: 'critical', status: 'fixed',
    detail: 'সব sensitive table-এ farm_id নির্ভর RLS। `audit_tenant_isolation()` RPC দিয়ে নিয়মিত চেক।' },
  { id: 'P-003', title: 'JWT validation in edge functions', severity: 'high', status: 'fixed',
    detail: 'public endpoints (esp32-api, ota-firmware) ছাড়া সব ফাংশন JWT verify করে।' },
  { id: 'P-004', title: 'Role escalation via client storage', severity: 'critical', status: 'fixed',
    detail: 'Roles কেবল server-side `user_roles` table-এ; কখনো localStorage/sessionStorage থেকে চেক হয় না।' },
  { id: 'P-005', title: 'Privileged RPC abuse', severity: 'medium', status: 'fixed',
    detail: 'Super-admin RPC গুলো `is_super_admin(auth.uid())` চেক করে; anon client কল করলে denied হয় (test covered)।' },
  { id: 'P-006', title: 'Leaked password (HIBP) check', severity: 'medium', status: 'mitigated',
    detail: 'Auth provider-এ HIBP চেক চালু — দুর্বল/leaked password signup-এ ব্লক হয়।' },
  { id: 'P-007', title: 'Rate limiting on sensitive endpoints', severity: 'medium', status: 'fixed',
    detail: 'login, invite-redeem, device-auth ব্যর্থতা security_audit_log-এ লগ হয় ও rate-limit হয়।' },
  { id: 'P-008', title: 'Hardware safety bypass', severity: 'high', status: 'fixed',
    detail: '৮টি hardcoded ESP32 invariant — cloud কখনো actual fan/heater state overwrite করতে পারে না।' },
];

const sevColor = (s: Finding['severity']) =>
  s === 'critical' ? 'border-red-500/40 text-red-300' :
  s === 'high' ? 'border-orange-500/40 text-orange-300' :
  s === 'medium' ? 'border-amber-500/40 text-amber-300' :
  s === 'low' ? 'border-blue-500/40 text-blue-300' :
  'border-slate-500/40 text-slate-300';

const statusColor = (s: Finding['status']) =>
  s === 'fixed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
  s === 'mitigated' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
  'bg-slate-500/20 text-slate-300 border-slate-500/40';

export default function SecurityReportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-2">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">FarmEye Security Report</h1>
          <p className="text-slate-400">পাবলিক নিরাপত্তা প্রতিবেদন · সর্বশেষ নিরীক্ষা: ২০২৬-০৫</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Lock, label: 'TLS 1.3', sub: 'সকল API ও WebSocket' },
            { icon: KeyRound, label: 'HMAC + Nonce', sub: 'Device authentication' },
            { icon: FileCheck2, label: 'RLS Enforced', sub: 'প্রতিটি sensitive table' },
            { icon: ScrollText, label: '180 দিন audit log', sub: 'security_audit_log' },
          ].map((c, i) => (
            <Card key={i} className="bg-slate-900/60 border-white/10">
              <CardContent className="p-4 text-center">
                <c.icon className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                <p className="font-semibold text-sm">{c.label}</p>
                <p className="text-xs text-slate-400">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-900/60 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-emerald-400" />
              নিরীক্ষা ফলাফল ({FINDINGS.length}টি ফাইন্ডিং)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {FINDINGS.map((f) => (
              <div key={f.id} className="p-4 rounded-lg bg-slate-800/40 border border-white/5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{f.id}</span>
                    <h3 className="font-semibold">{f.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={sevColor(f.severity)}>
                      {f.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={statusColor(f.status)}>
                      {f.status === 'fixed' ? '✓ FIXED' : f.status === 'mitigated' ? '◐ MITIGATED' : 'ACCEPTED'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{f.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-emerald-950/30 border-emerald-500/30">
          <CardContent className="p-6 space-y-2">
            <h2 className="font-bold text-lg">দায়িত্বশীল ভাল্নারেবিলিটি ডিসক্লোজার</h2>
            <p className="text-sm text-slate-300">
              নিরাপত্তা ত্রুটি পেলে অনুগ্রহ করে রিপোর্ট করুন: <span className="font-mono text-emerald-300">security@nexiotlabs.com</span>।
              আমরা ৪৮ ঘন্টার মধ্যে স্বীকার করব ও ৯০ দিনের মধ্যে fix করার চেষ্টা করব।
              যাচাইকৃত critical bug-এর জন্য bug-bounty পাওয়া যাবে।
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          © 2026 Nexiot Labs · এই রিপোর্ট স্বচ্ছতার জন্য পাবলিক
        </p>
      </div>
    </div>
  );
}
