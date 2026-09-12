import { useState } from 'react';
import { BellRing, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestPushButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

/**
 * One-click test button to verify push notifications work end-to-end.
 * - If user is not subscribed → guides them to enable first
 * - If subscribed → triggers send-push-notification edge function
 * - Shows clear success/failure toast in Bengali
 */
export function TestPushButton({ variant = 'outline', size = 'sm', className }: TestPushButtonProps) {
  const { user, language } = useAuth();
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [sending, setSending] = useState(false);
  const isBn = language === 'bn';

  const handleTest = async () => {
    if (!user) return;

    // Browser support check
    if (!isSupported) {
      toast.error(isBn ? 'এই ব্রাউজার নোটিফিকেশন সাপোর্ট করে না' : 'Browser does not support notifications');
      return;
    }

    // Auto-subscribe if needed
    if (!isSubscribed || permission !== 'granted') {
      toast.info(isBn ? 'প্রথমে নোটিফিকেশন অনুমতি দিচ্ছি...' : 'Requesting notification permission...');
      const ok = await subscribe();
      if (!ok) {
        toast.error(
          isBn
            ? 'নোটিফিকেশন অনুমতি দিতে হবে। ব্রাউজার সেটিংস থেকে এই সাইটের নোটিফিকেশন allow করুন।'
            : 'Permission denied. Allow notifications for this site in browser settings.'
        );
        return;
      }
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: isBn ? '🔔 টেস্ট নোটিফিকেশন' : '🔔 Test Notification',
          body: isBn
            ? 'অভিনন্দন! আপনার শিডিউল নোটিফিকেশন সঠিকভাবে কাজ করছে।'
            : 'Success! Your schedule notifications are working correctly.',
          severity: 'info',
          url: '/farm',
        },
      });

      if (error) throw error;

      const sent = (data as any)?.sent ?? 0;
      const failed = (data as any)?.failed ?? 0;

      if (sent > 0) {
        toast.success(
          isBn
            ? `✅ নোটিফিকেশন পাঠানো হয়েছে! ${sent}টি ডিভাইসে। কয়েক সেকেন্ডের মধ্যে আসবে।`
            : `✅ Sent to ${sent} device(s). Should arrive in a few seconds.`,
          { icon: <CheckCircle2 className="w-4 h-4" /> }
        );
      } else if (failed > 0) {
        toast.error(
          isBn
            ? `নোটিফিকেশন পাঠানো ব্যর্থ। সাবস্ক্রিপশন অকার্যকর হতে পারে — সেটিংস থেকে আবার চালু করুন।`
            : `Failed to send. Subscription may be invalid — re-enable from Settings.`,
          { icon: <AlertCircle className="w-4 h-4" /> }
        );
      } else {
        toast.warning(
          isBn
            ? 'কোনো সক্রিয় সাবস্ক্রিপশন নেই। সেটিংস → নোটিফিকেশন থেকে চালু করুন।'
            : 'No active subscriptions found. Enable from Settings → Notifications.'
        );
      }
    } catch (err: any) {
      console.error('Test push failed:', err);
      toast.error(
        isBn
          ? `ত্রুটি: ${err?.message ?? 'অজানা সমস্যা'}`
          : `Error: ${err?.message ?? 'Unknown error'}`
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      onClick={handleTest}
      disabled={sending || !user}
      variant={variant}
      size={size}
      className={className}
    >
      {sending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <BellRing className="w-4 h-4 mr-2" />
      )}
      {sending
        ? (isBn ? 'পাঠানো হচ্ছে...' : 'Sending...')
        : (isBn ? 'টেস্ট নোটিফিকেশন' : 'Test Notification')}
    </Button>
  );
}
