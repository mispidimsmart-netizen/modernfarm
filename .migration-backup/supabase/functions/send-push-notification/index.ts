import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  severity?: 'warning' | 'danger' | 'info';
  alert_id?: string;
  url?: string;
}

// Base64URL decode with error handling
function base64UrlDecode(str: string, label = 'unknown'): Uint8Array {
  try {
    // Remove any whitespace
    str = str.trim();
    
    // Add padding if needed
    const pad = str.length % 4;
    if (pad) {
      str += '='.repeat(4 - pad);
    }
    
    // Replace URL-safe characters with standard base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error(`base64UrlDecode failed for ${label}:`, str.substring(0, 30), '... length:', str.length);
    throw error;
  }
}

// Base64URL encode
function base64UrlEncode(array: Uint8Array): string {
  let str = '';
  for (let i = 0; i < array.length; i++) {
    str += String.fromCharCode(array[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert Uint8Array to ArrayBuffer
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  const view = new Uint8Array(buffer);
  view.set(arr);
  return buffer;
}

// Generate VAPID authorization header
async function generateVapidAuth(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string }> {
  console.log('📝 VAPID Public Key length:', vapidPublicKey.length);
  console.log('📝 VAPID Private Key length:', vapidPrivateKey.length);
  
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: 'mailto:admin@layerfarm.app'
  };
  
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Decode public key (should be 65 bytes: 0x04 + 32 bytes X + 32 bytes Y)
  const publicKeyBytes = base64UrlDecode(vapidPublicKey, 'vapidPublicKey');
  console.log('📝 Decoded public key bytes:', publicKeyBytes.length);
  
  if (publicKeyBytes.length !== 65) {
    throw new Error(`Invalid VAPID public key length: expected 65, got ${publicKeyBytes.length}`);
  }
  
  const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
  const y = base64UrlEncode(publicKeyBytes.slice(33, 65));
  
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: x,
    y: y,
    d: vapidPrivateKey, // Private key should already be base64url encoded (32 bytes = 43 chars)
  };
  
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  const jwt = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
  
  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
  };
}

// Web Push encryption (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  console.log('📝 p256dh length:', p256dh.length, 'auth length:', auth.length);
  
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Export server public key
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeys.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);
  
  // Import user agent public key
  const uaPublicKeyBytes = base64UrlDecode(p256dh, 'p256dh');
  console.log('📝 Decoded p256dh bytes:', uaPublicKeyBytes.length);
  
  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(uaPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive shared secret via ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublicKey },
    serverKeys.privateKey,
    256
  );
  
  // Auth secret
  const authBytes = base64UrlDecode(auth, 'auth');
  console.log('📝 Decoded auth bytes:', authBytes.length);
  
  // Build info for HKDF
  const infoPrefix = new TextEncoder().encode('WebPush: info\x00');
  const info = new Uint8Array(infoPrefix.length + uaPublicKeyBytes.length + serverPublicKey.length);
  info.set(infoPrefix, 0);
  info.set(uaPublicKeyBytes, infoPrefix.length);
  info.set(serverPublicKey, infoPrefix.length + uaPublicKeyBytes.length);
  
  // PRK = HKDF-Extract(auth, shared_secret)
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // IKM = HKDF-Expand(PRK, info, 32)
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: toArrayBuffer(authBytes), info: toArrayBuffer(info) },
    sharedSecretKey,
    256
  );
  
  // Derive CEK and nonce
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\x00');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\x00');
  
  const cek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: toArrayBuffer(salt), info: toArrayBuffer(cekInfo) },
    ikmKey,
    128
  );
  
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: toArrayBuffer(salt), info: toArrayBuffer(nonceInfo) },
    ikmKey,
    96
  );
  
  // Import CEK for AES-GCM
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Pad the plaintext with a single 0x02 byte (delimiter)
  const plaintext = new TextEncoder().encode(payload);
  const paddedPlaintext = new Uint8Array(plaintext.length + 1);
  paddedPlaintext.set(plaintext);
  paddedPlaintext[plaintext.length] = 0x02;
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    encryptionKey,
    paddedPlaintext
  );
  
  // Build aes128gcm header + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);
  
  const ciphertextBytes = new Uint8Array(ciphertext);
  const body = new Uint8Array(header.length + ciphertextBytes.length);
  body.set(header, 0);
  body.set(ciphertextBytes, header.length);
  
  return body;
}

// Send a single push notification
async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const { authorization } = await generateVapidAuth(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const body = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );
    
    console.log('📤 Sending encrypted push, body size:', body.length);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': authorization,
      },
      body: toArrayBuffer(body),
    });
    
    if (!response.ok && response.status !== 201) {
      const errorText = await response.text();
      console.error(`Push endpoint error (${response.status}): ${errorText}`);
    } else {
      console.log(`✅ Push response status: ${response.status}`);
    }
    
    return {
      success: response.ok || response.status === 201,
      statusCode: response.status,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('sendPush error:', err.message);
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured - VAPID keys missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Sending push notification to user ${payload.user_id}: ${payload.title}`);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', payload.user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the push message payload
    const severity = payload.severity || 'warning';
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      severity: severity,
      alertId: payload.alert_id,
      url: payload.url || '/alerts',
      tag: `alert-${payload.alert_id || Date.now()}`,
      urgency: severity === 'danger' ? 'high' : 'normal',
      timestamp: Date.now(),
    });

    console.log(`📦 Push payload: ${subscriptions.length} subscriptions`);

    let successCount = 0;
    let failCount = 0;

    // Send to each subscription
    for (const sub of subscriptions) {
      console.log(`🔄 Processing subscription: ${sub.endpoint.substring(0, 50)}...`);
      
      const result = await sendPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        successCount++;
        console.log(`✅ Sent successfully!`);
       } else if (result.statusCode === 410 || result.statusCode === 404) {
         console.log(`🗑️ Expired subscription (gone/not found), removing...`);
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
        failCount++;
       } else if (result.statusCode === 403) {
         // Common when VAPID keys changed after a subscription was created.
         // Keeping these stale subscriptions causes repeated failures and can mask valid subscriptions.
         console.log(`🗑️ Subscription rejected (403, likely VAPID mismatch), removing...`);
         await supabase
           .from('push_subscriptions')
           .delete()
           .eq('endpoint', sub.endpoint);
         failCount++;
      } else {
        console.error(`❌ Failed (${result.statusCode}): ${result.error}`);
        failCount++;
      }
    }

    console.log(`📊 Results: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total_subscriptions: subscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
