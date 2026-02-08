import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Timer, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ManualControlTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  deviceIcon: React.ReactNode;
  onConfirm: (durationMinutes: number) => void;
  onCancel: () => void;
}

const DURATION_OPTIONS = [
  { minutes: 10, label: { bn: '১০ মিনিট', en: '10 minutes' } },
  { minutes: 30, label: { bn: '৩০ মিনিট', en: '30 minutes' } },
  { minutes: 60, label: { bn: '১ ঘন্টা', en: '1 hour' } },
];

export function ManualControlTimerDialog({
  open,
  onOpenChange,
  deviceName,
  deviceIcon,
  onConfirm,
  onCancel,
}: ManualControlTimerDialogProps) {
  const { language } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedDuration) {
      onConfirm(selectedDuration);
      onOpenChange(false);
      setSelectedDuration(null);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
    setSelectedDuration(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {deviceIcon}
            </div>
            <div>
              <span className="block">
                {language === 'bn' ? 'কতক্ষণ চালাবেন?' : 'Run for how long?'}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {deviceName}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="pt-2 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {language === 'bn' 
                ? 'নির্ধারিত সময় পর স্বয়ংক্রিয়ভাবে অটো মোডে ফিরে যাবে' 
                : 'Will automatically return to AUTO mode after the timer expires'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {DURATION_OPTIONS.map((option) => (
            <motion.button
              key={option.minutes}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedDuration(option.minutes)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                selectedDuration === option.minutes
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border bg-muted/30 hover:border-primary/50'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                selectedDuration === option.minutes
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Timer className="h-5 w-5" />
              </div>
              <span className={`text-sm font-medium ${
                selectedDuration === option.minutes
                  ? 'text-primary'
                  : 'text-foreground'
              }`}>
                {option.label[language]}
              </span>
              
              {selectedDuration === option.minutes && (
                <motion.div
                  layoutId="selected-duration"
                  className="absolute inset-0 rounded-2xl border-2 border-primary"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDuration}
            className="flex-1"
          >
            <Clock className="h-4 w-4 mr-2" />
            {language === 'bn' ? 'শুরু করুন' : 'Start Timer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
