// Phase 2 — Observability helpers (used by esp32-api)
// Records per-request structured logs + per-device hourly metrics.
// Fire-and-forget: never blocks or breaks the calling request.

export interface ObsCtx {
  request_id: string;
  device_token_id?: string | null;
  farm_id?: string | null;
  user_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  is_signature_failure?: boolean;
  is_nonce_reuse?: boolean;
  is_rate_limited?: boolean;
  is_restart?: boolean;
  payload_size_bytes?: number;
}

export function newObsCtx(): ObsCtx {
  return { request_id: crypto.randomUUID() };
}

export function recordObservability(
  supabase: any,
  functionName: string,
  req: Request,
  response: Response,
  durationMs: number,
  ctx: ObsCtx,
): void {
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const status = response.status;

    // 1. Edge request log
    supabase.rpc('record_edge_request', {
      _function_name: functionName,
      _path: path,
      _method: req.method,
      _status_code: status,
      _duration_ms: durationMs,
      _device_token_id: ctx.device_token_id ?? null,
      _farm_id: ctx.farm_id ?? null,
      _user_id: ctx.user_id ?? null,
      _request_id: ctx.request_id,
      _error_code: ctx.error_code ?? null,
      _error_message: ctx.error_message ?? null,
      _payload_size_bytes: ctx.payload_size_bytes ?? null,
      _response_size_bytes: null,
    }).then(() => {}, () => {});

    // 2. Device hourly metric (only if we know the device)
    if (ctx.device_token_id) {
      const isError = status >= 500 || status === 401 || status === 403;
      supabase.rpc('record_device_metric', {
        _device_token_id: ctx.device_token_id,
        _farm_id: ctx.farm_id ?? null,
        _latency_ms: durationMs,
        _is_error: isError,
        _is_signature_failure: !!ctx.is_signature_failure,
        _is_nonce_reuse: !!ctx.is_nonce_reuse,
        _is_rate_limited: !!ctx.is_rate_limited,
        _sensor_gap_seconds: 0,
        _is_restart: !!ctx.is_restart,
      }).then(() => {}, () => {});
    }
  } catch {
    // Never let observability break the request
  }
}
