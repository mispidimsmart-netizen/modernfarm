
-- Phase 5: Multi-Device Mesh + GSM Fallback (additive only)

-- 1. device_tokens additive columns
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS mesh_role text NOT NULL DEFAULT 'independent'
    CHECK (mesh_role IN ('independent','master','slave','backup')),
  ADD COLUMN IF NOT EXISTS mesh_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_device_tokens_mesh_group
  ON public.device_tokens(mesh_group_id) WHERE mesh_group_id IS NOT NULL;

-- 2. device_mesh_peers
CREATE TABLE IF NOT EXISTS public.device_mesh_peers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  primary_device_token_id uuid NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  peer_device_token_id uuid NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'slave' CHECK (role IN ('master','slave','backup')),
  link_quality int NOT NULL DEFAULT 0 CHECK (link_quality BETWEEN 0 AND 100),
  last_handshake_at timestamptz,
  pairing_code text,
  pairing_code_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_device_token_id, peer_device_token_id)
);
CREATE INDEX IF NOT EXISTS idx_mesh_peers_farm ON public.device_mesh_peers(farm_id);
ALTER TABLE public.device_mesh_peers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mesh_peers_select" ON public.device_mesh_peers FOR SELECT
  USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "mesh_peers_insert" ON public.device_mesh_peers FOR INSERT
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "mesh_peers_update" ON public.device_mesh_peers FOR UPDATE
  USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "mesh_peers_delete" ON public.device_mesh_peers FOR DELETE
  USING (public.user_can_access_farm(auth.uid(), farm_id));

CREATE TRIGGER trg_mesh_peers_updated_at
  BEFORE UPDATE ON public.device_mesh_peers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. mesh_sync_log
CREATE TABLE IF NOT EXISTS public.mesh_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  from_device_id uuid REFERENCES public.device_tokens(id) ON DELETE SET NULL,
  to_device_id uuid REFERENCES public.device_tokens(id) ON DELETE SET NULL,
  payload_type text NOT NULL CHECK (payload_type IN ('sensor','command','safety_state','heartbeat')),
  bytes int NOT NULL DEFAULT 0,
  latency_ms int,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mesh_sync_log_farm_time
  ON public.mesh_sync_log(farm_id, created_at DESC);
ALTER TABLE public.mesh_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mesh_sync_log_select" ON public.mesh_sync_log FOR SELECT
  USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "mesh_sync_log_insert" ON public.mesh_sync_log FOR INSERT
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- 4. farm_settings additive (gsm)
ALTER TABLE public.farm_settings
  ADD COLUMN IF NOT EXISTS gsm_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS authorized_phones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gsm_daily_sms_limit int NOT NULL DEFAULT 20;

-- 5. gsm_inbound_sms
CREATE TABLE IF NOT EXISTS public.gsm_inbound_sms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_id uuid NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  from_phone text NOT NULL,
  body text NOT NULL,
  parsed_command text,
  parsed_args jsonb,
  authorized boolean NOT NULL DEFAULT false,
  executed_at timestamptz,
  response_sent boolean NOT NULL DEFAULT false,
  response_body text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gsm_inbound_farm_time
  ON public.gsm_inbound_sms(farm_id, received_at DESC);
ALTER TABLE public.gsm_inbound_sms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gsm_inbound_select" ON public.gsm_inbound_sms FOR SELECT
  USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "gsm_inbound_insert" ON public.gsm_inbound_sms FOR INSERT
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- 6. gsm_outbound_sms
CREATE TABLE IF NOT EXISTS public.gsm_outbound_sms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_id uuid NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  to_phone text NOT NULL,
  body text NOT NULL,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  delivered_at timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gsm_outbound_farm_time
  ON public.gsm_outbound_sms(farm_id, created_at DESC);
ALTER TABLE public.gsm_outbound_sms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gsm_outbound_select" ON public.gsm_outbound_sms FOR SELECT
  USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "gsm_outbound_insert" ON public.gsm_outbound_sms FOR INSERT
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- 7. Helper: generate pairing code (6-digit, 1-min expiry)
CREATE OR REPLACE FUNCTION public.generate_mesh_pairing_code(_primary_device_token_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _u uuid := auth.uid();
  _farm uuid; _code text; _exp timestamptz;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT farm_id INTO _farm FROM device_tokens WHERE id = _primary_device_token_id;
  IF _farm IS NULL OR NOT public.user_can_access_farm(_u, _farm) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  _code := lpad((floor(random()*1000000))::int::text, 6, '0');
  _exp := now() + interval '1 minute';
  -- Store on the master row (placeholder peer with self-id 0 not used; we just upsert into a dedicated row by primary)
  INSERT INTO device_mesh_peers (farm_id, primary_device_token_id, peer_device_token_id, role, pairing_code, pairing_code_expires_at)
  VALUES (_farm, _primary_device_token_id, _primary_device_token_id, 'master', _code, _exp)
  ON CONFLICT (primary_device_token_id, peer_device_token_id)
  DO UPDATE SET pairing_code = _code, pairing_code_expires_at = _exp, updated_at = now();
  RETURN jsonb_build_object('code', _code, 'expires_at', _exp);
END; $$;
