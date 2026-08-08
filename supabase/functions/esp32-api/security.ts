/**
 * Device request authentication — HMAC signature verification (Phase 1).
 *
 * Signature = HMAC-SHA256(secret, `${timestamp}.${nonce}.${rawBody}`)
 *
 * Headers required once `device_tokens.secret_version >= 1`:
 *   X-Timestamp       unix seconds, ±300 s window
 *   X-Nonce           unique per request, replay-protected for 5 min
 *   X-Signature       lowercase hex digest
 *   X-Secret-Version  optional, informational
 *
 * Devices still on secret_version 0 are legacy and skip verification so that
 * a firmware rollout can be staged without locking sheds out of the cloud.
 */

/** Hex-encoded HMAC-SHA256 of `message` under `secret`. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison (guards against timing oracles). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SignatureCheckResult {
  ok: boolean;
  status?: number;
  error?: string;
  code?: string;
}

export interface SignedDevice {
  id: string;
  user_id: string;
  farm_id: string | null;
}

/**
 * Verify the request signature for a device, honouring secret rotation
 * (the previous secret stays valid until `previous_secret_expires_at`) and
 * consuming the nonce so a captured request cannot be replayed.
 */
// deno-lint-ignore no-explicit-any
export async function verifyDeviceSignature(
  supabase: any,
  device: SignedDevice,
  rawBody: string,
  headers: Headers,
): Promise<SignatureCheckResult> {
  const { data: secretRow } = await supabase
    .from('device_tokens')
    .select('device_secret, previous_device_secret, previous_secret_expires_at, secret_version')
    .eq('id', device.id)
    .maybeSingle();

  const version = secretRow?.secret_version ?? 0;
  if (version < 1) {
    // Legacy device — signature not required.
    return { ok: true };
  }

  const sigHeader = headers.get('x-signature');
  const tsHeader = headers.get('x-timestamp');
  const nonce = headers.get('x-nonce');

  const audit = (reason: string) => supabase.rpc('log_security_event', {
    _event_type: 'signature_invalid',
    _user_id: device.user_id,
    _farm_id: device.farm_id,
    _device_token_id: device.id,
    _success: false,
    _details: { reason },
  }).then(() => {}, () => {});

  if (!sigHeader || !tsHeader || !nonce) {
    audit('missing_signature_headers');
    return { ok: false, status: 401, error: 'Missing signature headers', code: 'MISSING_SIGNATURE' };
  }

  const ts = parseInt(tsHeader, 10);
  if (!Number.isFinite(ts)) {
    audit('bad_timestamp');
    return { ok: false, status: 401, error: 'Invalid timestamp', code: 'BAD_TIMESTAMP' };
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > 300) {
    audit('timestamp_drift_' + skew + 's');
    return { ok: false, status: 401, error: 'Timestamp out of window', code: 'TIMESTAMP_DRIFT' };
  }

  const message = `${tsHeader}.${nonce}.${rawBody}`;
  const expectedCurrent = await hmacSha256Hex(secretRow!.device_secret || '', message);
  let matched = secretRow!.device_secret && timingSafeEqual(expectedCurrent, sigHeader.toLowerCase());

  if (!matched && secretRow!.previous_device_secret &&
      secretRow!.previous_secret_expires_at &&
      new Date(secretRow!.previous_secret_expires_at) > new Date()) {
    const expectedPrev = await hmacSha256Hex(secretRow!.previous_device_secret, message);
    matched = timingSafeEqual(expectedPrev, sigHeader.toLowerCase());
  }

  if (!matched) {
    audit('signature_mismatch');
    await supabase.from('device_tokens')
      .update({ signature_failure_count: (await supabase.from('device_tokens')
        .select('signature_failure_count').eq('id', device.id).single()).data?.signature_failure_count + 1 || 1 })
      .eq('id', device.id);
    return { ok: false, status: 401, error: 'Invalid signature', code: 'BAD_SIGNATURE' };
  }

  // Replay protection: consume nonce.
  const { data: nonceOk } = await supabase.rpc('consume_device_nonce', {
    _device_token_id: device.id, _nonce: nonce,
  });
  if (!nonceOk) {
    supabase.rpc('log_security_event', {
      _event_type: 'nonce_reuse',
      _user_id: device.user_id,
      _farm_id: device.farm_id,
      _device_token_id: device.id,
      _success: false,
      _details: { nonce },
    }).then(() => {}, () => {});
    return { ok: false, status: 409, error: 'Nonce already used', code: 'NONCE_REUSE' };
  }

  await supabase.from('device_tokens')
    .update({ last_signature_at: new Date().toISOString() })
    .eq('id', device.id);

  return { ok: true };
}
