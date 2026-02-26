import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEggProduction, useExpenses, useIncome, useMortalityRecords } from '@/hooks/useFarmManagement';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export function DataExportButton() {
  const { language } = useAuth();
  const { data: eggs } = useEggProduction(90);
  const { data: expenses } = useExpenses(90);
  const { data: income } = useIncome(90);
  const { data: mortality } = useMortalityRecords(90);
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);

    try {
      const lines: string[] = [];

      // Egg Production
      lines.push('--- Egg Production ---');
      lines.push('Date,Total,Grade A,Grade B,Grade C,Broken');
      eggs?.forEach(e => {
        lines.push(`${e.production_date},${e.total_eggs},${e.grade_a},${e.grade_b},${e.grade_c},${e.broken}`);
      });

      lines.push('');

      // Expenses
      lines.push('--- Expenses ---');
      lines.push('Date,Category,Amount,Description');
      expenses?.forEach(e => {
        lines.push(`${e.expense_date},${e.category},${e.amount},"${e.description || ''}"`);
      });

      lines.push('');

      // Income
      lines.push('--- Income ---');
      lines.push('Date,Category,Amount,Description');
      income?.forEach(i => {
        lines.push(`${i.income_date},${i.category},${i.amount},"${i.description || ''}"`);
      });

      lines.push('');

      // Mortality
      lines.push('--- Mortality ---');
      lines.push('Date,Count,Cause');
      mortality?.forEach(m => {
        lines.push(`${m.record_date},${m.count},"${m.cause || ''}"`);
      });

      const csv = lines.join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farm-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(language === 'bn' ? '✅ রিপোর্ট ডাউনলোড হয়েছে' : '✅ Report downloaded');
    } catch {
      toast.error(language === 'bn' ? 'ডাউনলোড ব্যর্থ' : 'Download failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      disabled={isExporting}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {language === 'bn' ? 'CSV ডাউনলোড' : 'Download CSV'}
    </Button>
  );
}
