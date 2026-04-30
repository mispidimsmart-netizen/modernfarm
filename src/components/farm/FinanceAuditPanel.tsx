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
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ShieldCheck, FileDown, Printer } from 'lucide-react';

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
  const financeScope = useMemo(
    () => ({ mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart }),
    [isLayer, isBroiler, activeBatchId, batchStart],
  );
  const labels = useMemo(
    () => ({
      layerOnly: isBn ? 'লেয়ার-only ক্যাটাগরি' : 'Layer-only category',
      broilerOnly: isBn ? 'ব্রয়লার-only ক্যাটাগরি' : 'Broiler-only category',
      wrongMode: isBn ? 'অন্য ফার্ম মোড' : 'Other farm mode',
      otherBatch: isBn ? 'অন্য ব্যাচের' : 'Other batch',
      beforeBatch: isBn ? 'বর্তমান ব্যাচের আগের তারিখ' : 'Before active batch start',
      untagged: isBn ? 'ব্যাচ/মোড ট্যাগ নেই' : 'Batch/mode not tagged',
    }),
    [isBn],
  );

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
            <div className="flex items-center gap-2 pb-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  exportFlaggedAsCsv(flagged, isBn);
                }}
              >
                <FileDown className="h-3 w-3" />
                {isBn ? 'CSV ডাউনলোড' : 'Download CSV'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  exportFlaggedAsPdf(flagged, isBn, fmt);
                }}
              >
                <Printer className="h-3 w-3" />
                {isBn ? 'PDF প্রিন্ট' : 'Print PDF'}
              </Button>
            </div>
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

// ---------- Export helpers ----------

type FlaggedRow = {
  id: string;
  kind: 'income' | 'expense';
  date: string;
  amount: number;
  category: string;
  reason: string;
};

function csvEscape(v: string | number): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportFlaggedAsCsv(rows: FlaggedRow[], isBn: boolean) {
  const headers = isBn
    ? ['ধরন', 'তারিখ', 'ক্যাটাগরি', 'কারণ', 'পরিমাণ (৳)']
    : ['Type', 'Date', 'Category', 'Reason', 'Amount (BDT)'];
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((r) => {
    lines.push(
      [
        r.kind === 'income' ? (isBn ? 'আয়' : 'Income') : (isBn ? 'ব্যয়' : 'Expense'),
        r.date,
        r.category,
        r.reason,
        Math.round(r.amount),
      ]
        .map(csvEscape)
        .join(','),
    );
  });
  // BOM so Excel detects UTF-8 (Bengali) correctly
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `finance-audit-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportFlaggedAsPdf(
  rows: FlaggedRow[],
  isBn: boolean,
  fmt: (n: number) => string,
) {
  const title = isBn ? 'ফিনান্স অডিট রিপোর্ট' : 'Finance Audit Report';
  const subtitle = isBn
    ? `${rows.length}টি এন্ট্রি রিপোর্ট থেকে বাদ দেওয়া হয়েছে`
    : `${rows.length} entries hidden from report`;
  const headers = isBn
    ? ['ধরন', 'তারিখ', 'ক্যাটাগরি', 'কারণ', 'পরিমাণ']
    : ['Type', 'Date', 'Category', 'Reason', 'Amount'];
  const generated = new Date().toLocaleString(isBn ? 'bn-BD' : 'en-US');

  const body = rows
    .map(
      (r) => `
        <tr>
          <td><span class="badge ${r.kind}">${
            r.kind === 'income' ? (isBn ? 'আয়' : 'Income') : (isBn ? 'ব্যয়' : 'Expense')
          }</span></td>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.category)}</td>
          <td class="reason">${escapeHtml(r.reason)}</td>
          <td class="amount">${escapeHtml(fmt(r.amount))}</td>
        </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="${isBn ? 'bn' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Nikosh', 'SolaimanLipi', system-ui, -apple-system, sans-serif; color: #111; padding: 24px; }
    h1 { color: #1F7A3E; margin: 0 0 4px; font-size: 22px; }
    .sub { color: #b45309; font-size: 13px; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; }
    .amount { text-align: right; font-weight: 600; white-space: nowrap; }
    .reason { color: #b45309; font-size: 11px; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .badge.income { background: #d1fae5; color: #065f46; }
    .badge.expense { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">${escapeHtml(subtitle)}</div>
  <div class="meta">${isBn ? 'তৈরি' : 'Generated'}: ${escapeHtml(generated)}</div>
  <table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
