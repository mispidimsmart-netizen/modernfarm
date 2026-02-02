import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  areNotificationsSupported,
  getNotificationPermission,
} from '@/lib/pushNotifications';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSupported(areNotificationsSupported());
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    if (isSupported) {
      registerServiceWorker();
    }
  }, [isSupported]);

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
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        setIsSubscribed(false);
      }
      setIsLoading(false);
      return success;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
