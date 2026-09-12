/**
 * HTTP transport concerns shared by every `esp32-api` route handler.
 *
 * Kept deliberately tiny: the edge function is a device-facing API, so CORS
 * headers and JSON envelopes must be identical on success and error paths.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-device-token, x-timestamp, x-nonce, x-signature, x-secret-version',
};

/** Build a JSON response with CORS headers applied. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Build a standard `{ error, code }` error envelope. */
export function errorResponse(error: string, code: string, status = 400): Response {
  return jsonResponse({ error, code }, status);
}
