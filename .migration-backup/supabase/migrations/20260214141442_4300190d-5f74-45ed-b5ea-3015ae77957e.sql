
-- Device Command Log table for ACK protocol
CREATE TABLE public.device_command_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  command_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL DEFAULT 'ESP32_LAYER_001',
  shed_id UUID REFERENCES public.sheds(id),
  command_type TEXT NOT NULL,
  command_value BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  acked_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  source TEXT DEFAULT 'cloud'
);

-- Enable RLS
ALTER TABLE public.device_command_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own command logs"
  ON public.device_command_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all command logs"
  ON public.device_command_log FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Index for fast pending command lookups
CREATE INDEX idx_command_log_pending ON public.device_command_log (user_id, status, device_name) WHERE status IN ('pending', 'sent');

-- Index for duplicate prevention
CREATE INDEX idx_command_log_dedup ON public.device_command_log (user_id, device_name, command_type, status) WHERE status IN ('pending', 'sent');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_command_log;
