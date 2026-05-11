import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Check, X } from 'lucide-react';

interface PendingInvite {
  id: string;
  organization_id: string;
  org_name: string;
  role: 'org_owner' | 'org_admin' | 'member';
  expires_at: string;
  created_at: string;
}

const roleLabel: Record<string, string> = {
  org_owner: 'মালিক', org_admin: 'অ্যাডমিন', member: 'সদস্য',
};

/**
 * Banner shown to users who have pending org invitations matching their
 * email/phone. Lets them accept or decline directly.
 */
export function PendingInvitationsBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: invites = [] } = useQuery<PendingInvite[]>({
    queryKey: ['my_pending_invitations', user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_pending_invitations' as any);
      if (error) return [];
      return (data || []) as PendingInvite[];
    },
  });

  const accept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('accept_org_invitation' as any, { _invitation_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'অভিনন্দন!', description: 'আপনি কোম্পানিতে যোগ দিয়েছেন।' });
      qc.invalidateQueries({ queryKey: ['my_pending_invitations'] });
      qc.invalidateQueries({ queryKey: ['platform_role'] });
      qc.invalidateQueries({ queryKey: ['my_organizations'] });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const decline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('decline_org_invitation' as any, { _invitation_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'আমন্ত্রণ প্রত্যাখ্যান করা হয়েছে' });
      qc.invalidateQueries({ queryKey: ['my_pending_invitations'] });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  if (invites.length === 0) return null;

  return (
    <div className="space-y-2">
      {invites.map(inv => (
        <Card key={inv.id} className="border-sky-400/40 bg-sky-500/10">
          <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-sky-300" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">
                  নতুন আমন্ত্রণ — <span className="text-sky-300">{inv.org_name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  রোল: {roleLabel[inv.role]} · মেয়াদ: {new Date(inv.expires_at).toLocaleDateString('bn-BD')}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => accept.mutate(inv.id)}
                disabled={accept.isPending || decline.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-1" /> গ্রহণ
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm('এই আমন্ত্রণ প্রত্যাখ্যান করতে চান?')) {
                    decline.mutate(inv.id);
                  }
                }}
                disabled={accept.isPending || decline.isPending}
                className="border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
              >
                <X className="w-4 h-4 mr-1" /> প্রত্যাখ্যান
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
