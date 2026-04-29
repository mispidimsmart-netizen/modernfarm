import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  useEggProduction,
  useExpenses,
  useMortalityRecords,
  useDeleteEggProduction,
  useDeleteExpense,
  useDeleteMortalityRecord,
  useUpdateEggProduction,
  useUpdateExpense,
  useUpdateMortalityRecord,
} from '@/hooks/useFarmManagement';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Egg, Skull, Wallet, Pencil, Trash2, Save, X } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';

type EntryType = 'egg' | 'mortality' | 'expense';

interface RecentEntry {
  id: string;
  type: EntryType;
  date: string;
  label: string;
  // Raw values needed for inline edit:
  raw: {
    total_eggs?: number;
    count?: number;
    amount?: number;
    description?: string | null;
  };
}

export function RecentEntryHistory() {
  const { language } = useAuth();
  const { data: eggs } = useEggProduction(7);
  const { data: expenses } = useExpenses(7);
  const { data: mortality } = useMortalityRecords(7);
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const activeBatchId = isLayer
    ? activeLayerBatch?.id ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.id ?? null
      : null;
  const financeScope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart: null };

  const deleteEgg = useDeleteEggProduction();
  const deleteExp = useDeleteExpense();
  const deleteMort = useDeleteMortalityRecord();
  const updateEgg = useUpdateEggProduction();
  const updateExp = useUpdateExpense();
  const updateMort = useUpdateMortalityRecord();

  const [confirmDelete, setConfirmDelete] = useState<RecentEntry | null>(null);
  const [editEntry, setEditEntry] = useState<RecentEntry | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const today = new Date().toISOString().split('T')[0];
  const hasTodayEggs = eggs?.some((e) => e.production_date === today);
  const missingEntries = isLayer && !hasTodayEggs;
  const scopedExpenses = (expenses ?? []).filter((e: any) =>
    matchesActiveFinanceScope(e, 'expense', financeScope),
  );

  // Build recent entries list (last 5)
  const recentEntries: RecentEntry[] = [
    ...((isLayer ? eggs : [])?.slice(0, 3).map((e) => ({
      id: e.id,
      type: 'egg' as const,
      date: e.production_date,
      label: language === 'bn' ? `🥚 ডিম: ${e.total_eggs}টি` : `🥚 Eggs: ${e.total_eggs}`,
      raw: { total_eggs: e.total_eggs },
    })) ?? []),
    ...(mortality?.slice(0, 2).map((m) => ({
      id: m.id,
      type: 'mortality' as const,
      date: m.record_date,
      label: language === 'bn' ? `💀 মৃত্যু: ${m.count}টি` : `💀 Deaths: ${m.count}`,
      raw: { count: m.count },
    })) ?? []),
    ...(scopedExpenses.slice(0, 2).map((e) => ({
      id: e.id,
      type: 'expense' as const,
      date: e.expense_date,
      label:
        language === 'bn'
          ? `💰 খরচ: ৳${Number(e.amount).toLocaleString('bn-BD')}`
          : `💰 Expense: ৳${Number(e.amount).toLocaleString()}`,
      raw: { amount: Number(e.amount), description: e.description },
    })) ?? []),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const handleDelete = () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    if (confirmDelete.type === 'egg') deleteEgg.mutate(id);
    else if (confirmDelete.type === 'expense') deleteExp.mutate(id);
    else if (confirmDelete.type === 'mortality') deleteMort.mutate(id);
    setConfirmDelete(null);
  };

  const openEdit = (entry: RecentEntry) => {
    setEditEntry(entry);
    setEditValue(
      entry.type === 'egg'
        ? entry.raw.total_eggs ?? 0
        : entry.type === 'mortality'
          ? entry.raw.count ?? 0
          : entry.raw.amount ?? 0,
    );
  };

  const handleSaveEdit = () => {
    if (!editEntry) return;
    const id = editEntry.id;
    if (editEntry.type === 'egg') {
      updateEgg.mutate({ id, total_eggs: editValue });
    } else if (editEntry.type === 'mortality') {
      updateMort.mutate({ id, count: editValue });
    } else if (editEntry.type === 'expense') {
      updateExp.mutate({ id, amount: editValue });
    }
    setEditEntry(null);
  };

  const editFieldLabel =
    editEntry?.type === 'egg'
      ? language === 'bn' ? 'মোট ডিম' : 'Total eggs'
      : editEntry?.type === 'mortality'
        ? language === 'bn' ? 'মৃত্যু সংখ্যা' : 'Death count'
        : language === 'bn' ? 'টাকার পরিমাণ' : 'Amount';

  return (
    <div className="space-y-3">
      {/* Missing Entry Reminder */}
      {missingEntries && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {language === 'bn' ? '⚠️ আজ এন্ট্রি হয়নি!' : '⚠️ No entry today!'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn'
                  ? 'ডিম উৎপাদন এন্ট্রি দিন যাতে রিপোর্ট সঠিক থাকে'
                  : 'Enter egg production to keep reports accurate'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLayer && !missingEntries && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {language === 'bn' ? '✅ আজকের এন্ট্রি সম্পন্ন' : "✅ Today's entry complete"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Entries with edit/delete */}
      {recentEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {language === 'bn' ? '📋 সাম্প্রতিক এন্ট্রি' : '📋 Recent Entries'}
          </p>
          <div className="space-y-1.5">
            {recentEntries.map((entry) => (
              <div
                key={`${entry.type}-${entry.id}`}
                className="flex items-center gap-2 text-xs rounded-lg bg-muted/40 px-3 py-2 group"
              >
                <span className="flex-1 truncate">{entry.label}</span>
                <span className="text-muted-foreground shrink-0">
                  {isToday(parseISO(entry.date))
                    ? language === 'bn' ? 'আজ' : 'Today'
                    : format(parseISO(entry.date), 'dd MMM')}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => openEdit(entry)}
                    aria-label={language === 'bn' ? 'এডিট' : 'Edit'}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDelete(entry)}
                    aria-label={language === 'bn' ? 'ডিলিট' : 'Delete'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'bn' ? 'এন্ট্রি মুছবেন?' : 'Delete entry?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn'
                ? `"${confirmDelete?.label}" — এই এন্ট্রি স্থায়ীভাবে মুছে যাবে। এটি পুনরুদ্ধার করা যাবে না।`
                : `"${confirmDelete?.label}" will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inline edit dialog */}
      <Dialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {language === 'bn' ? '✏️ এন্ট্রি এডিট' : '✏️ Edit Entry'}
            </DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">{editEntry.label}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">{editFieldLabel}</Label>
                <Input
                  type="number"
                  min="0"
                  step={editEntry.type === 'expense' ? '0.01' : '1'}
                  value={editValue}
                  onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                  className="h-11"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {language === 'bn'
                  ? '💡 আরও বিস্তারিত পরিবর্তনের জন্য সংশ্লিষ্ট এন্ট্রি কার্ড থেকে নতুন এন্ট্রি যোগ করুন।'
                  : '💡 For detailed edits, add a new entry from the related card.'}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditEntry(null)}>
              <X className="mr-1.5 h-4 w-4" />
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="mr-1.5 h-4 w-4" />
              {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
