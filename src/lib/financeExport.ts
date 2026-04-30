/**
 * Reusable finance export utility — exports BOTH income and expenses
 * filtered by date range and farm mode (layer/broiler/mixed).
 *
 * Used by:
 *  - FinanceReportPage (daily/monthly summary)
 *  - FinanceSummaryRange (today/farm management cards)
 *  - Anywhere we need a filter-aware finance dump.
 */

import type { FinanceMode } from './financeScope';

export interface FinanceExportRow {
  id: string;
  kind: 'income' | 'expense';
  date: string;
  category: string;
  description: string;
  amount: number;
  batch_id: string | null;
  farm_mode: string | null;
}

export interface FinanceExportOptions {
  income: any[];
  expenses: any[];
  mode: FinanceMode;
  rangeLabel: string; // e.g. "গত ৩০ দিন" / "2025-01-01 → 2025-01-31"
  startDate?: string | null;
  endDate?: string | null;
  isBn: boolean;
  filenameSlug?: string; // optional override (default: finance-report-<mode>-<date>)
}

const incomeCategoryLabels: Record<string, { bn: string; en: string }> = {
  egg_sale: { bn: 'ডিম বিক্রি', en: 'Egg sale' },
  eggs: { bn: 'ডিম বিক্রি', en: 'Egg sale' },
  bird_sale: { bn: 'মুরগি বিক্রি', en: 'Bird sale' },
  culled_birds: { bn: 'মুরগি বিক্রি', en: 'Bird sale' },
  spent_hen: { bn: 'পুরাতন মুরগি বিক্রি', en: 'Spent hen sale' },
  manure: { bn: 'সার বিক্রি', en: 'Manure' },
  other: { bn: 'অন্যান্য', en: 'Other' },
};

const expenseCategoryLabels: Record<string, { bn: string; en: string }> = {
  feed: { bn: 'খাদ্য', en: 'Feed' },
  medicine: { bn: 'ওষুধ', en: 'Medicine' },
  electricity: { bn: 'বিদ্যুৎ', en: 'Electricity' },
  labor: { bn: 'শ্রমিক', en: 'Labor' },
  transport: { bn: 'পরিবহন', en: 'Transport' },
  chick: { bn: 'বাচ্চা ক্রয়', en: 'Chick purchase' },
  other: { bn: 'অন্যান্য', en: 'Other' },
};

function labelCategory(kind: 'income' | 'expense', raw: string, isBn: boolean): string {
  const dict = kind === 'income' ? incomeCategoryLabels : expenseCategoryLabels;
  const key = (raw || '').toLowerCase();
  return dict[key]?.[isBn ? 'bn' : 'en'] ?? raw ?? '—';
}

function modeLabel(mode: FinanceMode, isBn: boolean): string {
  if (mode === 'layer') return isBn ? 'লেয়ার' : 'Layer';
  if (mode === 'broiler') return isBn ? 'ব্রয়লার' : 'Broiler';
  return isBn ? 'মিশ্র' : 'Mixed';
}

function csvEscape(v: string | number): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeRows(opts: FinanceExportOptions): FinanceExportRow[] {
  const { income, expenses, isBn } = opts;
  const out: FinanceExportRow[] = [];

  (income ?? []).forEach((i: any) => {
    const cat = i.source || i.category || 'other';
    out.push({
      id: i.id,
      kind: 'income',
      date: i.income_date,
      category: labelCategory('income', cat, isBn),
      description: i.description ?? '',
      amount: Number(i.amount || 0),
      batch_id: i.batch_id ?? null,
      farm_mode: i.farm_mode ?? null,
    });
  });

  (expenses ?? []).forEach((e: any) => {
    out.push({
      id: e.id,
      kind: 'expense',
      date: e.expense_date,
      category: labelCategory('expense', e.category || 'other', isBn),
      description: e.description ?? '',
      amount: Number(e.amount || 0),
      batch_id: e.batch_id ?? null,
      farm_mode: e.farm_mode ?? null,
    });
  });

  return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function computeTotals(rows: FinanceExportRow[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.kind === 'income') income += r.amount;
    else expense += r.amount;
  }
  return { income, expense, net: income - expense };
}

function buildFilename(opts: FinanceExportOptions, ext: 'csv' | 'pdf'): string {
  if (opts.filenameSlug) return `${opts.filenameSlug}.${ext}`;
  const modeSlug = opts.mode ?? 'mixed';
  const stamp =
    opts.startDate && opts.endDate
      ? `${opts.startDate}_to_${opts.endDate}`
      : new Date().toISOString().slice(0, 10);
  return `finance-report-${modeSlug}-${stamp}.${ext}`;
}

