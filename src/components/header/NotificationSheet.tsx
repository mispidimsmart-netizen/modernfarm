import { Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NotificationSoundCard } from '@/components/settings/NotificationSoundCard';
import { PushNotificationHelpDialog } from '@/components/settings/PushNotificationHelpDialog';

export function NotificationSheet() {
  const { language } = useAuth();
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {isSubscribed ? (
            <Bell size={18} className="text-primary" />
          ) : (
            <BellOff size={18} className="text-muted-foreground" />
          )}
          {isSubscribed && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'নোটিফিকেশন সেটিংস' : 'Notification Settings'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Push Notifications */}
          <div className="rounded-xl bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <Bell className="h-5 w-5 text-green-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {language === 'bn' ? 'পুশ নোটিফিকেশন' : 'Push Notifications'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {!isSupported 
                      ? (language === 'bn' ? 'সমর্থিত নয়' : 'Not supported')
                      : permission === 'granted'
                        ? (language === 'bn' ? 'অনুমতি দেওয়া হয়েছে' : 'Permission granted')
                        : permission === 'denied'
                          ? (language === 'bn' ? 'অনুমতি প্রত্যাখ্যাত' : 'Permission denied')
                          : (language === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission required')
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {permission === 'denied' && <PushNotificationHelpDialog language={language} />}
                {isSupported && (
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={isLoading || permission === 'denied'}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Notification Sounds */}
          <NotificationSoundCard />
        </div>
      </SheetContent>
    </Sheet>
  );
}
