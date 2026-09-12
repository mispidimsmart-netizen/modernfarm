import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSheds, useAddShed, useUpdateShed, useDeleteShed } from '@/hooks/useSheds';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, Plus, Pencil, Trash2, X, Check, Egg, Drumstick } from 'lucide-react';
import { toast } from 'sonner';

export function ShedManagementSheet() {
  const { language } = useAuth();
  const { data: sheds, isLoading } = useSheds();
  const addShed = useAddShed();
  const updateShed = useUpdateShed();
  const deleteShed = useDeleteShed();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    bird_capacity: 0,
    farm_type: 'layer' as string,
  });

  const handleAdd = async () => {
    if (!formData.name || !formData.name_en) {
      toast.error(language === 'bn' ? 'নাম দিন' : 'Please enter a name');
      return;
    }
    
    try {
      await addShed.mutateAsync(formData);
      toast.success(language === 'bn' ? 'শেড যোগ করা হয়েছে' : 'Shed added');
      setFormData({ name: '', name_en: '', bird_capacity: 0, farm_type: 'layer' });
      setIsAdding(false);
    } catch (error) {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error adding shed');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateShed.mutateAsync({ id, ...formData });
      toast.success(language === 'bn' ? 'আপডেট করা হয়েছে' : 'Updated');
      setEditingId(null);
    } catch (error) {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error updating');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'bn' ? 'মুছে ফেলতে চান?' : 'Delete this shed?')) return;
    
    try {
      await deleteShed.mutateAsync(id);
      toast.success(language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    } catch (error) {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error deleting');
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await updateShed.mutateAsync({ id, is_active: !currentState });
    } catch (error) {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error updating');
    }
  };

  const startEditing = (shed: typeof sheds extends (infer T)[] ? T : never) => {
    setEditingId(shed.id);
    setFormData({
      name: shed.name,
      name_en: shed.name_en,
      bird_capacity: shed.bird_capacity,
      farm_type: shed.farm_type || 'layer',
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Warehouse className="h-4 w-4" />
          {language === 'bn' ? 'শেড ম্যানেজ' : 'Manage Sheds'}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'শেড ম্যানেজমেন্ট' : 'Shed Management'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto pb-6">
          {/* Add New Shed */}
          {isAdding ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{language === 'bn' ? 'নাম (বাংলা)' : 'Name (Bangla)'}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="শেড ২"
                    />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'নাম (English)' : 'Name (English)'}</Label>
                    <Input
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Shed 2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{language === 'bn' ? 'মুরগির ধারণক্ষমতা' : 'Bird Capacity'}</Label>
                    <Input
                      type="number"
                      value={formData.bird_capacity}
                      onChange={(e) => setFormData({ ...formData, bird_capacity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'খামারের ধরণ' : 'Farm Type'}</Label>
                    <Select value={formData.farm_type} onValueChange={(v) => setFormData({ ...formData, farm_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="layer">
                          <span className="flex items-center gap-1.5">
                            <Egg className="h-3.5 w-3.5 text-amber-600" />
                            {language === 'bn' ? 'লেয়ার' : 'Layer'}
                          </span>
                        </SelectItem>
                        <SelectItem value="broiler">
                          <span className="flex items-center gap-1.5">
                            <Drumstick className="h-3.5 w-3.5 text-orange-600" />
                            {language === 'bn' ? 'ব্রয়লার' : 'Broiler'}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={addShed.isPending}>
                    <Check className="mr-1 h-4 w-4" />
                    {language === 'bn' ? 'যোগ করুন' : 'Add'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                    <X className="mr-1 h-4 w-4" />
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              {language === 'bn' ? 'নতুন শেড যোগ করুন' : 'Add New Shed'}
            </Button>
          )}

          {/* Shed List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sheds?.map((shed) => (
                <div
                  key={shed.id}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                >
                  {editingId === shed.id ? (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          value={formData.bird_capacity}
                          onChange={(e) => setFormData({ ...formData, bird_capacity: parseInt(e.target.value) || 0 })}
                          placeholder={language === 'bn' ? 'ধারণক্ষমতা' : 'Capacity'}
                        />
                        <Select value={formData.farm_type} onValueChange={(v) => setFormData({ ...formData, farm_type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="layer">{language === 'bn' ? '🥚 লেয়ার' : '🥚 Layer'}</SelectItem>
                            <SelectItem value="broiler">{language === 'bn' ? '🐔 ব্রয়লার' : '🐔 Broiler'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(shed.id)}>
                          <Check className="mr-1 h-4 w-4" />
                          {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="mr-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${shed.is_active ? 'bg-status-normal' : 'bg-status-off'}`} />
                          <span className="font-medium">
                            {language === 'bn' ? shed.name : shed.name_en}
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-muted">
                            {(shed as any).farm_type === 'broiler' ? (
                              <><Drumstick className="h-2.5 w-2.5 text-orange-600" /> {language === 'bn' ? 'ব্রয়লার' : 'Broiler'}</>
                            ) : (
                              <><Egg className="h-2.5 w-2.5 text-amber-600" /> {language === 'bn' ? 'লেয়ার' : 'Layer'}</>
                            )}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {language === 'bn' ? `ধারণক্ষমতা: ${shed.bird_capacity}` : `Capacity: ${shed.bird_capacity}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={shed.is_active}
                          onCheckedChange={() => handleToggleActive(shed.id, shed.is_active)}
                        />
                        <Button size="icon" variant="ghost" onClick={() => startEditing(shed)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(shed.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
