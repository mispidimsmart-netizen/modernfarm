
ALTER TABLE public.firmware_registry
  ADD COLUMN IF NOT EXISTS min_version_code_required integer,
  ADD COLUMN IF NOT EXISTS require_signature boolean NOT NULL DEFAULT true;

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS last_installed_version_code integer;

CREATE TABLE IF NOT EXISTS public.ota_gate_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_id uuid REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  farm_id uuid,
  firmware_id uuid,
  gate text NOT NULL,
  passed boolean NOT NULL,
  reason text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ota_gate_log_created ON public.ota_gate_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ota_gate_log_gate ON public.ota_gate_log(gate, passed);

ALTER TABLE public.ota_gate_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin read ota_gate_log" ON public.ota_gate_log
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.evaluate_ota_safety_gates(
  _device_token_id uuid,
  _firmware_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _fw record;
  _dev record;
  _ds record;
  _failures jsonb := '[]'::jsonb;
  _passed boolean := true;
BEGIN
  SELECT * INTO _fw FROM firmware_registry WHERE id = _firmware_id;
  IF _fw IS NULL THEN
    RETURN jsonb_build_object('passed', false, 'reasons', jsonb_build_array('firmware_not_found'));
  END IF;

  SELECT * INTO _dev FROM device_tokens WHERE id = _device_token_id;
  IF _dev IS NULL THEN
    RETURN jsonb_build_object('passed', false, 'reasons', jsonb_build_array('device_not_found'));
  END IF;

  -- Gate 1: anti-rollback
  IF _fw.min_version_code_required IS NOT NULL
     AND _fw.version_code < _fw.min_version_code_required THEN
    _passed := false;
    _failures := _failures || jsonb_build_object('gate','anti_rollback',
      'reason', format('firmware version_code %s below required floor %s',
                       _fw.version_code, _fw.min_version_code_required));
  END IF;

  IF _dev.last_installed_version_code IS NOT NULL
     AND _fw.version_code < _dev.last_installed_version_code THEN
    _passed := false;
    _failures := _failures || jsonb_build_object('gate','anti_rollback',
      'reason', format('device already on version_code %s; refusing downgrade to %s',
                       _dev.last_installed_version_code, _fw.version_code));
  END IF;

  -- Gate 2: signature required
  IF COALESCE(_fw.require_signature, true) THEN
    IF _fw.signature_b64 IS NULL OR _fw.signing_key_id IS NULL OR _fw.sha256_hex IS NULL THEN
      _passed := false;
      _failures := _failures || jsonb_build_object('gate','signature_required',
        'reason','firmware not signed but require_signature=true');
    END IF;
  END IF;

  -- Gate 3: emergency / safety hold — refuse OTA while shed in emergency mode
  SELECT safety_status, fan_on, heater_on INTO _ds
    FROM device_status
    WHERE farm_id = _dev.farm_id
    ORDER BY updated_at DESC LIMIT 1;
  IF _ds.safety_status = 'emergency' THEN
    _passed := false;
    _failures := _failures || jsonb_build_object('gate','emergency_mode',
      'reason','farm currently in emergency safety mode — OTA postponed');
  END IF;

  -- Audit log (one row per gate evaluation)
  INSERT INTO ota_gate_log(device_token_id, farm_id, firmware_id, gate, passed, reason, details)
  VALUES (
    _device_token_id, _dev.farm_id, _firmware_id,
    'composite', _passed,
    CASE WHEN _passed THEN 'all_passed' ELSE 'one_or_more_failed' END,
    jsonb_build_object('failures', _failures)
  );

  RETURN jsonb_build_object(
    'passed', _passed,
    'failures', _failures,
    'firmware_version', _fw.version,
    'firmware_version_code', _fw.version_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ota_hardening_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT jsonb_build_object(
    'firmware_total', (SELECT count(*) FROM firmware_registry WHERE is_active = true),
    'firmware_signed', (SELECT count(*) FROM firmware_registry
                        WHERE is_active = true AND signature_b64 IS NOT NULL AND signing_key_id IS NOT NULL),
    'firmware_require_signature', (SELECT count(*) FROM firmware_registry
                                   WHERE is_active = true AND require_signature = true),
    'firmware_with_anti_rollback', (SELECT count(*) FROM firmware_registry
                                    WHERE is_active = true AND min_version_code_required IS NOT NULL),
    'gate_blocks_24h', (SELECT count(*) FROM ota_gate_log
                        WHERE created_at > now() - interval '24 hours' AND passed = false),
    'gate_evaluations_24h', (SELECT count(*) FROM ota_gate_log
                             WHERE created_at > now() - interval '24 hours'),
    'signature_failures_24h', (SELECT count(*) FROM firmware_install_logs
                               WHERE created_at > now() - interval '24 hours'
                                 AND signature_validated = false
                                 AND status IN ('completed','failed')),
    'rollbacks_24h', (SELECT count(*) FROM firmware_install_logs
                      WHERE created_at > now() - interval '24 hours' AND auto_rolled_back = true),
    'recent_blocks', COALESCE((
      SELECT jsonb_agg(row_to_json(x)) FROM (
        SELECT created_at, firmware_id, gate, reason, details
        FROM ota_gate_log
        WHERE passed = false
        ORDER BY created_at DESC LIMIT 10
      ) x
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;
