-- V8 actuator command remediation.
-- Additive/restrictive-safe: deploy after 20260912181000_restrict_device_credential_access.sql.
-- The RPC is the only supported app write boundary for V8 actuator commands.

BEGIN;

ALTER TABLE public.device_commands
  ADD COLUMN IF NOT EXISTS shed_id uuid REFERENCES public.sheds(id) ON DELETE SET NULL;

ALTER TABLE public.device_command_log
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_command_log_client_request_id
  ON public.device_command_log (client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_device_commands_v8_device_pending
  ON public.device_commands (farm_id, shed_id, device_name, executed, created_at)
  WHERE executed = false;

CREATE OR REPLACE FUNCTION public.queue_v8_actuator_command(
  p_farm_id uuid,
  p_shed_id uuid,
  p_device_token_id uuid,
  p_command_type text,
  p_command_value boolean,
  p_client_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_device_id uuid;
  v_device_user_id uuid;
  v_device_name text;
  v_device_shed_id uuid;
  v_command_id uuid;
  v_log_id uuid;
  v_inserted boolean := false;
  v_existing boolean := false;
  v_existing_farm_id uuid;
  v_existing_shed_id uuid;
  v_existing_device_name text;
  v_existing_command_type text;
  v_existing_command_value boolean;
  v_candidate_count integer := 0;
  v_updated_count integer := 0;
  v_desired_update jsonb := jsonb_build_object('updated_at', now());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;
  IF p_client_request_id IS NULL THEN
    RAISE EXCEPTION 'CLIENT_REQUEST_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_farm_id IS NULL
    OR NOT public.user_can_access_farm(v_user_id, p_farm_id)
    OR NOT public.can_change_hardware(auth.uid(), p_farm_id) THEN
    RAISE EXCEPTION 'FARM_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_command_type IS NULL OR p_command_type NOT IN (
    'fan', 'light', 'alarm', 'heater', 'manual_override',
    'stop_automation', 'circulation_fan', 'fogger', 'ceiling_fan', 'sprinkler'
  ) THEN
    RAISE EXCEPTION 'UNSUPPORTED_COMMAND_TYPE' USING ERRCODE = '22023';
  END IF;

  -- Validate the requested shed before resolving a device. The caller's
  -- historical device_name field is deliberately not accepted by this RPC.
  IF p_shed_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.sheds s
    WHERE s.id = p_shed_id
      AND s.farm_id = p_farm_id
      AND COALESCE(s.is_active, true)
  ) THEN
    RAISE EXCEPTION 'SHED_BINDING_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  -- The token is the authoritative farm/shed/device binding. An explicit
  -- token id is preferred. Legacy callers may omit it only when exactly one
  -- active candidate exists; never silently pick the oldest device.
  IF p_device_token_id IS NULL THEN
    SELECT count(*)
      INTO v_candidate_count
    FROM public.device_tokens dt
    WHERE dt.farm_id = p_farm_id
      AND dt.is_active = true
      AND (p_shed_id IS NULL OR dt.shed_id = p_shed_id)
      AND (
        dt.shed_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.sheds s
          WHERE s.id = dt.shed_id
            AND s.farm_id = p_farm_id
            AND COALESCE(s.is_active, true)
        )
      );

    IF v_candidate_count <> 1 THEN
      RAISE EXCEPTION 'DEVICE_BINDING_AMBIGUOUS' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT dt.id, dt.user_id, dt.device_name, dt.shed_id
    INTO v_device_id, v_device_user_id, v_device_name, v_device_shed_id
  FROM public.device_tokens dt
  WHERE dt.farm_id = p_farm_id
    AND dt.is_active = true
    AND (p_shed_id IS NULL OR dt.shed_id = p_shed_id)
    AND (p_device_token_id IS NULL OR dt.id = p_device_token_id)
    AND (
      dt.shed_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.sheds s
        WHERE s.id = dt.shed_id
          AND s.farm_id = p_farm_id
          AND COALESCE(s.is_active, true)
      )
    );

  IF v_device_id IS NULL THEN
    RAISE EXCEPTION 'DEVICE_BINDING_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  -- A retry returns the original command and does not enqueue a second one.
  SELECT dc.id, dc.farm_id, dc.shed_id, dc.device_name,
         dc.command_type, dc.command_value
    INTO v_command_id, v_existing_farm_id, v_existing_shed_id, v_existing_device_name,
         v_existing_command_type, v_existing_command_value
  FROM public.device_commands dc
  WHERE dc.client_request_id = p_client_request_id
  LIMIT 1;
  v_existing := v_command_id IS NOT NULL;

  IF v_existing AND (
    v_existing_farm_id IS DISTINCT FROM p_farm_id
    OR v_existing_shed_id IS DISTINCT FROM v_device_shed_id
    OR v_existing_device_name IS DISTINCT FROM v_device_name
    OR v_existing_command_type IS DISTINCT FROM p_command_type
    OR v_existing_command_value IS DISTINCT FROM p_command_value
  ) THEN
    RAISE EXCEPTION 'CLIENT_REQUEST_ID_CONFLICT' USING ERRCODE = '23505';
  END IF;
  IF v_existing THEN
    v_device_shed_id := v_existing_shed_id;
    v_device_name := v_existing_device_name;
  END IF;

  IF v_command_id IS NULL THEN
    INSERT INTO public.device_commands (
      user_id, farm_id, shed_id, device_name, command_type,
      command_value, executed, client_request_id
    ) VALUES (
      v_device_user_id, p_farm_id, v_device_shed_id, v_device_name, p_command_type,
      p_command_value, false, p_client_request_id
    )
    ON CONFLICT (client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_command_id;
    v_inserted := v_command_id IS NOT NULL;

    IF NOT v_inserted THEN
      SELECT dc.id, dc.farm_id, dc.shed_id, dc.device_name,
             dc.command_type, dc.command_value
        INTO v_command_id, v_existing_farm_id, v_existing_shed_id, v_existing_device_name,
             v_existing_command_type, v_existing_command_value
      FROM public.device_commands dc
      WHERE dc.client_request_id = p_client_request_id
      LIMIT 1;
      v_existing := v_command_id IS NOT NULL;
      IF v_existing AND (
        v_existing_farm_id IS DISTINCT FROM p_farm_id
        OR v_existing_shed_id IS DISTINCT FROM v_device_shed_id
        OR v_existing_device_name IS DISTINCT FROM v_device_name
        OR v_existing_command_type IS DISTINCT FROM p_command_type
        OR v_existing_command_value IS DISTINCT FROM p_command_value
      ) THEN
        RAISE EXCEPTION 'CLIENT_REQUEST_ID_CONFLICT' USING ERRCODE = '23505';
      END IF;
      IF v_existing THEN
        v_device_shed_id := v_existing_shed_id;
        v_device_name := v_existing_device_name;
      END IF;
    END IF;
  END IF;

  IF v_command_id IS NULL THEN
    RAISE EXCEPTION 'COMMAND_IDEMPOTENCY_LOOKUP_FAILED' USING ERRCODE = '40001';
  END IF;
  IF v_existing THEN
    RETURN jsonb_build_object(
      'command_id', v_command_id,
      'client_request_id', p_client_request_id,
      'device_name', v_device_name,
      'shed_id', v_device_shed_id,
      'deduplicated', true
    );
  END IF;

  -- Keep the audit row idempotent as well, using the same stable key.
  INSERT INTO public.device_command_log (
    user_id, farm_id, shed_id, client_request_id, command_id, device_name,
    command_type, command_value, status, source, sent_at
  ) VALUES (
    v_device_user_id, p_farm_id, v_device_shed_id, p_client_request_id, v_command_id::text,
    v_device_name, p_command_type, p_command_value, 'pending', 'app', now()
  )
  ON CONFLICT (client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_log_id;

  IF p_command_type = 'fan' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_fan_on', p_command_value);
  ELSIF p_command_type = 'light' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_light_on', p_command_value);
  ELSIF p_command_type = 'alarm' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_alarm_on', p_command_value);
  ELSIF p_command_type = 'heater' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_heater_on', p_command_value);
  ELSIF p_command_type IN ('manual_override', 'stop_automation') THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_manual_override', p_command_value);
    IF NOT p_command_value THEN
      v_desired_update := v_desired_update || jsonb_build_object(
        'desired_fan_on', null, 'desired_light_on', null, 'desired_alarm_on', null,
        'desired_heater_on', null, 'desired_circulation_fan_on', null,
        'desired_fogger_on', null, 'desired_ceiling_fan_on', null,
        'desired_sprinkler_on', null, 'desired_fan_speed', null
      );
    END IF;
  ELSIF p_command_type = 'circulation_fan' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_circulation_fan_on', p_command_value);
  ELSIF p_command_type = 'fogger' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_fogger_on', p_command_value);
  ELSIF p_command_type = 'ceiling_fan' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_ceiling_fan_on', p_command_value);
  ELSIF p_command_type = 'sprinkler' THEN
    v_desired_update := v_desired_update || jsonb_build_object('desired_sprinkler_on', p_command_value);
  END IF;

  UPDATE public.device_status
  SET
    desired_fan_on = CASE WHEN v_desired_update ? 'desired_fan_on'
      THEN (v_desired_update->>'desired_fan_on')::boolean ELSE desired_fan_on END,
    desired_light_on = CASE WHEN v_desired_update ? 'desired_light_on'
      THEN (v_desired_update->>'desired_light_on')::boolean ELSE desired_light_on END,
    desired_alarm_on = CASE WHEN v_desired_update ? 'desired_alarm_on'
      THEN (v_desired_update->>'desired_alarm_on')::boolean ELSE desired_alarm_on END,
    desired_heater_on = CASE WHEN v_desired_update ? 'desired_heater_on'
      THEN (v_desired_update->>'desired_heater_on')::boolean ELSE desired_heater_on END,
    desired_manual_override = CASE WHEN v_desired_update ? 'desired_manual_override'
      THEN (v_desired_update->>'desired_manual_override')::boolean ELSE desired_manual_override END,
    desired_circulation_fan_on = CASE WHEN v_desired_update ? 'desired_circulation_fan_on'
      THEN (v_desired_update->>'desired_circulation_fan_on')::boolean ELSE desired_circulation_fan_on END,
    desired_fogger_on = CASE WHEN v_desired_update ? 'desired_fogger_on'
      THEN (v_desired_update->>'desired_fogger_on')::boolean ELSE desired_fogger_on END,
    desired_ceiling_fan_on = CASE WHEN v_desired_update ? 'desired_ceiling_fan_on'
      THEN (v_desired_update->>'desired_ceiling_fan_on')::boolean ELSE desired_ceiling_fan_on END,
    desired_sprinkler_on = CASE WHEN v_desired_update ? 'desired_sprinkler_on'
      THEN (v_desired_update->>'desired_sprinkler_on')::boolean ELSE desired_sprinkler_on END,
    desired_fan_speed = CASE WHEN v_desired_update ? 'desired_fan_speed'
      THEN v_desired_update->>'desired_fan_speed' ELSE desired_fan_speed END,
    updated_at = now()
  WHERE user_id = v_device_user_id
    AND farm_id = p_farm_id
    AND shed_id IS NOT DISTINCT FROM v_device_shed_id
  ;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'DESIRED_STATE_UPDATE_FAILED' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'command_id', v_command_id,
    'client_request_id', p_client_request_id,
    'device_name', v_device_name,
    'shed_id', v_device_shed_id,
    'deduplicated', NOT v_inserted
  );
END;
$function$;

-- Preserve the legacy five-argument entry point for old V8 clients. It
-- delegates with a NULL token id, so the canonical function still fails
-- closed when the farm/shed is ambiguous.
CREATE OR REPLACE FUNCTION public.queue_v8_actuator_command(
  p_farm_id uuid,
  p_shed_id uuid,
  p_command_type text,
  p_command_value boolean,
  p_client_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $legacy$
BEGIN
  RETURN public.queue_v8_actuator_command(
    p_farm_id,
    p_shed_id,
    NULL::uuid,
    p_command_type,
    p_command_value,
    p_client_request_id
  );
END;
$legacy$;

REVOKE ALL ON FUNCTION public.queue_v8_actuator_command(uuid, uuid, uuid, text, boolean, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_v8_actuator_command(uuid, uuid, uuid, text, boolean, uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION public.queue_v8_actuator_command(uuid, uuid, text, boolean, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_v8_actuator_command(uuid, uuid, text, boolean, uuid)
  TO authenticated;

COMMIT;