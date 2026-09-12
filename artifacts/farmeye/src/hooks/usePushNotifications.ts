import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  areNotificationsSupported,
  getNotificationPermission,
} from '@/lib/pushNotifications';

const isPwaDisabledContext = () => {
  if (typeof window === 'undefined') return true;
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  return (
    isInIframe ||
    window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname === 'localhost'
  );
};

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if notifications are supported
  useEffect(() => {
    if (isPwaDisabledContext()) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(areNotificationsSupported());
    setPermission(getNotificationPermission());
  }, []);

  // Register service worker
  useEffect(() => {
    if (isSupported) {
      registerServiceWorker();
    }
  }, [isSupported]);

  // Check existing subscription status from database on mount
  useEffect(() => {
    async function checkSubscriptionStatus() {
      if (!user || !isSupported) {
        setIsLoading(false);
        return;
      }

      try {
        // First check if there's a subscription in the database
        const { data: dbSubscriptions, error: dbError } = await supabase
          .from('push_subscriptions')
          .select('endpoint')
          .eq('user_id', user.id);

        if (dbError) {
          console.error('Error checking subscription status:', dbError);
          setIsLoading(false);
          return;
        }

        // Also check if there's an active browser subscription
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const browserSubscription = await registration.pushManager.getSubscription();
            
            if (browserSubscription && dbSubscriptions && dbSubscriptions.length > 0) {
              // Check if the browser subscription matches any in the database
              const endpointExists = dbSubscriptions.some(
                sub => sub.endpoint === browserSubscription.endpoint
              );
              setIsSubscribed(endpointExists);
            } else if (dbSubscriptions && dbSubscriptions.length > 0) {
              // There are subscriptions in DB but not in this browser
              // This could be from another device
              setIsSubscribed(false);
            } else {
              setIsSubscribed(false);
            }
          } catch (swError) {
            console.error('Service worker error:', swError);
            // If we can't check browser subscription, just use DB status
            setIsSubscribed(dbSubscriptions && dbSubscriptions.length > 0);
          }
        } else {
          setIsSubscribed(dbSubscriptions && dbSubscriptions.length > 0);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscriptionStatus();
  }, [user, isSupported]);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    
    setIsLoading(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        setIsLoading(false);
        return false;
      }

      const subscription = await subscribeToPushNotifications(user.id);
      setIsSubscribed(!!subscription);
      setIsLoading(false);
      return !!subscription;
    } catch (error) {
      console.error('Subscribe error:', error);
      setIsLoading(false);
      return false;
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;
    
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        // Also remove all subscriptions for this user from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
        setIsSubscribed(false);
      }
      setIsLoading(false);
      return success;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setIsLoading(false);
      return false;
    }
  }, [user]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
