
-- Track last digest send per farm (per channel)
CREATE TABLE IF NOT EXISTS public.notification_digest_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push','sms','whatsapp')),
  last_digest_at timestamptz NOT NULL DEFAULT now(),
  last_digest_alert_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_ndigest_farm ON public.notification_digest_state(farm_id);

ALTER TABLE public.notification_digest_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read digest state"
  ON public.notification_digest_state FOR SELECT TO authenticated
  USING (public.user_can_access_farm(auth.uid(), farm_id));

-- Service-role-only writes (no INSERT/UPDATE policies for users; service role bypasses RLS)

CREATE TRIGGER trg_ndigest_updated_at
  BEFORE UPDATE ON public.notification_digest_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
