import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import {
  exportAuditLog,
  exportDeviceCommandLog,
  type ExportFormat,
  type ExportRange,
} from '@/lib/auditExport';

interface Props {
  source: 'audit' | 'device-commands';
}

export function ExportLogButton({ source }: Props) {
  const { user, language } = useAuth();
  const isBn = language === 'bn';
  let farmId: string | undefined;
  try {
    farmId = useFarmContext().selectedFarmId ?? undefined;
  } catch {
    farmId = undefined;
  }
  const [busy, setBusy] = useState(false);

  const handle = async (range: ExportRange, fmt: ExportFormat) => {
    if (!user) return;
    setBusy(true);
    try {
      const fn = source === 'audit' ? exportAuditLog : exportDeviceCommandLog;
      const count = await fn({ userId: user.id, farmId, range, format: fmt, isBn });
      toast.success(
        isBn
          ? `${count} টি রেকর্ড এক্সপোর্ট হয়েছে (${range.toUpperCase()} · ${fmt.toUpperCase()})`
          : `Exported ${count} records (${range.toUpperCase()} · ${fmt.toUpperCase()})`,
      );
    } catch (err: any) {
      console.error('[ExportLogButton]', err);
      toast.error(
        isBn ? 'এক্সপোর্ট ব্যর্থ হয়েছে' : `Export failed: ${err.message || 'unknown'}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy} className="gap-2">
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {isBn ? 'এক্সপোর্ট' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{isBn ? 'গত ৭ দিন' : 'Last 7 days'}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handle('7d', 'csv')}>
          <FileSpreadsheet size={14} className="mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('7d', 'pdf')}>
          <FileText size={14} className="mr-2" /> PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{isBn ? 'গত ৩০ দিন' : 'Last 30 days'}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handle('30d', 'csv')}>
          <FileSpreadsheet size={14} className="mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('30d', 'pdf')}>
          <FileText size={14} className="mr-2" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