export function exportFinanceCsv(opts: FinanceExportOptions) {
  const rows = normalizeRows(opts);
  const totals = computeTotals(rows);
  const isBn = opts.isBn;
  const modeStr = modeLabel(opts.mode, isBn);

  const headers = isBn
    ? ['ফার্ম মোড', 'ধরন', 'তারিখ', 'ক্যাটাগরি', 'বিবরণ', 'পরিমাণ (৳)']
    : ['Farm Mode', 'Type', 'Date', 'Category', 'Description', 'Amount (BDT)'];

  const lines: string[] = [];
  // Metadata header (ignored by Excel as data, but useful when opened as text)
  lines.push(
    csvEscape(isBn ? 'রিপোর্টের সময়সীমা' : 'Report range') + ',' + csvEscape(opts.rangeLabel),
  );
  lines.push(csvEscape(isBn ? 'ফার্ম মোড' : 'Farm Mode') + ',' + csvEscape(modeStr));
  lines.push('');
  lines.push(headers.map(csvEscape).join(','));

  rows.forEach((r) => {
    lines.push(
      [
        modeStr,
        r.kind === 'income' ? (isBn ? 'আয়' : 'Income') : (isBn ? 'ব্যয়' : 'Expense'),
        r.date,
        r.category,
        r.description,
        Math.round(r.amount),
      ]
        .map(csvEscape)
        .join(','),
    );
  });

  // Totals footer
  lines.push('');
  lines.push(csvEscape(isBn ? 'মোট আয়' : 'Total Income') + ',,,,,' + Math.round(totals.income));
  lines.push(csvEscape(isBn ? 'মোট ব্যয়' : 'Total Expense') + ',,,,,' + Math.round(totals.expense));
  lines.push(csvEscape(isBn ? 'নেট' : 'Net') + ',,,,,' + Math.round(totals.net));

  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildFilename(opts, 'csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFinancePdf(opts: FinanceExportOptions) {
  const rows = normalizeRows(opts);
  const totals = computeTotals(rows);
  const isBn = opts.isBn;
  const modeStr = modeLabel(opts.mode, isBn);
  const locale = isBn ? 'bn-BD' : 'en-US';
  const fmt = (n: number) => `৳${Math.round(n).toLocaleString(locale)}`;

  const title = isBn
    ? `আয়-ব্যয় রিপোর্ট — ${modeStr} মোড`
    : `Finance Report — ${modeStr} Mode`;
  const headers = isBn
    ? ['ধরন', 'তারিখ', 'ক্যাটাগরি', 'বিবরণ', 'পরিমাণ']
    : ['Type', 'Date', 'Category', 'Description', 'Amount'];
  const generated = new Date().toLocaleString(locale);

  const body = rows
    .map(
      (r) => `
        <tr>
          <td><span class="badge ${r.kind}">${
            r.kind === 'income' ? (isBn ? 'আয়' : 'Income') : (isBn ? 'ব্যয়' : 'Expense')
          }</span></td>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.category)}</td>
          <td>${escapeHtml(r.description)}</td>
          <td class="amount">${escapeHtml(fmt(r.amount))}</td>
        </tr>`,
    )
    .join('');

  const emptyMsg = isBn
    ? '<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:20px">কোনো এন্ট্রি নেই</td></tr>'
    : '<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:20px">No entries</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="${isBn ? 'bn' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Nikosh', 'SolaimanLipi', system-ui, -apple-system, sans-serif; color: #111; padding: 24px; }
    h1 { color: #1F7A3E; margin: 0 0 4px; font-size: 22px; }
    .meta { color: #6b7280; font-size: 11px; margin-bottom: 8px; }
    .summary { display: flex; gap: 12px; margin: 12px 0 16px; }
    .summary .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; }
    .summary .card .label { font-size: 11px; color: #6b7280; }
    .summary .card .value { font-size: 16px; font-weight: 700; }
    .summary .income .value { color: #065f46; }
    .summary .expense .value { color: #991b1b; }
    .summary .net.positive .value { color: #1F7A3E; }
    .summary .net.negative .value { color: #b45309; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; }
    .amount { text-align: right; font-weight: 600; white-space: nowrap; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .badge.income { background: #d1fae5; color: #065f46; }
    .badge.expense { background: #fee2e2; color: #991b1b; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    ${isBn ? 'সময়সীমা' : 'Range'}: <strong>${escapeHtml(opts.rangeLabel)}</strong>
    · ${isBn ? 'ফার্ম মোড' : 'Mode'}: <strong>${escapeHtml(modeStr)}</strong>
    · ${isBn ? 'তৈরি' : 'Generated'}: ${escapeHtml(generated)}
  </div>
  <div class="summary">
    <div class="card income"><div class="label">${isBn ? 'মোট আয়' : 'Total Income'}</div><div class="value">${escapeHtml(fmt(totals.income))}</div></div>
    <div class="card expense"><div class="label">${isBn ? 'মোট ব্যয়' : 'Total Expense'}</div><div class="value">${escapeHtml(fmt(totals.expense))}</div></div>
    <div class="card net ${totals.net >= 0 ? 'positive' : 'negative'}"><div class="label">${isBn ? 'নেট' : 'Net'}</div><div class="value">${escapeHtml(fmt(totals.net))}</div></div>
  </div>
  <table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? body : emptyMsg}</tbody>
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
