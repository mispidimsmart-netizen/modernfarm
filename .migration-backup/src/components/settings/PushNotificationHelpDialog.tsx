import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function PushNotificationHelpDialog({ language }: { language: string }) {
  const isBn = language === 'bn';

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          {isBn ? 'Permission ঠিক করুন' : 'Fix Permission'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBn ? 'পুশ নোটিফিকেশন Permission বন্ধ আছে' : 'Push permission is blocked'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBn ? (
              <div className="space-y-3">
                <p>
                  আপনি এই সাইটের জন্য Notification permission <b>Block</b> করেছেন—তাই টগল ON হবে না।
                </p>
                <div className="space-y-2">
                  <p className="font-medium">Android / Chrome:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>ব্রাউজারের address bar এর পাশে 🔒/ⓘ চাপুন</li>
                    <li><b>Site settings</b> → <b>Notifications</b> → <b>Allow</b></li>
                    <li>অ্যাপ রিফ্রেশ করে Settings এ এসে আবার টগল ON করুন</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">iPhone (iOS):</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>অ্যাপটি অবশ্যই <b>Add to Home Screen</b> করে ইনস্টল (PWA) করতে হবে</li>
                    <li>তারপর Settings → Notifications থেকে permission Allow করুন</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p>
                  Notifications are <b>blocked</b> for this site—so the toggle can’t turn on.
                </p>
                <div className="space-y-2">
                  <p className="font-medium">Android / Chrome:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Tap 🔒/ⓘ next to the address bar</li>
                    <li><b>Site settings</b> → <b>Notifications</b> → <b>Allow</b></li>
                    <li>Refresh, then come back and turn the toggle ON</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">iPhone (iOS):</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>You must install the app via <b>Add to Home Screen</b> (PWA)</li>
                    <li>Then allow notifications in iOS Settings</li>
                  </ol>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isBn ? 'বন্ধ করুন' : 'Close'}</AlertDialogCancel>
          <AlertDialogAction>{isBn ? 'ঠিক আছে' : 'OK'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
