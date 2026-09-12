import { Loader2, Send } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Firmware } from '@/hooks/useOtaManagement';

interface DeviceToken {
  id: string;
  device_name: string;
}

interface Props {
  language: string;
  deleteOpen: boolean;
  onDeleteOpenChange: (v: boolean) => void;
  onConfirmDelete: () => void;
  pushOpen: boolean;
  onPushOpenChange: (v: boolean) => void;
  selectedFirmware: Firmware | null;
  deviceTokens?: DeviceToken[];
  selectedDevice: string;
  setSelectedDevice: (v: string) => void;
  onConfirmPush: () => void;
  isPushing: boolean;
}

export function OtaDialogs({
  language,
  deleteOpen,
  onDeleteOpenChange,
  onConfirmDelete,
  pushOpen,
  onPushOpenChange,
  selectedFirmware,
  deviceTokens,
  selectedDevice,
  setSelectedDevice,
  onConfirmPush,
  isPushing,
}: Props) {
  return (
    <>
      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'bn' ? 'ফার্মওয়্যার মুছে ফেলুন?' : 'Delete Firmware?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn'
                ? 'এই ফার্মওয়্যার ফাইলটি স্থায়ীভাবে মুছে ফেলা হবে।'
                : 'This firmware file will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pushOpen} onOpenChange={onPushOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'bn' ? 'আপডেট পাঠান' : 'Push Update'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn'
                ? `${selectedFirmware?.version} ভার্সন কোন ডিভাইসে পাঠাবেন?`
                : `Which device should receive ${selectedFirmware?.version}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger>
                <SelectValue
                  placeholder={language === 'bn' ? 'ডিভাইস নির্বাচন করুন' : 'Select device'}
                />
              </SelectTrigger>
              <SelectContent>
                {deviceTokens?.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.device_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmPush} disabled={!selectedDevice || isPushing}>
              {isPushing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {language === 'bn' ? 'পাঠান' : 'Push'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
