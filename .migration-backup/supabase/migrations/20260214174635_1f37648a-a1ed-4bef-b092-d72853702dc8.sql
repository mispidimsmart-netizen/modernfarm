
-- Forensic safety timeline for dispute analysis (24h rolling)
CREATE TABLE public.safety_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID REFERENCES public.farms(id),
  shed_id UUID REFERENCES public.sheds(id),
  
  -- Timestamp
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- System state
  system_state TEXT NOT NULL DEFAULT 'NORMAL',
  uptime_ms BIGINT DEFAULT 0,
  
  -- REQUESTED relay state (what software wanted)
  requested_fan BOOLEAN NOT NULL DEFAULT false,
  requested_fan_speed TEXT DEFAULT 'OFF',
  requested_heater BOOLEAN NOT NULL DEFAULT false,
  requested_fogger BOOLEAN NOT NULL DEFAULT false,
  requested_alarm BOOLEAN NOT NULL DEFAULT false,
  requested_circulation_fan BOOLEAN NOT NULL DEFAULT false,
  
  -- ACTUAL relay state (what hardware reports)
  actual_fan BOOLEAN NOT NULL DEFAULT false,
  actual_fan_speed TEXT DEFAULT 'OFF',
  actual_heater BOOLEAN NOT NULL DEFAULT false,
  actual_fogger BOOLEAN NOT NULL DEFAULT false,
  actual_alarm BOOLEAN NOT NULL DEFAULT false,
  actual_circulation_fan BOOLEAN NOT NULL DEFAULT false,
  
  -- State mismatch detection
  relay_mismatch BOOLEAN NOT NULL DEFAULT false,
  mismatch_details TEXT,
  
  -- Environment snapshot
  temperature NUMERIC,
  temperature2 NUMERIC,
  worst_case_max_temp NUMERIC,
  worst_case_min_temp NUMERIC,
  humidity NUMERIC,
  ammonia NUMERIC,
  water_usage NUMERIC,
  hsi_value NUMERIC,
  
  -- Environment RESPONSE to actuator action
  temp_delta_1min NUMERIC,
  temp_delta_5min NUMERIC,
  humidity_delta_1min NUMERIC,
  
  -- Safety decisions
  safety_override_active BOOLEAN DEFAULT false,
  safety_override_reason TEXT,
  heater_allowed BOOLEAN DEFAULT true,
  heater_blocked_reason TEXT,
  force_ventilation BOOLEAN DEFAULT false,
  
  -- Actuator effect validation
  fan_effect_verified BOOLEAN,
  fan_effect_failures INTEGER DEFAULT 0,
  heater_effect_verified BOOLEAN,
  heater_effect_failures INTEGER DEFAULT 0,
  thermal_model_plausible BOOLEAN DEFAULT true,
  thermal_model_deviation NUMERIC,
  
  -- Source of this log entry
  source TEXT NOT NULL DEFAULT 'firmware',
  event_type TEXT NOT NULL DEFAULT 'periodic',
  event_detail TEXT,
  
  -- Manual override tracking
  manual_override_active BOOLEAN DEFAULT false,
  override_target_temp NUMERIC,
  
  -- Reboot safety
  reboot_heater_locked BOOLEAN DEFAULT false,
  reboot_vent_purge BOOLEAN DEFAULT false,
  reboot_nh3_muted BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.safety_timeline ENABLE ROW LEVEL SECURITY;

-- Farm tenant access policy
CREATE POLICY "Farm tenant access"
  ON public.safety_timeline
  FOR ALL
  USING (user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (user_can_access_farm(auth.uid(), farm_id));

-- Index for fast time-range queries (24h window)
CREATE INDEX idx_safety_timeline_user_time 
  ON public.safety_timeline (user_id, recorded_at DESC);

CREATE INDEX idx_safety_timeline_farm_time 
  ON public.safety_timeline (farm_id, shed_id, recorded_at DESC);

-- Index for mismatch queries (dispute analysis)
CREATE INDEX idx_safety_timeline_mismatches 
  ON public.safety_timeline (farm_id, relay_mismatch, recorded_at DESC) 
  WHERE relay_mismatch = true;

-- Enable realtime for live forensic monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_timeline;
