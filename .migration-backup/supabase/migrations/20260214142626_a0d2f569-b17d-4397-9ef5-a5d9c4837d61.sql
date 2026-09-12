
-- Emergency events table for global farm protection system
CREATE TABLE public.emergency_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shed_id UUID REFERENCES public.sheds(id),
  
  -- Event classification
  trigger_type TEXT NOT NULL, -- 'heatstroke_risk', 'sensor_offline', 'ammonia_high', 'power_unstable', 'multi_device_offline'
  priority TEXT NOT NULL DEFAULT 'WARNING', -- 'INFO', 'WARNING', 'CRITICAL', 'LIFE_THREATENING'
  
  -- Event details
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  description TEXT,
  description_bn TEXT,
  
  -- Sensor snapshot at time of event
  sensor_snapshot JSONB DEFAULT '{}',
  
  -- Actions taken
  actions_taken JSONB DEFAULT '[]', -- ['force_ventilation', 'disable_heater', 'notify_owner', 'call_webhook']
  
  -- Resolution
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'escalated'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  
  -- Webhook tracking
  webhook_called BOOLEAN DEFAULT false,
  webhook_response JSONB,
  webhook_url TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'system', -- 'system', 'device', 'user'
  device_token_id UUID REFERENCES public.device_tokens(id),
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own emergency events"
  ON public.emergency_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency events"
  ON public.emergency_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency events"
  ON public.emergency_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all emergency events"
  ON public.emergency_events FOR SELECT
  USING (is_super_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_emergency_events_user_status ON public.emergency_events(user_id, status);
CREATE INDEX idx_emergency_events_priority ON public.emergency_events(priority, created_at DESC);
CREATE INDEX idx_emergency_events_trigger ON public.emergency_events(trigger_type, created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_emergency_events_updated_at
  BEFORE UPDATE ON public.emergency_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for emergency events
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_events;

-- Emergency webhook config table (per user)
CREATE TABLE public.emergency_webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  webhook_url TEXT,
  webhook_enabled BOOLEAN DEFAULT false,
  notify_on_info BOOLEAN DEFAULT false,
  notify_on_warning BOOLEAN DEFAULT true,
  notify_on_critical BOOLEAN DEFAULT true,
  notify_on_life_threatening BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own webhook config"
  ON public.emergency_webhook_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_emergency_webhook_config_updated_at
  BEFORE UPDATE ON public.emergency_webhook_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
