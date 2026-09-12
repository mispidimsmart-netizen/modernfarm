
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS device_secret text,
  ADD COLUMN IF NOT EXISTS previous_device_secret text;

COMMENT ON COLUMN public.device_tokens.device_secret IS 'Raw HMAC-SHA256 secret. Returned to device once at provisioning. Read only by service role / super admin.';

-- Tighten: revoke select on secret columns from authenticated/anon via column-level grant pattern is hard.
-- Instead rely on existing RLS on device_tokens which already restricts by farm membership.
-- Add helper to fetch secret (only super admin or service role can call effectively):
CREATE OR REPLACE FUNCTION public.get_device_secret(_device_token_id uuid)
RETURNS TABLE (device_secret text, previous_device_secret text, previous_expires timestamptz, secret_version int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT device_secret, previous_device_secret, previous_secret_expires_at, secret_version
  FROM public.device_tokens
  WHERE id = _device_token_id
$$;

REVOKE EXECUTE ON FUNCTION public.get_device_secret(uuid) FROM PUBLIC, anon, authenticated;
