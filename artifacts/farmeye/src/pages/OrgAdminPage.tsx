import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { LicenseAuditLog } from '@/components/admin/LicenseAuditLog';
import { PaymentRequestPanel } from '@/components/billing/PaymentRequestPanel';
import { OrgUsageAnalytics } from '@/components/admin/OrgUsageAnalytics';
import { LicenseExpiryBanner } from '@/components/billing/LicenseExpiryBanner';
import { TrialStatusBanner } from '@/components/billing/TrialStatusBanner';
import { OrgActivityAuditLog } from '@/components/admin/OrgActivityAuditLog';
import { OrgSummaryCards } from '@/components/admin/org/OrgSummaryCards';
import { OrgFarmsCard } from '@/components/admin/org/OrgFarmsCard';
import { OrgMembersCard } from '@/components/admin/org/OrgMembersCard';
import { OrgInvitationsCard } from '@/components/admin/org/OrgInvitationsCard';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import type { FarmSort, MemberSort } from '@/lib/orgAdmin';

export default function OrgAdminPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [farmSearch, setFarmSearch] = useState('');
  const [farmPage, setFarmPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [farmSort, setFarmSort] = useState<FarmSort>('date_asc');
  const [memberSort, setMemberSort] = useState<MemberSort>('role');




  // Deeplink support: ?section=billing[&action=upgrade][&org=<id>]
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section');
  const action = searchParams.get('action');
  const orgParam = searchParams.get('org');
  const billingRef = useRef<HTMLDivElement | null>(null);
  const [autoOpenUpgrade, setAutoOpenUpgrade] = useState(false);

  const preliminaryId = selectedId;
  const {
    orgs, isLoading, members, farms, invitations,
    removeMember, setRole, cancelInvite, invalidateAfterMemberAdd,
  } = useOrgAdmin(
    // resolve active org after orgs load; hook tolerates null
    preliminaryId
  );

  const selected = orgs.find(o => o.id === selectedId) || orgs[0];
  const activeId = selected?.id || null;

  // Ensure queries follow the resolved default org
  useEffect(() => {
    if (!selectedId && activeId) setSelectedId(activeId);
  }, [selectedId, activeId]);

  useEffect(() => {
    if (orgParam && orgs.some(o => o.id === orgParam) && selectedId !== orgParam) {
      setSelectedId(orgParam);
    }
  }, [orgParam, orgs, selectedId]);

  useEffect(() => {
    if (!activeId) return;
    if (section === 'billing' || action === 'upgrade') {
      requestAnimationFrame(() => {
        billingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (action === 'upgrade') setAutoOpenUpgrade(true);
  }, [section, action, activeId]);

  const goToBilling = (opts?: { upgrade?: boolean }) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', 'billing');
    if (opts?.upgrade) next.set('action', 'upgrade');
    if (activeId) next.set('org', activeId);
    setSearchParams(next, { replace: false });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">লোড হচ্ছে...</div>;
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <Card className="bg-slate-900/80 border-white/10 max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <Building2 className="w-12 h-12 mx-auto text-slate-500" />
            <h2 className="text-xl font-bold">কোনো অর্গানাইজেশন পাওয়া যায়নি</h2>
            <p className="text-sm text-slate-400">
              আপনি এখনো কোনো কোম্পানির মালিক বা অ্যাডমিন নন। নিজের কোম্পানি তৈরি করে ১৪ দিনের ফ্রি ট্রায়াল শুরু করুন।
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link to="/org-signup">নতুন কোম্পানি তৈরি করুন</Link>
              </Button>
              <Button asChild variant="outline"><Link to="/">ড্যাশবোর্ডে ফিরুন</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" />
              আমার কোম্পানি
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              আপনার অর্গানাইজেশনের ফার্ম ও সদস্য পরিচালনা
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/10">
            <Link to="/">← ড্যাশবোর্ড</Link>
          </Button>
        </div>

        {orgs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {orgs.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  activeId === o.id
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            <OrgSummaryCards selected={selected} />

            <TrialStatusBanner
              licenseType={selected.license_type}
              licenseExpiresAt={selected.license_expires_at}
              onUpgrade={() => goToBilling({ upgrade: true })}
            />

            {activeId && (
              <LicenseExpiryBanner orgId={activeId} onRenew={() => goToBilling({ upgrade: true })} />
            )}

            {activeId && <OrgUsageAnalytics orgId={activeId} />}

            {activeId && (
              <div id="payment-request-panel" ref={billingRef}>
                <PaymentRequestPanel
                  orgId={activeId}
                  autoOpen={autoOpenUpgrade}
                  onAutoOpenConsumed={() => {
                    setAutoOpenUpgrade(false);
                    const next = new URLSearchParams(searchParams);
                    next.delete('action');
                    setSearchParams(next, { replace: true });
                  }}
                />
              </div>
            )}

            {activeId && <LicenseAuditLog orgId={activeId} />}
            {activeId && <OrgActivityAuditLog orgId={activeId} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OrgFarmsCard
                farms={farms}
                search={farmSearch}
                onSearch={(v) => { setFarmSearch(v); setFarmPage(1); }}
                sort={farmSort}
                onSort={setFarmSort}
                page={farmPage}
                onPage={setFarmPage}
              />
              <OrgMembersCard
                orgId={activeId}
                members={members}
                search={memberSearch}
                onSearch={(v) => { setMemberSearch(v); setMemberPage(1); }}
                sort={memberSort}
                onSort={setMemberSort}
                page={memberPage}
                onPage={setMemberPage}
                onSetRole={(uid, role) => setRole.mutate({ uid, role })}
                onRemove={(uid) => removeMember.mutate(uid)}
                onMemberAdded={invalidateAfterMemberAdd}
              />
            </div>

            <OrgInvitationsCard
              invitations={invitations}
              onCancel={(id) => cancelInvite.mutate(id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
