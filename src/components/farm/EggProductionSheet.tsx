import { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Egg, Plus, Calendar, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEggProduction, useAddEggProduction, useUpdateEggProduction, useDeleteEggProduction, type EggProduction } from '@/hooks/useFarmManagement';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface EggProductionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EggProductionSheet({ open, onOpenChange }: EggProductionSheetProps) {
  const { language } = useAuth();
  const { data: eggData, isLoading } = useEggProduction();
  const addEggProduction = useAddEggProduction();
  const updateEgg = useUpdateEggProduction();
  const deleteEgg = useDeleteEggProduction();
  const [editEntry, setEditEntry] = useState<EggProduction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    production_date: format(new Date(), 'yyyy-MM-dd'),
    total_eggs: 0,
    grade_a: 0,
    grade_b: 0,
    grade_c: 0,
    broken: 0,
    notes: '',
  });

  const t = {
    title: { bn: 'ডিম উৎপাদন', en: 'Egg Production' },
    addNew: { bn: 'নতুন এন্ট্রি', en: 'Add Entry' },
    history: { bn: 'ইতিহাস', en: 'History' },
    date: { bn: 'তারিখ', en: 'Date' },
    totalEggs: { bn: 'মোট ডিম', en: 'Total Eggs' },
    gradeA: { bn: 'গ্রেড A', en: 'Grade A' },
    gradeB: { bn: 'গ্রেড B', en: 'Grade B' },
    gradeC: { bn: 'গ্রেড C', en: 'Grade C' },
    broken: { bn: 'ভাঙা', en: 'Broken' },
    notes: { bn: 'নোট', en: 'Notes' },
    save: { bn: 'সংরক্ষণ করুন', en: 'Save' },
    noData: { bn: 'কোনো ডেটা নেই', en: 'No data' },
    edit: { bn: '✏️ ডিম এন্ট্রি এডিট', en: '✏️ Edit Egg Entry' },
    delete: { bn: 'মুছুন', en: 'Delete' },
    cancel: { bn: 'বাতিল', en: 'Cancel' },
    save:2: { bn: 'আপডেট', en: 'Update' },
    confirmDelete: { bn: 'এই এন্ট্রি মুছবেন?', en: 'Delete this entry?' },
    confirmDeleteDesc: { bn: 'এই ডিম এন্ট্রি স্থায়ীভাবে মুছে যাবে।', en: 'This egg entry will be permanently deleted.' },

  const handleSubmit = () => {
    addEggProduction.mutate({
      ...formData,
      total_eggs: formData.grade_a + formData.grade_b + formData.grade_c + formData.broken,
      notes: formData.notes || null,
    });
  };

  const updateForm = (field: string, value: number | string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (['grade_a', 'grade_b', 'grade_c', 'broken'].includes(field)) {
        updated.total_eggs = updated.grade_a + updated.grade_b + updated.grade_c + updated.broken;
      }
      return updated;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Egg className="h-5 w-5 text-amber-500" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="add" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">{t.addNew[language]}</TabsTrigger>
            <TabsTrigger value="history">{t.history[language]}</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.date[language]}</Label>
              <SmartDatePicker
                value={formData.production_date || null}
                onChange={(iso) => updateForm('production_date', iso)}
                disableFuture
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.gradeA[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.grade_a || ''}
                  onChange={(e) => updateForm('grade_a', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.gradeB[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.grade_b || ''}
                  onChange={(e) => updateForm('grade_b', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.gradeC[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.grade_c || ''}
                  onChange={(e) => updateForm('grade_c', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.broken[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.broken || ''}
                  onChange={(e) => updateForm('broken', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">{t.totalEggs[language]}</p>
              <p className="text-3xl font-bold text-primary">{formData.total_eggs}</p>
            </div>

            <div className="space-y-2">
              <Label>{t.notes[language]}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder={language === 'bn' ? 'ঐচ্ছিক নোট...' : 'Optional notes...'}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={addEggProduction.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>
          </TabsContent>

          <TabsContent value="history" className="h-[calc(100%-60px)] overflow-y-auto pt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : eggData && eggData.length > 0 ? (
              <div className="space-y-2">
                {eggData.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(entry.production_date), 'dd MMM', { 
                            locale: language === 'bn' ? bn : enUS 
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{entry.total_eggs} টি</p>
                        <p className="text-xs text-muted-foreground">
                          A:{entry.grade_a} B:{entry.grade_b} C:{entry.grade_c}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Egg className="mb-2 h-12 w-12 opacity-20" />
                <p>{t.noData[language]}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
