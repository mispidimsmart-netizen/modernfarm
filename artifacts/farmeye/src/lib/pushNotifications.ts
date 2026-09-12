import { supabase } from '@/integrations/supabase/client';

// VAPID Public Key from environment variable
// Must match the VAPID_PUBLIC_KEY secret in Supabase
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

async function getVapidPublicKey(): Promise<string | null> {
  // Prefer build-time env when available
  if (VAPID_PUBLIC_KEY && typeof VAPID_PUBLIC_KEY === 'string' && VAPID_PUBLIC_KEY.length > 20) {
    return VAPID_PUBLIC_KEY;
  }

  // Fallback: fetch from backend (public info, but served from a protected env)
  try {
    const { data, error } = await supabase.functions.invoke('push-public-key');
    if (error) {
      console.error('Failed to fetch VAPID public key:', error);
      return null;
    }
    const key = (data as any)?.publicKey;
    return typeof key === 'string' && key.length > 20 ? key : null;
  } catch (e) {
    console.error('Failed to fetch VAPID public key:', e);
    return null;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    // Use the VitePWA-managed service worker instead of registering a separate one
    // This avoids conflicts between multiple service workers
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker ready (VitePWA managed):', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker not available:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

export async function subscribeToPushNotifications(
  userId: string
): Promise<PushSubscription | null> {
  console.log('[Push] subscribeToPushNotifications called for user:', userId);

  try {
    // Step 1: Wait for service worker
    console.log('[Push] Step 1: Waiting for service worker...');
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service worker ready:', registration.scope);

    // Step 2: Check existing subscription
    console.log('[Push] Step 2: Checking existing subscription...');
    let subscription = await registration.pushManager.getSubscription();
    console.log('[Push] Existing subscription:', subscription ? 'yes' : 'no');

    if (!subscription) {
      // Step 3: Get VAPID key
      console.log('[Push] Step 3: Getting VAPID public key...');
      const vapidKey = await getVapidPublicKey();
      console.log('[Push] VAPID key retrieved:', vapidKey ? `${vapidKey.slice(0, 20)}...` : 'null');

      if (!vapidKey) {
        console.error('[Push] Missing VAPID public key (cannot subscribe)');
        return null;
      }

      // Step 4: Subscribe to push
      console.log('[Push] Step 4: Subscribing to pushManager...');
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
      console.log('[Push] pushManager.subscribe success:', subscription.endpoint.slice(0, 50));
    }

    // Step 5: Save to database
    console.log('[Push] Step 5: Saving subscription to database...');
    const subscriptionJson = subscription.toJSON();

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
      }, {
        onConflict: 'user_id,endpoint',
      });

    if (error) {
      console.error('[Push] Error saving push subscription:', error);
      return null;
    }

    console.log('[Push] ✅ Push subscription saved successfully!');
    return subscription;
  } catch (error) {
    console.error('[Push] ❌ Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);
    }
    
    return true;
  } catch (error) {
    console.error('Unsubscribe failed:', error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Check if notifications are supported and enabled
export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null;
  return Notification.permission;
}
