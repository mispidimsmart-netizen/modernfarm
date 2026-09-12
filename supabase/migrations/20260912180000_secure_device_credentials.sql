-- Phase 3A (additive): introduce checked credential APIs before browser access
-- is restricted. Apply this migration before publishing the matching frontend.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_legacy_device_token(
  _farm_id uuid,
  _shed_id uuid DEFAULT NULL,
  _device_name text DEFAULT 'ESP32 Controller'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _farm_owner_id uuid;
  _token text;
  _device_id uuid;
BEGIN
  IF _caller_id IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id
  INTO _farm_owner_id
  FROM public.farms
  WHERE id = _farm_id
    AND is_active = true;

  IF _farm_owner_id IS NULL THEN
    RAISE EXCEPTION 'invalid_farm' USING ERRCODE = '22023';
  END IF;

  IF _farm_owner_id <> _caller_id
     AND NOT public.is_super_admin(_caller_id) THEN
    RAISE EXCEPTION 'farm_owner_required' USING ERRCODE = '42501';
  END IF;

  IF _shed_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.sheds
       WHERE id = _shed_id
         AND farm_id = _farm_id
     ) THEN
    RAISE EXCEPTION 'invalid_shed' USING ERRCODE = '22023';
  END IF;

  _token := 'ESP32_' || upper(encode(extensions.gen_random_bytes(12), 'hex'));

  INSERT INTO public.device_tokens (
    user_id,
    farm_id,
    shed_id,
    device_name,
    token
  )
  VALUES (
    _farm_owner_id,
    _farm_id,
    _shed_id,
    COALESCE(NULLIF(btrim(_device_name), ''), 'ESP32 Controller'),
    _token
  )
  RETURNING id INTO _device_id;

  RETURN jsonb_build_object(
    'id', _device_id,
    'token', _token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_device_provisioning_token(
  _device_token_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _device record;
BEGIN
  IF _caller_id IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT
    dt.id,
    dt.token,
    dt.farm_id,
    dt.user_id,
    f.owner_id AS farm_owner_id
  INTO _device
  FROM public.device_tokens dt
  LEFT JOIN public.farms f ON f.id = dt.farm_id
  WHERE dt.id = _device_token_id
    AND dt.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'device_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_super_admin(_caller_id)
     AND _device.farm_owner_id IS DISTINCT FROM _caller_id THEN
    RAISE EXCEPTION 'farm_owner_required' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'id', _device.id,
    'token', _device.token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_legacy_device_token(uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_legacy_device_token(uuid, uuid, text)
  TO authenticated;

REVOKE ALL ON FUNCTION public.get_device_provisioning_token(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_device_provisioning_token(uuid)
  TO authenticated;

COMMIT;