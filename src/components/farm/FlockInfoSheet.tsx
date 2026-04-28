import { useState, useEffect } from 'react';
import { Bird, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFlockInfo, useUpdateFlockInfo } from '@/hooks/useFarmManagement';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { BirdAgeCard } from '@/components/farm/BirdAgeCard';

interface FlockInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BREEDS = [
  { value: 'isa_brown', bn: 'আইএসএ ব্রাউন (ISA Brown)', en: 'ISA Brown' },
  { value: 'hy_line_brown', bn: 'হাই-লাইন ব্রাউন (Hy-Line Brown)', en: 'Hy-Line Brown' },
  { value: 'hy_line_w36', bn: 'হাই-লাইন W-36 (Hy-Line W-36)', en: 'Hy-Line W-36' },
  { value: 'lohmann_brown', bn: 'লোহম্যান ব্রাউন (Lohmann Brown)', en: 'Lohmann Brown' },
  { value: 'lohmann_lsl', bn: 'লোহম্যান এলএসএল (Lohmann LSL)', en: 'Lohmann LSL' },
  { value: 'bovans_brown', bn: 'বোভান্স ব্রাউন (Bovans Brown)', en: 'Bovans Brown' },
  { value: 'bovans_white', bn: 'বোভান্স হোয়াইট (Bovans White)', en: 'Bovans White' },
  { value: 'hisex_brown', bn: 'হাইসেক্স ব্রাউন (Hisex Brown)', en: 'Hisex Brown' },
  { value: 'novogen_brown', bn: 'নোভোজেন ব্রাউন (Novogen Brown)', en: 'Novogen Brown' },
  { value: 'shaver', bn: 'শেভার (Shaver 579)', en: 'Shaver 579' },
  { value: 'bv300', bn: 'বিভি-৩০০ (BV-300)', en: 'BV-300' },
  { value: 'sonali', bn: 'সোনালী (Sonali)', en: 'Sonali' },
  { value: 'local', bn: 'দেশি (Local)', en: 'Local' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

export function FlockInfoSheet({ open, onOpenChange }: FlockInfoSheetProps) {
  const { language } = useAuth();
  const { data: flockInfo, isLoading } = useFlockInfo();
  const updateFlockInfo = useUpdateFlockInfo();
  
  const [formData, setFormData] = useState({
    total_birds: 0,
    breed: 'layer',
    purchase_date: '',
  });

  useEffect(() => {
    if (flockInfo) {
      setFormData({
        total_birds: flockInfo.total_birds,
        breed: flockInfo.breed || 'layer',
        purchase_date: flockInfo.purchase_date || '',
      });
    }
  }, [flockInfo]);

  const t = {
    title: { bn: 'মুরগির তথ্য', en: 'Flock Information' },
    totalBirds: { bn: 'মোট মুরগি', en: 'Total Birds' },
    breed: { bn: 'জাত', en: 'Breed' },
    purchaseDate: { bn: 'ক্রয়ের তারিখ', en: 'Purchase Date' },
    save: { bn: 'সংরক্ষণ করুন', en: 'Save' },
    tips: { bn: 'পরামর্শ', en: 'Tips' },
    ageNote: {
      bn: 'বয়স সকল ফিচারে (লাইটিং, অটোমেশন) একসাথে আপডেট হবে',
      en: 'Age updates everywhere (lighting, automation) at once',
    },
  };

  const tips = language === 'bn' 
    ? [
        '২০-৭৮ সপ্তাহ বয়সে সর্বোচ্চ ডিম উৎপাদন হয়',
        'প্রতি ১০০ মুরগিতে দৈনিক ১০-১২ কেজি খাদ্য লাগে',
        '১৪-১৬ ঘন্টা আলো উৎপাদন বাড়ায়',
      ]
    : [
        'Peak production is between 20-78 weeks of age',
        '100 birds need 10-12 kg feed daily',
        '14-16 hours of light increases production',
      ];

  const handleSubmit = () => {
    updateFlockInfo.mutate({
      ...formData,
      purchase_date: formData.purchase_date || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bird className="h-5 w-5 text-primary" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {/* 🐔 Unified Bird Age — single source of truth */}
            <BirdAgeCard />

            <div className="space-y-2">
              <Label>{t.totalBirds[language]}</Label>
              <Input
                type="number"
                min="0"
                value={formData.total_birds || ''}
                onChange={(e) => setFormData(p => ({ ...p, total_birds: parseInt(e.target.value) || 0 }))}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label>{t.breed[language]}</Label>
              <Select 
                value={formData.breed} 
                onValueChange={(v) => setFormData(p => ({ ...p, breed: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BREEDS.map(breed => (
                    <SelectItem key={breed.value} value={breed.value}>
                      {breed[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.purchaseDate[language]}</Label>
              <SmartDatePicker
                value={formData.purchase_date || null}
                onChange={(iso) => setFormData(p => ({ ...p, purchase_date: iso }))}
                placeholder={language === 'bn' ? 'তারিখ বাছাই করুন' : 'Pick a date'}
                disableFuture
                presets={[
                  { labelBn: 'আজ', labelEn: 'Today', daysAgo: 0 },
                  { labelBn: '১ সপ্তাহ আগে', labelEn: '1 week ago', daysAgo: 7 },
                  { labelBn: '১ মাস আগে', labelEn: '1 month ago', daysAgo: 30 },
                  { labelBn: '৩ মাস আগে', labelEn: '3 months ago', daysAgo: 90 },
                  { labelBn: '৬ মাস আগে', labelEn: '6 months ago', daysAgo: 180 },
                ]}
              />
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={updateFlockInfo.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>

            {/* Tips Card */}
            <Card className="mt-6 bg-primary/5">
              <CardContent className="p-4">
                <h4 className="mb-2 font-medium text-primary">{t.tips[language]}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
