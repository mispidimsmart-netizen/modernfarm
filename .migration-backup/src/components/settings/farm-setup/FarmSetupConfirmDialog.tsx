import { AlertTriangle } from 'lucide-react';
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
import type { PendingSetupChange } from '@/hooks/useFarmSetupForm';

interface FarmSetupConfirmDialogProps {
  language: 'bn' | 'en';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingChange: PendingSetupChange | null;
  onConfirm: () => void;
}

export function FarmSetupConfirmDialog({
  language,
  open,
  onOpenChange,
  pendingChange,
  onConfirm,
}: FarmSetupConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {language === 'bn' ? 'সেটিংস পরিবর্তন নিশ্চিত করুন' : 'Confirm Settings Change'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {pendingChange?.label && (
                <p className="font-medium text-foreground">
                  {language === 'bn'
                    ? `আপনি "${pendingChange.label}" এ পরিবর্তন করতে চাইছেন।`
                    : `You are changing to "${pendingChange.label}".`}
                </p>
              )}
              <p>
                {language === 'bn'
                  ? 'এই পরিবর্তন আপনার অটোমেশন সিস্টেমে প্রভাব ফেলবে:'
                  : 'This change will affect your automation system:'}
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                {pendingChange?.type === 'farm_type' && (
                  <>
                    <li>{language === 'bn' ? 'সমস্ত থ্রেশহোল্ড ভ্যালু রিসেট হবে' : 'All threshold values will reset'}</li>
                    <li>{language === 'bn' ? 'অটোমেশন রুল পুনরায় কনফিগার হবে' : 'Automation rules will reconfigure'}</li>
                  </>
                )}
                {pendingChange?.type === 'season' && (
                  <>
                    <li>{language === 'bn' ? 'তাপমাত্রা সীমা পরিবর্তন হবে' : 'Temperature limits will change'}</li>
                    <li>{language === 'bn' ? 'ভেন্টিলেশন সেটিংস আপডেট হবে' : 'Ventilation settings will update'}</li>
                  </>
                )}
                {pendingChange?.type === 'profile' && (
                  <>
                    <li>{language === 'bn' ? 'তাপমাত্রা ও আর্দ্রতার থ্রেশহোল্ড পরিবর্তন হবে' : 'Temperature & humidity thresholds will change'}</li>
                    <li>{language === 'bn' ? 'হিটার/ফ্যান অটোমেশন আপডেট হবে' : 'Heater/Fan automation will update'}</li>
                  </>
                )}
                {pendingChange?.type === 'apply' && (
                  <>
                    <li>{language === 'bn' ? 'তাপমাত্রা ও আর্দ্রতার থ্রেশহোল্ড পরিবর্তন হবে' : 'Temperature & humidity thresholds will change'}</li>
                    <li>{language === 'bn' ? 'ফ্যান এবং হিটার অটোমেশন রিসেট হবে' : 'Fan and heater automation will reset'}</li>
                    <li>{language === 'bn' ? 'অ্যালার্ম সেটিংস পুনরায় কনফিগার হবে' : 'Alarm settings will reconfigure'}</li>
                  </>
                )}
              </ul>
              <p className="font-medium text-foreground pt-2">
                {language === 'bn'
                  ? 'আপনি কি নিশ্চিত এই পরিবর্তন করতে চান?'
                  : 'Are you sure you want to make this change?'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary">
            {language === 'bn' ? 'হ্যাঁ, পরিবর্তন করুন' : 'Yes, Change'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
