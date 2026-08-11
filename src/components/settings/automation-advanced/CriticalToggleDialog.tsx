import { ShieldAlert } from 'lucide-react';
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

interface Props {
  language: string;
  pendingId: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function CriticalToggleDialog({ language, pendingId, onOpenChange, onConfirm }: Props) {
  const bn = language === 'bn';
  return (
    <AlertDialog open={!!pendingId} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            {bn ? 'বিপদজনক পরিবর্তন!' : 'Dangerous Change!'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block font-medium text-foreground">
              {bn ? 'এতে মুরগির ক্ষতি হতে পারে — আপনি কি নিশ্চিত?' : 'This could harm the birds — are you sure?'}
            </span>
            {pendingId === 'min_vent' && (
              <span className="block text-sm">
                {bn
                  ? '⚠️ ভেন্টিলেশন বন্ধ করলে গ্যাস জমে মুরগির শ্বাসকষ্ট হতে পারে এবং মৃত্যুও ঘটতে পারে।'
                  : '⚠️ Disabling ventilation can cause gas buildup leading to respiratory distress and death.'}
              </span>
            )}
            {pendingId === 'heater' && (
              <span className="block text-sm">
                {bn
                  ? '⚠️ হিটার বন্ধ করলে শীতকালে বাচ্চা মুরগি মারা যেতে পারে।'
                  : '⚠️ Disabling heater can kill chicks during cold weather.'}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            {bn ? 'হ্যাঁ, বন্ধ করুন' : 'Yes, Disable'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
