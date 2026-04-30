import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses, useIncome } from '@/hooks/useFarmManagement';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatchStart } from '@/hooks/useActiveBatchStart';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, getFinanceScopeIssues } from '@/lib/financeScope';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronDown, ShieldCheck } from 'lucide-react';

interface FinanceAuditPanelProps {
  days: number;
}

/**
 * Quick verification panel — surfaces income/expense rows that look like they
 * belong to the OTHER mode (e.g. egg sales while in broiler mode) or to a
 * previous batch (date < active batch start). Helps the farmer spot legacy
 * entries that the report filter is intentionally hiding.
 */
export function FinanceAuditPanel({ days }: FinanceAuditPanelProps) {
  const { language } = useAuth();
  const isBn = language === 'bn';
  const locale = isBn ? 'bn-BD' : 'en-US';
  const { isLayer, isBroiler } = useFarmType();
  const { data: expensesRaw } = useExpenses(days);
  const { data: incomeRaw } = useIncome(days);
  const batchStart = useActiveBatchStart();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const activeBatchId = isLayer
    ? activeLayerBatch?.id ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.id ?? null
      : null;
  const financeScope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart };
  const labels = {
    layerOnly: isBn ? 'লেয়ার-only ক্যাটাগরি' : 'Layer-only category',
    broilerOnly: isBn ? 'ব্রয়লার-only ক্যাটাগরি' : 'Broiler-only category',
    wrongMode: isBn ? 'অন্য ফার্ম মোড' : 'Other farm mode',
    otherBatch: isBn ? 'অন্য ব্যাচের' : 'Other batch',
    beforeBatch: isBn ? 'বর্তমান ব্যাচের আগের তারিখ' : 'Before active batch start',
    untagged: isBn ? 'ব্যাচ/মোড ট্যাগ নেই' : 'Batch/mode not tagged',
  };

  const [open, setOpen] = useState(false);

  const flagged = useMemo(() => {
    const out: Array<{
      id: string;
      kind: 'income' | 'expense';
      date: string;
      amount: number;
      category: string;
      reason: string;
    }> = [];

    (incomeRaw ?? []).forEach((i: any) => {
      const cat = (i.source || i.category || '').toString();
      const reasons = getFinanceScopeIssues(i, 'income', financeScope, labels);
      if (reasons.length) {
        out.push({
          id: i.id,
          kind: 'income',
          date: i.income_date,
          amount: Number(i.amount || 0),
          category: cat || '—',
          reason: reasons.join(' • '),
        });
      }
    });

    (expensesRaw ?? []).forEach((e: any) => {
      const reasons = getFinanceScopeIssues(e, 'expense', financeScope, labels);
      if (reasons.length) {
        out.push({
          id: e.id,
          kind: 'expense',
          date: e.expense_date,
          amount: Number(e.amount || 0),
          category: e.category || '—',
          reason: reasons.join(' • '),
        });
      }
    });

    return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [incomeRaw, expensesRaw, financeScope, labels]);

  const fmt = (n: number) => `৳${Math.round(n).toLocaleString(locale)}`;

  if (flagged.length === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {isBn
              ? '✅ যাচাই সম্পন্ন — রিপোর্টের সব এন্ট্রি বর্তমান ব্যাচ ও মোডের সাথে মিলে'
              : '✅ Audit clean — all entries match the active batch & mode'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {isBn
                  ? `${flagged.length}টি এন্ট্রি রিপোর্ট থেকে বাদ দেওয়া হয়েছে`
                  : `${flagged.length} entries hidden from report`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isBn ? 'যাচাই করতে ক্লিক করুন' : 'Tap to verify'}
              </p>
            </div>
            <Badge variant="outline" className="text-amber-700 border-amber-500/40">
              {flagged.length}
            </Badge>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform data-[state=open]:rotate-180" />
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 space-y-1.5">
            {flagged.slice(0, 25).map((row) => (
              <div
                key={`${row.kind}-${row.id}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-background/60 border border-border/40 px-2.5 py-1.5 text-[11px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        row.kind === 'income'
                          ? 'text-emerald-600 border-emerald-500/30 h-4 px-1 text-[9px]'
                          : 'text-destructive border-destructive/30 h-4 px-1 text-[9px]'
                      }
                    >
                      {row.kind === 'income' ? (isBn ? 'আয়' : 'IN') : (isBn ? 'ব্যয়' : 'EX')}
                    </Badge>
                    <span className="font-medium truncate">{row.category}</span>
                    <span className="text-muted-foreground">· {row.date}</span>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {row.reason}
                  </p>
                </div>
                <span className="font-semibold shrink-0">{fmt(row.amount)}</span>
              </div>
            ))}
            {flagged.length > 25 && (
              <p className="text-[10px] text-center text-muted-foreground pt-1">
                {isBn ? `+ আরও ${flagged.length - 25}টি` : `+ ${flagged.length - 25} more`}
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
