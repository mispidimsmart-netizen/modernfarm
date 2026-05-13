import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function OrgSignupPage() {
  const { user } = useAuth();
  const { data: platformRole, isLoading: roleLoading } = usePlatformRole();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // Auto-generate slug from English name
  useEffect(() => {
    if (autoSlug && nameEn) {
      setSlug(
        nameEn
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 50),
      );
    }
  }, [nameEn, autoSlug]);

  // Debounced slug availability check
  useEffect(() => {
    const s = slug.trim();
    if (s.length < 3 || !/^[a-z0-9-]+$/.test(s)) {
      setSlugStatus(s.length === 0 ? 'idle' : 'invalid');
      return;
    }
    setSlugStatus('checking');
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('is_org_slug_available' as any, { _slug: s });
      if (error) { setSlugStatus('idle'); return; }
      setSlugStatus(data ? 'available' : 'taken');
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_organization_trial' as any, {
        _name: name.trim(),
        _name_en: nameEn.trim(),
        _slug: slug.trim(),
      });
      if (error) throw error;
      return data as { success: boolean; org_id: string; trial_expires_at: string };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['platform_role'] });
      qc.invalidateQueries({ queryKey: ['my_organizations'] });
      toast({
        title: '🎉 কোম্পানি তৈরি হয়েছে!',
        description: `১৪ দিনের ফ্রি ট্রায়াল শুরু — ${new Date(res.trial_expires_at).toLocaleDateString('bn-BD')} পর্যন্ত`,
      });
      setTimeout(() => navigate('/org-admin'), 400);
    },
    onError: (e: any) => {
      const msg: string = e?.message || '';
      const isDuplicate = /slug/i.test(msg) && (/ব্যবহার করা হচ্ছে/.test(msg) || /duplicate|already|unique/i.test(msg));
      if (isDuplicate) setSlugStatus('taken');
      toast({
        title: isDuplicate ? 'এই URL slug ইতিমধ্যে নেওয়া হয়েছে' : 'ত্রুটি',
        description: isDuplicate
          ? 'অনুগ্রহ করে অন্য একটি slug বেছে নিন (যেমন আপনার কোম্পানির নামের সাথে সংখ্যা যোগ করুন)।'
          : msg || 'কোম্পানি তৈরি করা যায়নি',
        variant: 'destructive',
      });
    },
  });

  // Must be logged in
  if (!user) {
    return <Navigate to="/login?redirect=/org-signup" replace />;
  }

  // If user already owns an org, send them to org-admin
  if (!roleLoading && platformRole?.orgs?.some(o => o.my_role === 'org_owner')) {
    return <Navigate to="/org-admin" replace />;
  }

  const canSubmit =
    name.trim().length >= 2 &&
    nameEn.trim().length >= 2 &&
    slug.trim().length >= 3 &&
    /^[a-z0-9-]+$/.test(slug.trim()) &&
    slugStatus !== 'taken' &&
    slugStatus !== 'checking' &&
    !create.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-900/80 border-white/10 backdrop-blur">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl">নতুন কোম্পানি তৈরি করুন</CardTitle>
          <p className="text-sm text-slate-400">
            ১৪ দিনের ফ্রি ট্রায়াল · ১টি ফার্ম · ৩ জন ইউজার
          </p>
          <div className="inline-flex items-center gap-1.5 mx-auto px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs">
            <Sparkles className="w-3 h-3" /> কোনো কার্ড লাগবে না
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">কোম্পানির নাম (বাংলা) *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="উদাহরণ: রহমান পোল্ট্রি লিমিটেড"
              maxLength={100}
              className="bg-slate-800 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name_en">Company Name (English) *</Label>
            <Input
              id="name_en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Rahman Poultry Ltd"
              maxLength={100}
              className="bg-slate-800 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">farmeye.pro.bd/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
                placeholder="rahman-poultry"
                maxLength={50}
                className="bg-slate-800 border-white/10 font-mono text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500">শুধু ইংরেজি অক্ষর, সংখ্যা ও hyphen (-) ব্যবহার করুন</p>
            {slug.trim().length >= 3 && (
              <p
                className={`text-[11px] flex items-center gap-1 ${
                  slugStatus === 'available'
                    ? 'text-emerald-400'
                    : slugStatus === 'taken'
                    ? 'text-rose-400'
                    : slugStatus === 'invalid'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {slugStatus === 'checking' && <><Loader2 className="w-3 h-3 animate-spin" /> যাচাই করা হচ্ছে...</>}
                {slugStatus === 'available' && <>✓ এই slug ব্যবহারের জন্য খালি আছে</>}
                {slugStatus === 'taken' && <>✗ এই slug ইতিমধ্যে নেওয়া হয়েছে — অন্যটি বেছে নিন</>}
                {slugStatus === 'invalid' && <>✗ অবৈধ slug ফরম্যাট</>}
              </p>
            )}

          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-emerald-300">যা পাবেন:</div>
            <ul className="space-y-0.5 ml-4 list-disc text-slate-400">
              <li>১৪ দিনের সম্পূর্ণ ফ্রি ট্রায়াল</li>
              <li>১টি ফার্ম, ৩ জন ইউজার পর্যন্ত যোগ করার সুবিধা</li>
              <li>সব sensor monitoring + automation features</li>
              <li>মেয়াদ শেষ হলে আপগ্রেডের সুযোগ</li>
            </ul>
          </div>

          <Button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
          >
            {create.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                তৈরি হচ্ছে...
              </>
            ) : (
              <>
                ট্রায়াল শুরু করুন
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <button
            onClick={() => navigate('/')}
            className="w-full text-xs text-slate-400 hover:text-slate-200"
          >
            ড্যাশবোর্ডে ফিরুন
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
