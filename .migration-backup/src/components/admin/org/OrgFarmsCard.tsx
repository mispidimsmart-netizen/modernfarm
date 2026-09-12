import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, Tractor } from 'lucide-react';
import { useMemo } from 'react';
import { filterSortFarms, paginate, ORG_PAGE_SIZE, type FarmRow, type FarmSort } from '@/lib/orgAdmin';
import { OrgPager } from './OrgPager';

interface Props {
  farms: FarmRow[];
  search: string;
  onSearch: (v: string) => void;
  sort: FarmSort;
  onSort: (v: FarmSort) => void;
  page: number;
  onPage: (updater: (p: number) => number) => void;
}

export function OrgFarmsCard({ farms, search, onSearch, sort, onSort, page, onPage }: Props) {
  const filtered = useMemo(() => filterSortFarms(farms, search, sort), [farms, search, sort]);
  const pageData = paginate(filtered, page, ORG_PAGE_SIZE);

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Tractor className="w-4 h-4 text-emerald-400" /> ফার্মসমূহ
          </span>
          <span className="text-xs font-normal text-slate-400">
            {filtered.length}{search ? ` / ${farms.length}` : ''}
          </span>
        </CardTitle>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="ফার্ম খুঁজুন..."
              className="h-8 pl-8 bg-slate-900 border-white/10 text-xs"
            />
          </div>
          <Select value={sort} onValueChange={(v: FarmSort) => onSort(v)}>
            <SelectTrigger className="h-8 w-[140px] bg-slate-900 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_asc">তারিখ (পুরোনো)</SelectItem>
              <SelectItem value="date_desc">তারিখ (নতুন)</SelectItem>
              <SelectItem value="name_asc">নাম (অ→হ)</SelectItem>
              <SelectItem value="name_desc">নাম (হ→অ)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400">{search ? 'কোনো ফার্ম পাওয়া যায়নি।' : 'কোনো ফার্ম নেই।'}</p>
          ) : (
            <div className="space-y-2">
              {pageData.items.map(f => (
                <div key={f.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {f.name_en} · {new Date(f.created_at).toLocaleDateString('bn-BD')}
                  </div>
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
