CREATE OR REPLACE FUNCTION public.provision_device_secret(_device_token_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
  _device record;
  _secret text;
BEGIN
  IF _caller_id IS NULL OR auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT dt.id, dt.device_secret, f.owner_id AS farm_owner_id
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

  IF _device.device_secret IS NULL OR length(_device.device_secret) < 32 THEN
    _secret := encode(extensions.gen_random_bytes(32), 'hex');
    UPDATE public.device_tokens
       SET device_secret = _secret
     WHERE id = _device_token_id;
  ELSE
    _secret := _device.device_secret;
  END IF;

  RETURN _secret;
END;
$function$;

REVOKE ALL ON FUNCTION public.provision_device_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_device_secret(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_device_secret(uuid) TO service_role;