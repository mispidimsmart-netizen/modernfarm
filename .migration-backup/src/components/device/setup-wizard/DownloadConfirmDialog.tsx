import { AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { HwVersion } from './wizardConstants';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  version: HwVersion | null;
  firmwareFile: string;
  finalAck: boolean;
  setFinalAck: (v: boolean) => void;
  isVerifying: boolean;
  onConfirm: () => void;
}

export function DownloadConfirmDialog({
  open,
  onOpenChange,
  version,
  firmwareFile,
  finalAck,
  setFinalAck,
  isVerifying,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            ডাউনলোডের আগে নিশ্চিত করুন
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p className="text-sm">
                ভুল firmware ভুল ওয়্যারিং-এ flash করলে রিলে ভুল GPIO-তে কাজ করবে —
                ফ্যান হিটারের জায়গায়, লাইট অ্যালার্মের জায়গায় চালু হতে পারে।
                নিচের তথ্য মিলিয়ে দেখুন:
              </p>

              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">আপনার ওয়্যারিং</span>
                  <Badge variant="outline" className="font-mono">{version?.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ডাউনলোড হবে firmware</span>
                  <Badge className="font-mono">{version?.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">ফাইল</span>
                  <span className="font-mono text-[11px]">{firmwareFile.replace('/', '')}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs pt-1 border-t">
                  <CheckCircle2 className="h-4 w-4" />
                  ওয়্যারিং ও firmware সংস্করণ মিলে গেছে
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                ⚠ ডাউনলোডের পর ফাইলের ভেতরের version tag ও GPIO map automatically
                verify করা হবে। mismatch হলে ডাউনলোড <strong>বাতিল</strong> হয়ে যাবে।
              </div>

              <label className="flex items-start gap-2 cursor-pointer rounded-lg border p-2 hover:bg-accent">
                <Checkbox
                  checked={finalAck}
                  onCheckedChange={(c) => setFinalAck(c === true)}
                  className="mt-0.5"
                />
                <span className="text-xs">
                  আমি নিশ্চিত আমার ESP32 <strong>{version?.toUpperCase()}</strong> ওয়্যারিং
                  ডায়াগ্রাম অনুযায়ী কানেক্টেড এবং সঠিক firmware-ই flash করতে চাই।
                </span>
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isVerifying}>বাতিল</AlertDialogCancel>
          <AlertDialogAction
            disabled={!finalAck || isVerifying}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isVerifying ? (
              <>যাচাই হচ্ছে...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1" />
                Verify ও ডাউনলোড
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
