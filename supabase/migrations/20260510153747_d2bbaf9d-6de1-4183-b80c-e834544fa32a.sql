
ALTER TABLE public.farm_settings
  ADD COLUMN IF NOT EXISTS weekly_report_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_report_email text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('weekly-reports', 'weekly-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own weekly reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'weekly-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE TABLE IF NOT EXISTS public.weekly_report_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  farm_id uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  file_path text,
  signed_url text,
  email_sent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  error text
);

ALTER TABLE public.weekly_report_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly report log"
ON public.weekly_report_log FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_report_log_user ON public.weekly_report_log(user_id, generated_at DESC);
