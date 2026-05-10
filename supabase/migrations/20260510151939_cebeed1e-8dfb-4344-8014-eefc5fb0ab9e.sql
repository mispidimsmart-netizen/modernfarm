-- WhatsApp opt-in tracking + Twilio inbound log
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS whatsapp_optin_status text NOT NULL DEFAULT 'pending'
    CHECK (whatsapp_optin_status IN ('pending','opted_in','opted_out')),
  ADD COLUMN IF NOT EXISTS whatsapp_optin_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_optin_status text NOT NULL DEFAULT 'opted_in'
    CHECK (sms_optin_status IN ('pending','opted_in','opted_out')),
  ADD COLUMN IF NOT EXISTS sms_optin_at timestamptz;

CREATE TABLE IF NOT EXISTS public.twilio_inbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('sms','whatsapp')),
  from_number text NOT NULL,
  to_number text,
  body text,
  message_sid text,
  matched_user_id uuid,
  action text,           -- 'opt_in' | 'opt_out' | 'ack' | 'help' | 'unknown'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_twilio_inbound_from ON public.twilio_inbound_log(from_number, created_at DESC);

ALTER TABLE public.twilio_inbound_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their inbound logs"
  ON public.twilio_inbound_log FOR SELECT
  TO authenticated
  USING (matched_user_id = auth.uid());