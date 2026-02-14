
-- Firmware rollout batches for canary deployment
CREATE TABLE public.firmware_rollout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firmware_id uuid NOT NULL REFERENCES public.ota_firmware(id) ON DELETE CASCADE,
  batch_number integer NOT NULL DEFAULT 1,
  target_percentage integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  total_devices integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  abort_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.firmware_rollout_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage rollout batches"
  ON public.firmware_rollout_batches FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view active rollouts"
  ON public.firmware_rollout_batches FOR SELECT
  USING (status IN ('active', 'completed'));

-- Firmware install logs for tracking per-device results
CREATE TABLE public.firmware_install_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firmware_id uuid NOT NULL REFERENCES public.ota_firmware(id) ON DELETE CASCADE,
  rollout_batch_id uuid REFERENCES public.firmware_rollout_batches(id),
  device_token_id uuid NOT NULL REFERENCES public.device_tokens(id),
  user_id uuid NOT NULL,
  from_version text,
  to_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  crc_validated boolean DEFAULT false,
  board_type text,
  partition_used text,
  rollback_triggered boolean DEFAULT false,
  error_message text,
  download_started_at timestamptz,
  install_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firmware_install_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own install logs"
  ON public.firmware_install_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all install logs"
  ON public.firmware_install_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Add board_type and rollout fields to ota_firmware
ALTER TABLE public.ota_firmware
  ADD COLUMN IF NOT EXISTS board_type text DEFAULT 'esp32',
  ADD COLUMN IF NOT EXISTS crc32 text,
  ADD COLUMN IF NOT EXISTS rollout_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS rollout_percentage integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_fail_rate numeric DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS total_installs integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_installs integer DEFAULT 0;

-- Indexes
CREATE INDEX idx_rollout_batches_firmware ON public.firmware_rollout_batches(firmware_id, batch_number);
CREATE INDEX idx_install_logs_firmware ON public.firmware_install_logs(firmware_id, status);
CREATE INDEX idx_install_logs_device ON public.firmware_install_logs(device_token_id);
