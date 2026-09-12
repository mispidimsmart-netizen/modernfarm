import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Crown, Tractor, UserCog, Loader2 } from 'lucide-react';
import type { ProfileRow } from './roleEditorTypes';
import { useUserRoleDraft } from './useUserRoleDraft';
import { OrgRolesSection } from './OrgRolesSection';
import { FarmMembershipsSection } from './FarmMembershipsSection';

export function UserRoleDialog({ user, onClose }: { user: ProfileRow; onClose: () => void }) {
  const {
    summary, isLoading, realOrgs, allFarms,
    draftSuper, setDraftSuper,
    draftOrgs, setDraftOrgs,
    draftFarms, setDraftFarms,
    availableOrgs, availableFarms,
    dirty, apply,
  } = useUserRoleDraft(user, onClose);

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const requestClose = () => { if (dirty) setConfirmDiscardOpen(true); else onClose(); };

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) requestClose(); }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-violet-400" />
              {user.user_name || user.phone || 'ইউজার'} — রোল এডিটর
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {user.phone} {user.email ? `· ${user.email}` : ''}
            </DialogDescription>
          </DialogHeader>

          {isLoading || !summary ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-5 py-2">
                <section className="p-3 rounded-lg bg-amber-500/5 border border-amber-400/20">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold text-amber-200">সুপার এডমিন</span>
                    </div>
                    <Switch checked={draftSuper} onCheckedChange={setDraftSuper} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">পুরো সিস্টেমের সম্পূর্ণ এডমিন অ্যাক্সেস।</p>
                </section>

                <OrgRolesSection
                  draftOrgs={draftOrgs}
                  setDraftOrgs={setDraftOrgs}
                  availableOrgs={availableOrgs}
                  realOrgs={realOrgs}
                />

                <section className="p-3 rounded-lg bg-green-500/5 border border-green-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tractor className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-green-200">মালিকানাধীন ফার্ম</span>
                  </div>
                  {summary.owned_farms.length === 0 ? (
                    <p className="text-xs text-slate-400">কোনো ফার্মের মালিক নয়।</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {summary.owned_farms.map(f => (
                        <Badge key={f.farm_id} variant="outline" className="border-green-400/40 text-green-300 text-[11px]">
                          {f.farm_name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2">
                    মালিকানা বদলাতে "ফার্ম" ট্যাব ব্যবহার করুন।
                  </p>
                </section>

                <FarmMembershipsSection
                  draftFarms={draftFarms}
                  setDraftFarms={setDraftFarms}
                  availableFarms={availableFarms}
                  allFarms={allFarms}
                />
              </div>
            </ScrollArea>
          )}

          <div className="border-t border-white/10 pt-3 mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              সব পরিবর্তন একটি transaction-এ সেভ হবে; legacy worker টেবিল triggers দিয়ে auto-sync।
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                className="h-8 border-white/10 text-slate-300 hover:bg-slate-800"
                onClick={requestClose}
                disabled={apply.isPending}
              >
                বাতিল
              </Button>
              <Button
                size="sm"
                className="h-8 bg-violet-600 hover:bg-violet-700"
                disabled={!dirty || apply.isPending || isLoading}
                onClick={() => apply.mutate()}
              >
                {apply.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                সেভ করুন
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>সেভ না করা পরিবর্তন বাদ দেবেন?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              আপনার পরিবর্তনগুলো সেভ হয়নি। ডায়ালগ বন্ধ করলে এগুলো হারিয়ে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-white/10 text-slate-200 hover:bg-slate-700">
              থাকি
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => { setConfirmDiscardOpen(false); onClose(); }}
            >
              বাদ দাও
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
