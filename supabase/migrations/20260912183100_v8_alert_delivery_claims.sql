-- V8 alert delivery idempotency.
-- Deploy after 20260912183000_v8_alert_event_dedup.sql.
-- A claim is inserted before contacting a provider, so concurrent dispatcher
-- workers cannot both send the same automatic channel event. Claims have a
-- lease for race protection, but an expired claim is terminalized rather than
-- reclaimed: this flow has no documented provider idempotency guarantee.
-- Only an explicitly released claim (a proven pre-submit failure) is retryable.

BEGIN;

ALTER TABLE public.alert_deliveries
  ADD COLUMN IF NOT EXISTS delivery_key text,
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_deliveries_v8_delivery_key
  ON public.alert_deliveries (delivery_key);

-- Preserve the terminal state of the pre-key dispatcher rows where there is
-- exactly one non-escalation attempt for a channel. Ambiguous histories are
-- intentionally left unkeyed and are handled fail-closed by the claim RPC.
WITH single_attempt AS (
  SELECT (array_agg(id ORDER BY created_at, id))[1] AS id, alert_id, channel
  FROM public.alert_deliveries
  WHERE delivery_key IS NULL
    AND is_escalation = false
  GROUP BY alert_id, channel
  HAVING count(*) = 1
)
UPDATE public.alert_deliveries d
SET delivery_key = 'v8:auto:' || d.alert_id::text || ':' || d.channel
FROM single_attempt s
WHERE d.id = s.id;

-- A legacy queued row has no proof that its provider call never started.
-- Seed it as an expired, owned claim so the first post-migration pass
-- terminalizes it instead of treating it as an explicit safe release.
UPDATE public.alert_deliveries
SET claim_token = gen_random_uuid(),
    claim_expires_at = now() - interval '1 second'
WHERE delivery_key IS NOT NULL
  AND status = 'queued'
  AND claim_token IS NULL;

UPDATE public.alert_deliveries
SET status = 'failed',
    error_message = 'legacy queued claim ambiguous during V8 migration'
WHERE delivery_key IS NULL
  AND status = 'queued';

