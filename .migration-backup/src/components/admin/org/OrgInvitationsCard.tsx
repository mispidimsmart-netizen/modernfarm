import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Mail, X } from 'lucide-react';
import { roleLabel } from '@/lib/orgAdmin';
import type { OrgInvitation } from '@/hooks/useOrgAdmin';

const STATUS_LABEL: Record<string, string> = {
  pending: 'অপেক্ষমান', accepted: 'গৃহীত', declined: 'প্রত্যাখ্যাত',
  expired: 'মেয়াদোত্তীর্ণ', cancelled: 'বাতিল',
};

const statusColor = (status: string) =>
  status === 'pending' ? 'text-sky-300 border-sky-400/40'
    : status === 'accepted' ? 'text-emerald-300 border-emerald-400/40'
    : status === 'declined' ? 'text-rose-300 border-rose-400/40'
    : 'text-slate-400 border-slate-500/40';

interface Props {
  invitations: OrgInvitation[];
  onCancel: (id: string) => void;
}

export function OrgInvitationsCard({ invitations, onCancel }: Props) {
  const pendingCount = invitations.filter(i => i.status === 'pending').length;

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="w-4 h-4 text-sky-400" /> আমন্ত্রণ ({pendingCount} টি বাকি)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-sm text-slate-400">কোনো আমন্ত্রণ পাঠানো হয়নি।</p>
        ) : (
          <ScrollArea className="max-h-[280px] pr-2">
            <div className="space-y-2">
              {invitations.map(inv => {
                const isPending = inv.status === 'pending';
                return (
                  <div key={inv.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{inv.invited_email || inv.invited_phone}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>রোল: {roleLabel[inv.role]}</span>
                        {isPending && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(inv.expires_at).toLocaleDateString('bn-BD')} পর্যন্ত
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${statusColor(inv.status)}`}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </Badge>
                    {isPending && (
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                        onClick={() => {
                          if (confirm('এই আমন্ত্রণ বাতিল করতে চান?')) onCancel(inv.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
