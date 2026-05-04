
CREATE OR REPLACE FUNCTION public.audit_tenant_isolation()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _issues jsonb := '[]'::jsonb;
  _counts jsonb := '{}'::jsonb;
  r record;
BEGIN
  IF _caller IS NULL OR NOT public.is_super_admin(_caller) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;

  -- 1. device_tokens with NULL farm_id
  FOR r IN
    SELECT id, user_id, device_name FROM public.device_tokens WHERE farm_id IS NULL LIMIT 50
  LOOP
    _issues := _issues || jsonb_build_object(
      'severity','high','category','device_token_unbound',
      'table','device_tokens','row_id',r.id,'user_id',r.user_id,
      'detail','Device token has NULL farm_id — could leak across farms');
  END LOOP;

  -- 2. device_tokens whose owner user is not a member of that farm
  FOR r IN
    SELECT dt.id, dt.farm_id, dt.user_id
    FROM public.device_tokens dt
    LEFT JOIN public.farm_members fm ON fm.farm_id = dt.farm_id AND fm.user_id = dt.user_id
    LEFT JOIN public.farms f ON f.id = dt.farm_id AND f.owner_id = dt.user_id
    WHERE dt.farm_id IS NOT NULL AND fm.id IS NULL AND f.id IS NULL
    LIMIT 50
  LOOP
    _issues := _issues || jsonb_build_object(
      'severity','critical','category','device_token_owner_mismatch',
      'table','device_tokens','row_id',r.id,'user_id',r.user_id,'farm_id',r.farm_id,
      'detail','Token user_id is neither a farm_member nor the farm owner');
  END LOOP;

  -- 3. Cross-binding: device_health.device_token_id points to token in different farm
  FOR r IN
    SELECT dh.id, dh.farm_id AS health_farm, dt.farm_id AS token_farm, dh.device_token_id
    FROM public.device_health dh
    JOIN public.device_tokens dt ON dt.id = dh.device_token_id
    WHERE dh.farm_id IS DISTINCT FROM dt.farm_id
    LIMIT 50
  LOOP
    _issues := _issues || jsonb_build_object(
      'severity','critical','category','device_health_token_farm_mismatch',
      'table','device_health','row_id',r.id,
      'detail',format('device_health.farm_id=%s but device_token.farm_id=%s', r.health_farm, r.token_farm));
  END LOOP;

  -- 4. Tables with NULL farm_id (operational scope)
  FOR r IN
    SELECT 'sensor_readings'::text AS tbl, count(*) AS c FROM public.sensor_readings WHERE farm_id IS NULL
    UNION ALL SELECT 'device_status', count(*) FROM public.device_status WHERE farm_id IS NULL
    UNION ALL SELECT 'device_health', count(*) FROM public.device_health WHERE farm_id IS NULL
    UNION ALL SELECT 'device_commands', count(*) FROM public.device_commands WHERE farm_id IS NULL
    UNION ALL SELECT 'alerts', count(*) FROM public.alerts WHERE farm_id IS NULL
    UNION ALL SELECT 'farm_settings', count(*) FROM public.farm_settings WHERE farm_id IS NULL
    UNION ALL SELECT 'lighting_schedule', count(*) FROM public.lighting_schedule WHERE farm_id IS NULL
    UNION ALL SELECT 'flock_info', count(*) FROM public.flock_info WHERE farm_id IS NULL
    UNION ALL SELECT 'expenses', count(*) FROM public.expenses WHERE farm_id IS NULL
    UNION ALL SELECT 'broiler_batches', count(*) FROM public.broiler_batches WHERE farm_id IS NULL
    UNION ALL SELECT 'layer_batches', count(*) FROM public.layer_batches WHERE farm_id IS NULL
  LOOP
    IF r.c > 0 THEN
      _issues := _issues || jsonb_build_object(
        'severity', CASE WHEN r.tbl IN ('device_commands','device_status','sensor_readings') THEN 'critical' ELSE 'medium' END,
        'category','null_farm_id','table',r.tbl,'count',r.c,
        'detail',format('%s rows in %s have NULL farm_id (excluded from RLS by user_can_access_farm)', r.c, r.tbl));
    END IF;
  END LOOP;

  -- 5. Owners not in farm_members (would lock them out)
  FOR r IN
    SELECT f.id, f.owner_id, f.name
    FROM public.farms f
    LEFT JOIN public.farm_members fm ON fm.farm_id = f.id AND fm.user_id = f.owner_id
    WHERE fm.id IS NULL
    LIMIT 50
  LOOP
    _issues := _issues || jsonb_build_object(
      'severity','high','category','owner_not_member',
      'table','farms','row_id',r.id,'user_id',r.owner_id,
      'detail','Farm owner missing from farm_members — they will be denied access via user_can_access_farm()');
  END LOOP;

  -- Aggregate counts
  SELECT jsonb_build_object(
    'farms', (SELECT count(*) FROM public.farms),
    'device_tokens', (SELECT count(*) FROM public.device_tokens),
    'farm_members', (SELECT count(*) FROM public.farm_members),
    'total_issues', jsonb_array_length(_issues)
  ) INTO _counts;

  RETURN jsonb_build_object(
    'scanned_at', now(),
    'caller', _caller,
    'summary', _counts,
    'issues', _issues
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_tenant_isolation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_tenant_isolation() TO authenticated;
