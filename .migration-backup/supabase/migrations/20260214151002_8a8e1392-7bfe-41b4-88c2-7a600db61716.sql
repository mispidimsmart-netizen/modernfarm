
-- Device hardware profiles
CREATE TABLE public.device_hardware_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_token_id uuid NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES public.farms(id),
  board_type text NOT NULL DEFAULT 'esp32_devkit_v1',
  relay_count integer NOT NULL DEFAULT 4,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  gpio_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(device_token_id)
);

ALTER TABLE public.device_hardware_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant access" ON public.device_hardware_profiles
  AS RESTRICTIVE FOR ALL
  USING (user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (user_can_access_farm(auth.uid(), farm_id));

-- Firmware registry
CREATE TABLE public.firmware_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL,
  version_code integer NOT NULL,
  release_channel text NOT NULL DEFAULT 'stable' CHECK (release_channel IN ('stable', 'beta', 'canary')),
  min_hardware jsonb NOT NULL DEFAULT '{"board_types": ["esp32_devkit_v1"], "min_relay_count": 4, "required_features": []}'::jsonb,
  max_hardware jsonb NOT NULL DEFAULT '{}'::jsonb,
  compatibility_matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  changelog text,
  changelog_bn text,
  file_url text,
  file_size_bytes integer,
  crc32_checksum text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(version, release_channel)
);

ALTER TABLE public.firmware_registry ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read firmware registry
CREATE POLICY "Authenticated read" ON public.firmware_registry
  AS RESTRICTIVE FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super admins can manage firmware
CREATE POLICY "Super admin manage" ON public.firmware_registry
  AS RESTRICTIVE FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Compatibility check function
CREATE OR REPLACE FUNCTION public.check_firmware_compatibility(
  _device_token_id uuid,
  _firmware_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _device record;
  _firmware record;
  _result jsonb;
  _compatible boolean := true;
  _reasons text[] := '{}';
BEGIN
  -- Get device profile
  SELECT * INTO _device FROM device_hardware_profiles WHERE device_token_id = _device_token_id;
  IF _device IS NULL THEN
    RETURN jsonb_build_object('compatible', false, 'reasons', ARRAY['Device hardware profile not found']);
  END IF;

  -- Get firmware
  SELECT * INTO _firmware FROM firmware_registry WHERE id = _firmware_id AND is_active = true;
  IF _firmware IS NULL THEN
    RETURN jsonb_build_object('compatible', false, 'reasons', ARRAY['Firmware not found or inactive']);
  END IF;

  -- Check board type
  IF NOT (_firmware.min_hardware->>'board_types')::jsonb ? _device.board_type THEN
    _compatible := false;
    _reasons := array_append(_reasons, 'Board type "' || _device.board_type || '" not supported');
  END IF;

  -- Check relay count
  IF _device.relay_count < COALESCE((_firmware.min_hardware->>'min_relay_count')::int, 0) THEN
    _compatible := false;
    _reasons := array_append(_reasons, 'Requires min ' || (_firmware.min_hardware->>'min_relay_count') || ' relays, device has ' || _device.relay_count);
  END IF;

  -- Check required features
  IF _firmware.min_hardware ? 'required_features' THEN
    DECLARE
      _req_feature text;
    BEGIN
      FOR _req_feature IN SELECT jsonb_array_elements_text(_firmware.min_hardware->'required_features')
      LOOP
        IF NOT _device.features ? _req_feature THEN
          _compatible := false;
          _reasons := array_append(_reasons, 'Missing required feature: ' || _req_feature);
        END IF;
      END LOOP;
    END;
  END IF;

  RETURN jsonb_build_object(
    'compatible', _compatible,
    'reasons', _reasons,
    'device_board', _device.board_type,
    'device_relays', _device.relay_count,
    'device_features', _device.features,
    'firmware_version', _firmware.version,
    'firmware_channel', _firmware.release_channel
  );
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_device_hardware_profiles_updated_at
  BEFORE UPDATE ON public.device_hardware_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
