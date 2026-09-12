import { useState } from 'react';
import { FileDown, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { exportFinanceCsv, exportFinancePdf } from '@/lib/financeExport';
import type { FinanceMode } from '@/lib/financeScope';

interface FinanceExportButtonProps {
  /** Filtered (mode + batch + date scoped) income rows */
  income: any[];
  /** Filtered (mode + batch + date scoped) expense rows */
  expenses: any[];
  mode: FinanceMode;
  /** Human-readable label e.g. "গত ৩০ দিন" or "2025-01-01 → 2025-01-31" */
  rangeLabel: string;
  startDate?: string | null;
  endDate?: string | null;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'ghost' | 'secondary';
  className?: string;
}

/**
 * Filter-aware export button. Exports BOTH income and expenses (already
 * filtered by parent) as CSV or print-to-PDF. Always respects whatever
 * date range / farm mode the parent has applied.
 */
export function FinanceExportButton({
  income,
  expenses,
  mode,
  rangeLabel,
  startDate,
  endDate,
  size = 'sm',
  variant = 'outline',
  className,
}: FinanceExportButtonProps) {
  const { language } = useAuth();
  const isBn = language === 'bn';
  const [busy, setBusy] = useState(false);

  const total = (income?.length ?? 0) + (expenses?.length ?? 0);

  const handle = async (fn: 'csv' | 'pdf') => {
    if (total === 0) {
      toast.warning(isBn ? 'এক্সপোর্ট করার মতো কোনো ডেটা নেই' : 'No data to export');
      return;
    }
    setBusy(true);
    try {
      const opts = {
        income: income ?? [],
        expenses: expenses ?? [],
        mode,
        rangeLabel,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        isBn,
      };
      if (fn === 'csv') {
        exportFinanceCsv(opts);
        toast.success(isBn ? '✅ CSV ডাউনলোড হয়েছে' : '✅ CSV downloaded');
      } else {
        exportFinancePdf(opts);
      }
    } catch (e) {
      console.error('Finance export failed', e);
      toast.error(isBn ? 'এক্সপোর্ট ব্যর্থ' : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className={className}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <FileDown className="h-3.5 w-3.5 mr-1" />
          )}
          {isBn ? 'এক্সপোর্ট' : 'Export'}
          {total > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground">({total})</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => handle('csv')} disabled={busy}>
          <FileDown className="h-4 w-4 mr-2" />
          {isBn ? 'CSV ডাউনলোড' : 'Download CSV'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('pdf')} disabled={busy}>
          <Printer className="h-4 w-4 mr-2" />
          {isBn ? 'PDF প্রিন্ট' : 'Print PDF'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
