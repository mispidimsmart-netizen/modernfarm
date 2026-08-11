import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Crown, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  filterSortMembers, paginate, roleLabel, ORG_PAGE_SIZE,
  type MemberRow, type MemberSort, type OrgRole,
} from '@/lib/orgAdmin';
import { AddMemberDialog } from './AddMemberDialog';
import { OrgPager } from './OrgPager';

interface Props {
  orgId: string | null;
  members: MemberRow[];
  search: string;
  onSearch: (v: string) => void;
  sort: MemberSort;
  onSort: (v: MemberSort) => void;
  page: number;
  onPage: (updater: (p: number) => number) => void;
  onSetRole: (uid: string, role: OrgRole) => void;
  onRemove: (uid: string) => void;
  onMemberAdded: () => void;
}

export function OrgMembersCard({
  orgId, members, search, onSearch, sort, onSort, page, onPage,
  onSetRole, onRemove, onMemberAdded,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const filtered = useMemo(() => filterSortMembers(members, search, sort), [members, search, sort]);
  const pageData = paginate(filtered, page, ORG_PAGE_SIZE);

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" /> সদস্য
            <span className="text-xs font-normal text-slate-400">
              ({filtered.length}{search ? `/${members.length}` : ''})
            </span>
          </CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                <UserPlus className="w-4 h-4 mr-1" /> যোগ
              </Button>
            </DialogTrigger>
            {orgId && (
              <AddMemberDialog
                orgId={orgId}
                onAdded={() => { setAddOpen(false); onMemberAdded(); }}
              />
            )}
          </Dialog>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="নাম, ফোন, ইমেইল..."
              className="h-8 pl-8 bg-slate-900 border-white/10 text-xs"
            />
          </div>
          <Select value={sort} onValueChange={(v: MemberSort) => onSort(v)}>
            <SelectTrigger className="h-8 w-[130px] bg-slate-900 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="role">রোল অনুযায়ী</SelectItem>
              <SelectItem value="name_asc">নাম (অ→হ)</SelectItem>
              <SelectItem value="name_desc">নাম (হ→অ)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400">{search ? 'কোনো সদস্য পাওয়া যায়নি।' : 'কোনো সদস্য নেই।'}</p>
          ) : (
            <div className="space-y-2">
              {pageData.items.map(m => (
                <div key={m.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm flex items-center gap-2">
                      {m.role === 'org_owner' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {m.profile?.user_name || m.profile?.phone || m.user_id.slice(0, 8)}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {m.profile?.phone || ''} {m.profile?.email ? `· ${m.profile.email}` : ''}
                    </div>
                  </div>
                  {m.role === 'org_owner' ? (
                    <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-[10px]">
                      {roleLabel.org_owner}
                    </Badge>
                  ) : (
                    <>
                      <Select value={m.role} onValueChange={(v: OrgRole) => onSetRole(m.user_id, v)}>
                        <SelectTrigger className="h-8 w-[110px] bg-slate-900 border-white/10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org_admin">{roleLabel.org_admin}</SelectItem>
                          <SelectItem value="member">{roleLabel.member}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                        onClick={() => {
                          if (confirm('এই সদস্যকে সরাতে চান?')) onRemove(m.user_id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <OrgPager page={pageData.page} totalPages={pageData.totalPages} onChange={onPage} />
      </CardContent>
    </Card>
  );
}