CREATE OR REPLACE FUNCTION public.claim_v8_alert_delivery(
  p_alert_id uuid,
  p_farm_id uuid,
  p_channel text,
  p_delivery_key text,
  p_is_escalation boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_token uuid;
  v_status text;
  v_claim_expires_at timestamptz;
  v_existing_claim_token uuid;
  v_rows integer := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden_service_role_required'
      USING ERRCODE = '42501';
  END IF;
  IF p_alert_id IS NULL OR p_farm_id IS NULL OR p_delivery_key IS NULL
     OR p_channel NOT IN ('push', 'sms', 'whatsapp', 'in_app') THEN
    RAISE EXCEPTION 'invalid_alert_delivery_claim'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.alerts
    WHERE id = p_alert_id AND farm_id = p_farm_id
  ) THEN
    RAISE EXCEPTION 'alert_tenant_mismatch'
      USING ERRCODE = '42501';
  END IF;
  -- Legacy rows without a stable key cannot be safely distinguished from an
  -- in-flight provider call. Do not create a second automatic attempt.
  IF EXISTS (
    SELECT 1
    FROM public.alert_deliveries
    WHERE alert_id = p_alert_id
      AND farm_id = p_farm_id
      AND channel = p_channel
      AND is_escalation = false
      AND delivery_key IS NULL
  ) THEN
    RETURN NULL;
  END IF;

  v_claim_token := gen_random_uuid();

  SELECT status, claim_token, claim_expires_at
    INTO v_status, v_existing_claim_token, v_claim_expires_at
  FROM public.alert_deliveries
  WHERE delivery_key = p_delivery_key
  FOR UPDATE;

  IF FOUND THEN
    -- Completed attempts are terminal. Never reclaim them, including failed
    -- attempts, because a provider may have accepted the request.
    IF v_status IS DISTINCT FROM 'queued' THEN
      RETURN NULL;
    END IF;
    -- An explicit release clears the token and is the only safe retry path.
    IF v_existing_claim_token IS NULL THEN
      UPDATE public.alert_deliveries
      SET claim_token = v_claim_token,
          claim_expires_at = now() + interval '5 minutes'
      WHERE delivery_key = p_delivery_key
        AND status = 'queued'
        AND claim_token IS NULL;
      IF FOUND THEN
        RETURN v_claim_token;
      END IF;
      RETURN NULL;
    END IF;
    IF v_claim_expires_at IS NOT NULL AND v_claim_expires_at > now() THEN
      RETURN NULL;
    END IF;
    -- The provider call may have happened before the worker crashed. Marking
    -- this terminal avoids a duplicate SMS, WhatsApp, or web-push send.
    UPDATE public.alert_deliveries
    SET status = 'failed',
        error_message = 'claim lease expired; provider submission ambiguous',
        claim_token = NULL,
        claim_expires_at = NULL
    WHERE delivery_key = p_delivery_key
      AND status = 'queued'
      AND claim_token = v_existing_claim_token;
    RETURN NULL;
  END IF;

  INSERT INTO public.alert_deliveries (
    alert_id, farm_id, channel, status, is_escalation, delivery_key,
    claim_token, claim_expires_at
  ) VALUES (
    p_alert_id, p_farm_id, p_channel, 'queued', p_is_escalation, p_delivery_key,
    v_claim_token, now() + interval '5 minutes'
  )
  ON CONFLICT (delivery_key) DO NOTHING;

  -- A concurrent insert won the key race. It will be observed on the next
  -- dispatcher pass, with the same lease/terminal rules above.
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN NULL;
  END IF;
  RETURN v_claim_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_v8_alert_delivery_claim(
  p_delivery_key text,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden_service_role_required'
      USING ERRCODE = '42501';
  END IF;
  IF p_delivery_key IS NULL OR p_claim_token IS NULL THEN
    RAISE EXCEPTION 'invalid_alert_delivery_release'
      USING ERRCODE = '22023';
  END IF;

  -- This boundary is callable only for a locally proven pre-submit failure.
  -- Once the lease expires, release is refused and the claim is terminalized
  -- by claim_v8_alert_delivery instead.
  UPDATE public.alert_deliveries
  SET claim_token = NULL,
      claim_expires_at = NULL,
      error_message = NULL
  WHERE delivery_key = p_delivery_key
    AND claim_token = p_claim_token
    AND status = 'queued'
    AND claim_expires_at > now();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_v8_alert_delivery(
  p_delivery_key text,
  p_claim_token uuid,
  p_status text,
  p_recipient text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed boolean := false;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden_service_role_required'
      USING ERRCODE = '42501';
  END IF;
  IF p_delivery_key IS NULL OR p_claim_token IS NULL OR p_status NOT IN (
    'sent', 'failed', 'skipped_quiet', 'skipped_cooldown',
    'skipped_disabled'
  ) THEN
    RAISE EXCEPTION 'invalid_alert_delivery_completion'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.alert_deliveries
  SET status = p_status,
      recipient = p_recipient,
      provider_message_id = p_provider_message_id,
      error_message = p_error_message,
      sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE NULL END
  WHERE delivery_key = p_delivery_key
    AND claim_token = p_claim_token
    AND status = 'queued';
  v_completed := FOUND;
  -- A completion clears the lease and makes the row terminal.
  IF v_completed THEN
    UPDATE public.alert_deliveries
    SET claim_token = NULL, claim_expires_at = NULL
    WHERE delivery_key = p_delivery_key
      AND claim_token = p_claim_token;
  END IF;
  RETURN v_completed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_v8_alert_delivery(uuid, uuid, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_v8_alert_delivery(uuid, uuid, text, text, boolean)
  TO service_role;

REVOKE ALL ON FUNCTION public.release_v8_alert_delivery_claim(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_v8_alert_delivery_claim(text, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.complete_v8_alert_delivery(text, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_v8_alert_delivery(text, uuid, text, text, text, text)
  TO service_role;

COMMIT;