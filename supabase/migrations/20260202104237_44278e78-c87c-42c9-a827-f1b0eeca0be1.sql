-- Create power_outages table for tracking power failures
CREATE TABLE public.power_outages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_token_id UUID REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  power_source TEXT DEFAULT 'mains', -- mains, battery, ups
  battery_level_start INTEGER, -- Battery % when outage started
  battery_level_end INTEGER, -- Battery % when power restored
  is_ongoing BOOLEAN DEFAULT true,
  alert_sent BOOLEAN DEFAULT false,
  critical_alert_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_outages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own power outages"
  ON public.power_outages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add battery_capacity_wh to device_health for backup time estimation
ALTER TABLE public.device_health 
ADD COLUMN IF NOT EXISTS battery_capacity_wh INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS power_consumption_w INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS last_power_outage_id UUID REFERENCES public.power_outages(id);

-- Create index for faster queries
CREATE INDEX idx_power_outages_user_ongoing ON public.power_outages(user_id, is_ongoing);
CREATE INDEX idx_power_outages_started_at ON public.power_outages(started_at DESC);