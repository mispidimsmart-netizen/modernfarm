
-- ============================================================
-- Phase 1 — Device Security
-- ============================================================

-- 1. Extend device_tokens
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS device_secret_hash text,
  ADD COLUMN IF NOT EXISTS previous_secret_hash text,
  ADD COLUMN IF NOT EXISTS previous_secret_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS secret_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS secret_rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_signature_at timestamptz,
  ADD COLUMN IF NOT EXISTS signature_failure_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.device_tokens.secret_version IS '0 = legacy (no HMAC required), >=1 = HMAC signature required';

-- 2. device_request_nonces (replay protection)
CREATE TABLE IF NOT EXISTS public.device_request_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_id uuid NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  UNIQUE (device_token_id, nonce)
);

CREATE INDEX IF NOT EXISTS idx_device_nonces_expires ON public.device_request_nonces(expires_at);

ALTER TABLE public.device_request_nonces ENABLE ROW LEVEL SECURITY;

-- Only service role / super admins can read; no public access
CREATE POLICY "Super admins can view nonces"
  ON public.device_request_nonces FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- 3. device_provisioning_codes
CREATE TABLE IF NOT EXISTS public.device_provisioning_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  shed_id uuid REFERENCES public.sheds(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  device_name text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  device_token_id uuid REFERENCES public.device_tokens(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provisioning_codes_expires ON public.device_provisioning_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_provisioning_codes_farm ON public.device_provisioning_codes(farm_id);

ALTER TABLE public.device_provisioning_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm members can view their provisioning codes"
  ON public.device_provisioning_codes FOR SELECT
  USING (public.user_can_access_farm(auth.uid(), farm_id));

CREATE POLICY "Farm members can create provisioning codes"
  ON public.device_provisioning_codes FOR INSERT
  WITH CHECK (
    public.user_can_access_farm(auth.uid(), farm_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Farm members can delete their codes"
  ON public.device_provisioning_codes FOR DELETE
  USING (public.user_can_access_farm(auth.uid(), farm_id));

-- 4. Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_device_security_artifacts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.device_request_nonces WHERE expires_at < now();
  DELETE FROM public.device_provisioning_codes
    WHERE expires_at < now() AND used_at IS NULL;
  -- Clear expired previous_secret grace periods
  UPDATE public.device_tokens
    SET previous_secret_hash = NULL, previous_secret_expires_at = NULL
    WHERE previous_secret_expires_at IS NOT NULL
      AND previous_secret_expires_at < now();
END;
$$;

-- 5. Helper: consume nonce atomically (returns true if fresh, false if reused)
CREATE OR REPLACE FUNCTION public.consume_device_nonce(
  _device_token_id uuid,
  _nonce text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.device_request_nonces (device_token_id, nonce)
    VALUES (_device_token_id, _nonce);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END;
$$;
