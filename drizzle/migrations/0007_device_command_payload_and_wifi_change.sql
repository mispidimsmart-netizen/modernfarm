-- 1) Additive payload column for structured command data (e.g. new WiFi credentials)
ALTER TABLE public.device_commands ADD COLUMN IF NOT EXISTS payload jsonb;

-- 2) Payload is cleared as soon as the command is closed (executed/expired),
--    so WiFi passwords are not retained in the database.
CREATE OR REPLACE FUNCTION public.clear_device_command_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.executed AND NEW.payload IS NOT NULL THEN
    NEW.payload := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_device_command_payload ON public.device_commands;
CREATE TRIGGER trg_clear_device_command_payload
BEFORE UPDATE ON public.device_commands
FOR EACH ROW EXECUTE FUNCTION public.clear_device_command_payload();

-- 3) Claim RPC now also hands the payload to the device (same lease semantics)
DROP FUNCTION IF EXISTS public.claim_device_commands(uuid, text, uuid, uuid, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.claim_device_commands(
  _user_id uuid,
  _device_name text DEFAULT NULL::text,
  _farm_id uuid DEFAULT NULL::uuid,
  _shed_id uuid DEFAULT NULL::uuid,
  _lease_seconds integer DEFAULT 20,
  _freshness_seconds integer DEFAULT 300,
  _limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid, farm_id uuid, shed_id uuid, command_type text, command_value boolean,
  created_at timestamp with time zone, client_request_id text,
  dispatched_at timestamp with time zone, retry_count integer, lease_token uuid,
  payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_fresh_cutoff timestamptz := now() - make_interval(secs => GREATEST(_freshness_seconds, 1));
  v_lease_cutoff timestamptz := now() - make_interval(secs => GREATEST(_lease_seconds, 1));
BEGIN
  UPDATE public.device_commands dc
     SET executed = true,
         executed_at = v_now,
         failed_at = COALESCE(dc.failed_at, v_now),
         failure_reason = COALESCE(dc.failure_reason, 'EXPIRED_STALE'),
         lease_token = NULL
   WHERE dc.user_id = _user_id
     AND dc.executed = false
     AND dc.created_at < v_fresh_cutoff
     AND (_device_name IS NULL OR dc.device_name = _device_name)
     AND (_farm_id IS NULL OR dc.farm_id = _farm_id)
     AND (_shed_id IS NULL OR dc.shed_id = _shed_id OR dc.shed_id IS NULL);

  RETURN QUERY
  WITH candidates AS (
    SELECT dc.id
      FROM public.device_commands dc
     WHERE dc.user_id = _user_id
       AND dc.executed = false
       AND dc.created_at >= v_fresh_cutoff
       AND (dc.dispatched_at IS NULL OR dc.dispatched_at < v_lease_cutoff)
       AND (_device_name IS NULL OR dc.device_name = _device_name)
       AND (_farm_id IS NULL OR dc.farm_id = _farm_id)
       AND (_shed_id IS NULL OR dc.shed_id = _shed_id OR dc.shed_id IS NULL)
     ORDER BY dc.created_at ASC
     LIMIT GREATEST(_limit, 1)
     FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.device_commands dc
       SET client_request_id = COALESCE(dc.client_request_id, dc.id),
           dispatched_at = v_now,
           lease_token = gen_random_uuid(),
           retry_count = CASE WHEN dc.dispatched_at IS NULL THEN COALESCE(dc.retry_count, 0)
                              ELSE COALESCE(dc.retry_count, 0) + 1 END
      FROM candidates c
     WHERE dc.id = c.id
    RETURNING dc.id, dc.farm_id, dc.shed_id, dc.command_type, dc.command_value,
              dc.created_at, dc.client_request_id, dc.dispatched_at, dc.retry_count,
              dc.lease_token, dc.payload
  )
  SELECT cl.id, cl.farm_id, cl.shed_id, cl.command_type::text, cl.command_value,
         cl.created_at, cl.client_request_id::text, cl.dispatched_at, cl.retry_count,
         cl.lease_token, cl.payload
    FROM claimed cl
   ORDER BY cl.created_at ASC;
END;
$function$;

-- 4) Queue a WiFi credential change for a farm's device(s).
--    Only farm owner / org admin / super admin (hardware scope) may call it.
CREATE OR REPLACE FUNCTION public.queue_device_wifi_change(
  _farm_id uuid,
  _ssid text,
  _password text DEFAULT '',
  _device_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_device text;
  v_shed uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF NOT (public.is_super_admin(v_uid) OR public.can_change_hardware(v_uid, _farm_id)) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF _ssid IS NULL OR length(btrim(_ssid)) = 0 THEN
    RAISE EXCEPTION 'SSID_REQUIRED';
  END IF;
  IF length(_ssid) > 32 THEN
    RAISE EXCEPTION 'SSID_TOO_LONG';
  END IF;
  IF length(COALESCE(_password, '')) > 0 AND length(_password) < 8 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT';
  END IF;

  SELECT dt.device_name, dt.shed_id, dt.user_id
    INTO v_device, v_shed, v_owner
    FROM public.device_tokens dt
   WHERE dt.farm_id = _farm_id
     AND dt.is_active = true
     AND (_device_name IS NULL OR dt.device_name = _device_name)
   ORDER BY dt.last_seen_at DESC NULLS LAST
   LIMIT 1;

  IF v_device IS NULL THEN
    RAISE EXCEPTION 'DEVICE_NOT_FOUND';
  END IF;

  v_owner := COALESCE(v_owner, public.get_farm_owner_id(_farm_id));

  -- Supersede any still-pending WiFi change for the same device
  UPDATE public.device_commands
     SET executed = true,
         executed_at = now(),
         failed_at = now(),
         failure_reason = 'SUPERSEDED'
   WHERE user_id = v_owner
     AND farm_id = _farm_id
     AND device_name = v_device
     AND command_type = 'set_wifi'
     AND executed = false;

  INSERT INTO public.device_commands
    (user_id, farm_id, shed_id, device_name, command_type, command_value, payload)
  VALUES
    (v_owner, _farm_id, v_shed, v_device, 'set_wifi', true,
     jsonb_build_object('ssid', btrim(_ssid), 'password', COALESCE(_password, '')))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_device_wifi_change(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_device_wifi_change(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_device_commands(uuid, text, uuid, uuid, integer, integer, integer) TO service_role;