import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
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
import { Checkbox } from '@/components/ui/checkbox';
import { isDownloadAllowed, tryDownload } from '@/lib/firmwareDownloadGate';
import type { FirmwareVersion, HardwareVersion, Language } from './types';

interface Props {
  language: Language;
  open: boolean;
  setOpen: (o: boolean) => void;
  isDownloading: boolean;
  finalAck: boolean;
  setFinalAck: (v: boolean) => void;
  hardwareVersion: HardwareVersion;
  firmwareVersion: FirmwareVersion;
  isMismatch: boolean;
  onConfirmed: () => void;
}

/** Mandatory confirmation gate — download can never fire without an explicit tick. */
export function ConfirmDownloadDialog({
  language,
  open,
  setOpen,
  isDownloading,
  finalAck,
  setFinalAck,
  hardwareVersion,
  firmwareVersion,
  isMismatch,
  onConfirmed,
}: Props) {
  const bn = language === 'bn';
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!isDownloading) setOpen(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {bn ? 'ডাউনলোডের আগে নিশ্চিত করুন' : 'Confirm before download'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {bn
              ? 'ডাউনলোডের পরে ফাইলের version tag ও GPIO map auto-verify হবে।'
              : "After fetch, the file's version tag and GPIO map will be auto-verified."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 rounded-md border p-2">
            <div>
              <div className="text-xs text-muted-foreground">{bn ? 'হার্ডওয়্যার' : 'Hardware'}</div>
              <div className="font-semibold">{hardwareVersion.toUpperCase()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{bn ? 'ফার্মওয়্যার' : 'Firmware'}</div>
              <div className="font-semibold">{firmwareVersion.toUpperCase()}</div>
            </div>
          </div>
          {isMismatch && (
            <p className="text-destructive font-medium">
              {bn
                ? '⚠️ Hardware ও Firmware version মেলেনি — ভুল আপলোড করলে রিলে/সেন্সর কাজ করবে না।'
                : '⚠️ Hardware and firmware versions do not match — wrong upload will break relays/sensors.'}
            </p>
          )}
          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <Checkbox checked={finalAck} onCheckedChange={(v) => setFinalAck(v === true)} />
            <span className="text-sm">
              {bn
                ? `আমি নিশ্চিত আমার ESP32 wiring ${firmwareVersion.toUpperCase()} অনুযায়ী এবং আমি ${firmwareVersion.toUpperCase()} ফার্মওয়্যার আপলোড করতে চাই।`
                : `I confirm my ESP32 wiring matches ${firmwareVersion.toUpperCase()} and I want to upload ${firmwareVersion.toUpperCase()} firmware.`}
            </span>
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDownloading}>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!isDownloadAllowed({ confirmOpen: open, finalAck, isDownloading })}
            onClick={(e) => {
              e.preventDefault();
              const ran = tryDownload({ confirmOpen: open, finalAck, isDownloading }, () => {
                setOpen(false);
                onConfirmed();
              });
              if (!ran) {
                toast.error(bn ? 'নিশ্চিতকরণ চেকবক্স টিক দিন' : 'Please tick the confirmation checkbox');
              }
            }}
          >
            {bn ? 'Verify ও ডাউনলোড' : 'Verify & Download'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
