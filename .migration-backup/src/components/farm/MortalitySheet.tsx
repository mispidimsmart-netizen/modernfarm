import { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Skull, Plus, Calendar, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMortalityRecords, useAddMortalityRecord, useFlockInfo, useUpdateMortalityRecord, useDeleteMortalityRecord, type MortalityRecord } from '@/hooks/useFarmManagement';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ShedPicker } from '@/components/farm/ShedPicker';
import { ReadOnlyBanner } from '@/components/farm/ReadOnlyBanner';
import { usePermissions } from '@/hooks/usePermissions';

interface MortalitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CAUSES = [
  { value: 'disease', bn: 'রোগ', en: 'Disease' },
  { value: 'heat_stress', bn: 'গরম', en: 'Heat Stress' },
  { value: 'suffocation', bn: 'দম বন্ধ', en: 'Suffocation' },
  { value: 'injury', bn: 'আঘাত', en: 'Injury' },
  { value: 'predator', bn: 'শিকারি', en: 'Predator' },
  { value: 'unknown', bn: 'অজানা', en: 'Unknown' },
];

export function MortalitySheet({ open, onOpenChange }: MortalitySheetProps) {
  const { language } = useAuth();
  const { data: records, isLoading } = useMortalityRecords();
  const { data: flockInfo } = useFlockInfo();
  const { canLogDailyData } = usePermissions();
  const addRecord = useAddMortalityRecord();
  const updateRecord = useUpdateMortalityRecord();
  const deleteRecord = useDeleteMortalityRecord();
  const [editEntry, setEditEntry] = useState<MortalityRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    record_date: format(new Date(), 'yyyy-MM-dd'),
    count: 1,
    cause: 'unknown',
    age_weeks: flockInfo?.age_weeks ?? null,
    notes: '',
    shed_id: null as string | null,
  });

  const t = {
    title: { bn: 'মর্টালিটি রেকর্ড', en: 'Mortality Records' },
    addNew: { bn: 'নতুন এন্ট্রি', en: 'Add Entry' },
    history: { bn: 'ইতিহাস', en: 'History' },
    date: { bn: 'তারিখ', en: 'Date' },
    count: { bn: 'সংখ্যা', en: 'Count' },
    cause: { bn: 'কারণ', en: 'Cause' },
    ageWeeks: { bn: 'বয়স (সপ্তাহ)', en: 'Age (weeks)' },
    notes: { bn: 'নোট', en: 'Notes' },
    save: { bn: 'সংরক্ষণ', en: 'Save' },
    noData: { bn: 'কোনো রেকর্ড নেই', en: 'No records' },
    birds: { bn: 'টি', en: '' },
    mortalityRate: { bn: 'মর্টালিটি রেট', en: 'Mortality Rate' },
    last30Days: { bn: 'গত ৩০ দিন', en: 'Last 30 days' },
    edit: { bn: '✏️ মৃত্যু এন্ট্রি এডিট', en: '✏️ Edit Mortality Entry' },
    update: { bn: 'আপডেট', en: 'Update' },
    cancel: { bn: 'বাতিল', en: 'Cancel' },
    delete: { bn: 'মুছুন', en: 'Delete' },
    confirmDelete: { bn: 'এই এন্ট্রি মুছবেন?', en: 'Delete this entry?' },
    confirmDeleteDesc: { bn: 'মৃত্যু রেকর্ড স্থায়ীভাবে মুছে যাবে।', en: 'Mortality record will be permanently deleted.' },
  };

  const totalMortality = records?.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const mortalityRate = flockInfo?.total_birds 
    ? ((totalMortality / flockInfo.total_birds) * 100).toFixed(2)
    : '0';

  const handleSubmit = () => {
    addRecord.mutate({
      ...formData,
      age_weeks: formData.age_weeks || null,
      notes: formData.notes || null,
      shed_id: formData.shed_id || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-red-500" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        {!canLogDailyData && <div className="mb-3"><ReadOnlyBanner /></div>}

        {/* Summary */}
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">{t.mortalityRate[language]}</p>
              <p className="text-xs text-muted-foreground">{t.last30Days[language]}</p>
            </div>
            <div className="flex items-center gap-2">
              {Number(mortalityRate) > 2 && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-2xl font-bold text-red-600">{mortalityRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="add">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">{t.addNew[language]}</TabsTrigger>
            <TabsTrigger value="history">{t.history[language]}</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.date[language]}</Label>
                <SmartDatePicker
                  value={formData.record_date || null}
                  onChange={(iso) => setFormData(p => ({ ...p, record_date: iso }))}
                  disableFuture
                />
              </div>
              <div className="space-y-2">
                <Label>{t.count[language]}</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.count}
                  onChange={(e) => setFormData(p => ({ ...p, count: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <ShedPicker
              value={formData.shed_id}
              onChange={(id) => setFormData(p => ({ ...p, shed_id: id }))}
            />

            <div className="space-y-2">
              <Label>{t.cause[language]}</Label>
              <Select 
                value={formData.cause} 
                onValueChange={(v) => setFormData(p => ({ ...p, cause: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAUSES.map(cause => (
                    <SelectItem key={cause.value} value={cause.value}>
                      {cause[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.ageWeeks[language]}</Label>
              <Input
                type="number"
                min="0"
                value={formData.age_weeks ?? ''}
                onChange={(e) => setFormData(p => ({ ...p, age_weeks: parseInt(e.target.value) || null }))}
                placeholder={flockInfo?.age_weeks?.toString() ?? ''}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.notes[language]}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder={language === 'bn' ? 'বিস্তারিত লিখুন...' : 'Add details...'}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={addRecord.isPending || !canLogDailyData}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>
          </TabsContent>

          <TabsContent value="history" className="h-[calc(100%-120px)] overflow-y-auto pt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : records && records.length > 0 ? (
              <div className="space-y-2">
                {records.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="flex items-center justify-between gap-2 p-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm">
                            {format(new Date(entry.record_date), 'dd MMM', {
                              locale: language === 'bn' ? bn : enUS
                            })}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {CAUSES.find(c => c.value === entry.cause)?.[language]}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-red-600 shrink-0">
                        {entry.count} {t.birds[language]}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditEntry(entry)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Skull className="mb-2 h-12 w-12 opacity-20" />
                <p>{t.noData[language]}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit dialog */}
        <Dialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.edit[language]}</DialogTitle></DialogHeader>
            {editEntry && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.date[language]}</Label>
                    <SmartDatePicker value={editEntry.record_date}
                      onChange={(iso) => setEditEntry({ ...editEntry, record_date: iso })} disableFuture />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.count[language]}</Label>
                    <Input type="number" min="1" value={editEntry.count}
                      onChange={(e) => setEditEntry({ ...editEntry, count: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.cause[language]}</Label>
                  <Select value={editEntry.cause}
                    onValueChange={(v) => setEditEntry({ ...editEntry, cause: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAUSES.map(c => <SelectItem key={c.value} value={c.value}>{c[language]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.notes[language]}</Label>
                  <Input value={editEntry.notes ?? ''}
                    onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEntry(null)}>{t.cancel[language]}</Button>
              <Button onClick={() => {
                if (editEntry) {
                  updateRecord.mutate({
                    id: editEntry.id,
                    count: editEntry.count,
                    cause: editEntry.cause,
                    record_date: editEntry.record_date,
                    notes: editEntry.notes,
                  }, { onSuccess: () => setEditEntry(null) });
                }
              }}>{t.update[language]}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmDelete[language]}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmDeleteDesc[language]}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteId) deleteRecord.mutate(deleteId); setDeleteId(null); }}>
                {t.delete[language]}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
