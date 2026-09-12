import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserCog, Loader2 } from 'lucide-react';
import { translatePgError } from '@/lib/translatePgError';
import type { ProfileRow } from './role-editor/roleEditorTypes';
import { UserRoleDialog } from './role-editor/UserRoleDialog';

export function UnifiedRoleEditorPanel() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const runIntegrationTests = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.rpc('test_role_sync_invariants' as any);
      if (error) throw error;
      const r = data as any as { passed: number; failed: number; total: number; tests: { name: string; pass: boolean; detail?: string }[] };
      const failedItems = (r.tests || []).filter(t => !t.pass);
      toast({
        title: r.failed === 0 ? `সব ${r.total}টি ইন্টিগ্রেশন টেস্ট পাস ✅` : `${r.failed}/${r.total} টেস্ট ফেইল ❌`,
        description: r.failed === 0
          ? 'farm_members ↔ user_roles ↔ farms.owner_id সিঙ্ক ঠিক আছে।'
          : failedItems.map(t => `${t.name}${t.detail ? ` (${t.detail})` : ''}`).join(' • '),
        variant: r.failed === 0 ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({ title: 'টেস্ট রান ব্যর্থ', description: translatePgError(e), variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin_all_profiles_for_roles'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email')
        .order('user_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.user_name || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const openUser = users.find(u => u.id === openUserId) || null;

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-violet-400" />
            ইউনিফাইড রোল এডিটর
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-400/40">{filtered.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              className="h-9 border-violet-400/40 text-violet-300 hover:bg-violet-500/10"
              disabled={testing}
              onClick={runIntegrationTests}
              title="রোল সিঙ্ক ইন্টিগ্রেশন টেস্ট চালান"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              টেস্ট চালান
            </Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="নাম/ফোন/ইমেইল খুঁজুন..."
                className="pl-9 bg-slate-800 border-white/10 text-white w-full sm:w-72"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          এক জায়গা থেকে যেকোনো ইউজারের সুপার এডমিন, অর্গ, ফার্ম ও ওয়ার্কার রোল একসাথে দেখুন ও বদলান।
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[560px] pr-2">
          {isLoading && <p className="text-slate-400 text-sm py-6">লোড হচ্ছে...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-slate-400 text-sm py-6 text-center">কোনো ইউজার পাওয়া যায়নি</p>
          )}
          <div className="space-y-2">
            {filtered.map(u => (
              <button
                key={u.id}
                onClick={() => setOpenUserId(u.id)}
                className="w-full text-left p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-violet-400/40 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold truncate">
                    {u.user_name || '— নাম নেই —'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {u.phone || ''} {u.email ? `· ${u.email}` : ''}
                  </div>
                </div>
                <Badge variant="outline" className="border-violet-400/40 text-violet-300 text-xs shrink-0">
                  রোল এডিট
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      {openUser && (
        <UserRoleDialog user={openUser} onClose={() => setOpenUserId(null)} />
      )}
    </Card>
  );
}
