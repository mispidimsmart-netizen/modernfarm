-- 1. MQTT message audit log
CREATE TABLE IF NOT EXISTS public.mqtt_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  device_token_id uuid REFERENCES public.device_tokens(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('publish', 'subscribe', 'inbound')),
  topic text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'received')),
  error text,
  qos int DEFAULT 1,
  command_id uuid REFERENCES public.device_commands(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mqtt_log_farm_created ON public.mqtt_message_log(farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mqtt_log_device ON public.mqtt_message_log(device_token_id, created_at DESC);

ALTER TABLE public.mqtt_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm members view own MQTT log"
  ON public.mqtt_message_log FOR SELECT
  TO authenticated
  USING (farm_id IS NOT NULL AND public.user_can_access_farm(auth.uid(), farm_id));

CREATE POLICY "Super admin manage MQTT log"
  ON public.mqtt_message_log FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 2. Enable MQTT per device
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS mqtt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mqtt_topic_prefix text;

-- Auto-fill topic prefix on insert if mqtt_enabled
CREATE OR REPLACE FUNCTION public.set_mqtt_topic_prefix()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mqtt_topic_prefix IS NULL AND NEW.farm_id IS NOT NULL THEN
    NEW.mqtt_topic_prefix := 'farm/' || NEW.farm_id::text || '/dev/' || NEW.id::text;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_mqtt_topic_prefix ON public.device_tokens;
CREATE TRIGGER trg_set_mqtt_topic_prefix
  BEFORE INSERT OR UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_mqtt_topic_prefix();

-- Backfill existing rows
UPDATE public.device_tokens
SET mqtt_topic_prefix = 'farm/' || farm_id::text || '/dev/' || id::text
WHERE mqtt_topic_prefix IS NULL AND farm_id IS NOT NULL;

-- 3. Cleanup helper (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_mqtt_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.mqtt_message_log WHERE created_at < now() - interval '30 days';
END $$;