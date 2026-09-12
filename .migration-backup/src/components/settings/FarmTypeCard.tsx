import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Egg, Drumstick, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useFarmData';
import { useSheds, useSelectedShed, useUpdateShed } from '@/hooks/useSheds';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';

type FarmType = 'layer' | 'broiler';

interface FarmTypeOption {
  id: FarmType;
  icon: React.ElementType;
  name: { bn: string; en: string };
  description: { bn: string; en: string };
  color: string;
  bgColor: string;
  features: { bn: string; en: string }[];
}

const FARM_TYPES: FarmTypeOption[] = [
  {
    id: 'layer',
    icon: Egg,
    name: { bn: 'লেয়ার ফার্ম', en: 'Layer Farm' },
    description: { bn: 'ডিম উৎপাদন কেন্দ্রিক', en: 'Egg production focused' },
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    features: [
      { bn: 'ডিম উৎপাদন ট্র্যাকিং', en: 'Egg production tracking' },
      { bn: 'গ্রেড অনুযায়ী ভাগ', en: 'Grade categorization' },
      { bn: 'স্থির তাপমাত্রা নিয়ন্ত্রণ', en: 'Static temp control' },
    ],
  },
  {
    id: 'broiler',
    icon: Drumstick,
    name: { bn: 'ব্রয়লার ফার্ম', en: 'Broiler Farm' },
    description: { bn: 'মাংস উৎপাদন কেন্দ্রিক', en: 'Meat production focused' },
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    features: [
      { bn: 'ব্যাচ ম্যানেজমেন্ট', en: 'Batch management' },
      { bn: 'ওজন ও FCR ট্র্যাকিং', en: 'Weight & FCR tracking' },
      { bn: 'বয়স-ভিত্তিক তাপমাত্রা', en: 'Age-based temp control' },
    ],
  },
];

export function FarmTypeCard() {
  const { language } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: sheds } = useSheds();
  const updateShed = useUpdateShed();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingType, setPendingType] = useState<FarmType | null>(null);
  
  let selectedShedId: string | null = null;
  try {
    const ctx = useSelectedShed();
    selectedShedId = ctx.selectedShedId;
  } catch {
    // ShedProvider not available
  }
  
  const selectedShed = sheds?.find(s => s.id === selectedShedId);
  const currentType = (selectedShed?.farm_type as FarmType) || (profile?.farm_type as FarmType) || 'layer';

  const handleTypeSelect = (type: FarmType) => {
    if (type === currentType) return;
    setPendingType(type);
    setShowConfirmDialog(true);
  };

  const handleConfirmChange = async () => {
    if (!pendingType) return;
    
    try {
      // Primary: update the selected shed's farm_type
      if (selectedShedId) {
        await updateShed.mutateAsync({ id: selectedShedId, farm_type: pendingType } as any);
      }
      // Backward compatibility: also update profile (only if no shed selected)
      if (!selectedShedId) {
        await updateProfile.mutateAsync({ farm_type: pendingType });
      }
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' 
          ? `${selectedShed ? (selectedShed as any).name + ' — ' : ''}${pendingType === 'layer' ? 'লেয়ার' : 'ব্রয়লার'} মোডে পরিবর্তন হয়েছে`
          : `${selectedShed ? (selectedShed as any).name_en + ' — ' : ''}Switched to ${pendingType} mode`,
      });
      setShowConfirmDialog(false);
      setPendingType(null);
    } catch (error) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {language === 'bn' ? 'খামারের ধরণ' : 'Farm Type'}
              </CardTitle>
              <CardDescription>
                {selectedShed 
                  ? (language === 'bn' 
                    ? `🏠 ${(selectedShed as any).name || 'শেড'} — এই শেডের ধরণ পরিবর্তন করুন` 
                    : `🏠 ${(selectedShed as any).name_en || 'Shed'} — Change this shed's type`)
                  : (language === 'bn' 
                    ? 'আপনার খামারের ধরণ অনুযায়ী ফিচার পরিবর্তন হবে' 
                    : 'Features will adapt based on farm type')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Farm Type Options */}
          <div className="grid grid-cols-2 gap-3">
            {FARM_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = currentType === type.id;
              
              return (
                <motion.button
                  key={type.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTypeSelect(type.id)}
                  className={`relative rounded-2xl p-4 text-left transition-all ${
                    isSelected
                      ? `${type.bgColor} border-2 border-current ${type.color} shadow-lg`
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.div>
                  )}
                  
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${type.bgColor}`}>
                    <Icon className={`h-6 w-6 ${type.color}`} />
                  </div>
                  
                  <p className={`font-bold ${isSelected ? type.color : 'text-foreground'}`}>
                    {type.name[language]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {type.description[language]}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Current Type Features */}
          <div className="rounded-xl bg-muted/30 p-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              {language === 'bn' ? '✨ সক্রিয় ফিচারসমূহ' : '✨ Active Features'}
            </p>
            <div className="space-y-2">
              {FARM_TYPES.find(t => t.id === currentType)?.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{feature[language]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Broiler Coming Soon Notice */}
          {currentType === 'layer' && (
            <div className="flex items-start gap-2 rounded-lg bg-orange-100 dark:bg-orange-900/20 p-3 text-orange-800 dark:text-orange-200">
              <Drumstick className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">
                {language === 'bn' 
                  ? 'ব্রয়লার মোডে ব্যাচ ম্যানেজমেন্ট, ওজন ট্র্যাকিং ও বয়স-ভিত্তিক অটোমেশন পাবেন!'
                  : 'Broiler mode includes batch management, weight tracking & age-based automation!'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <AlertDialogTitle>
                  {language === 'bn' ? 'খামারের ধরণ পরিবর্তন?' : 'Change Farm Type?'}
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="pt-2">
              {language === 'bn' 
                ? `আপনি কি ${pendingType === 'layer' ? 'লেয়ার' : 'ব্রয়লার'} মোডে পরিবর্তন করতে চান? এটি করলে ড্যাশবোর্ড ও ফিচারগুলো পরিবর্তন হবে। আপনার বিদ্যমান ডেটা সংরক্ষিত থাকবে।`
                : `Switch to ${pendingType} mode? This will change your dashboard and available features. Your existing data will be preserved.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChange}
              disabled={updateProfile.isPending}
              className="bg-primary"
            >
              {updateProfile.isPending 
                ? (language === 'bn' ? 'পরিবর্তন হচ্ছে...' : 'Switching...') 
                : (language === 'bn' ? 'হ্যাঁ, পরিবর্তন করুন' : 'Yes, Switch')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
