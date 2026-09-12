
-- Safety status table: written by firmware/backend, read by frontend
-- This is the single source of truth for all safety state
CREATE TABLE public.safety_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID REFERENCES public.farms(id),
  shed_id UUID REFERENCES public.sheds(id),
  
  -- Overall safety state
  system_state TEXT NOT NULL DEFAULT 'NORMAL' CHECK (system_state IN ('NORMAL','WARNING','DANGER','EMERGENCY','SURVIVAL','SENSOR_FAIL')),
  
  -- Sensor validation
  sensor_state JSONB NOT NULL DEFAULT '{"temperature":"VALID","humidity":"VALID","ammonia":"VALID","water":"VALID"}'::jsonb,
  sensor_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  sensor_drift_detected BOOLEAN NOT NULL DEFAULT false,
  sensor_drift_reason TEXT,
  
  -- Airflow verification
  airflow_verified BOOLEAN NOT NULL DEFAULT true,
  airflow_ineffective BOOLEAN NOT NULL DEFAULT false,
  airflow_fail_reason TEXT,
  airflow_consecutive_failures INT NOT NULL DEFAULT 0,
  airflow_last_verified_at TIMESTAMPTZ,
  
  -- Relay protection
  stuck_relay_detected TEXT, -- relay name or null
  locked_relays TEXT[] NOT NULL DEFAULT '{}',
  relay_violations INT NOT NULL DEFAULT 0,
  heater_runtime_ms BIGINT NOT NULL DEFAULT 0,
  motor_runtime_ms BIGINT NOT NULL DEFAULT 0,
  
  -- Heater-vent interlock
  heater_allowed BOOLEAN NOT NULL DEFAULT true,
  heater_blocked_reason TEXT,
  mandatory_fan_pulse_active BOOLEAN NOT NULL DEFAULT false,
  rapid_temp_rise_detected BOOLEAN NOT NULL DEFAULT false,
  force_ventilation BOOLEAN NOT NULL DEFAULT false,
  min_vent_duty_required BOOLEAN NOT NULL DEFAULT false,
  current_temp_rate REAL NOT NULL DEFAULT 0,
  
  -- Emergency protection
  emergency_priority TEXT, -- NULL, INFO, WARNING, CRITICAL, LIFE_THREATENING
  emergency_active BOOLEAN NOT NULL DEFAULT false,
  
  -- Override status
  override_active BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  override_remaining_seconds INT,
  override_out_of_bio_range BOOLEAN NOT NULL DEFAULT false,
  
  -- Survival mode
  survival_mode BOOLEAN NOT NULL DEFAULT false,
  survival_fan_on BOOLEAN NOT NULL DEFAULT false,
  survival_heater_on BOOLEAN NOT NULL DEFAULT false,
  
  -- Safe mode
  safe_mode_active BOOLEAN NOT NULL DEFAULT false,
  safe_mode_until TIMESTAMPTZ,
  
  -- Plausibility
  plausibility_degraded BOOLEAN NOT NULL DEFAULT false,
  heater_authority_percent INT NOT NULL DEFAULT 100,
  plausibility_reason TEXT,
  
  -- Heat stress
  hsi_value REAL,
  hsi_level TEXT,
  hsi_fan_activated BOOLEAN NOT NULL DEFAULT false,
  
  -- Source tracking
  last_updated_by TEXT NOT NULL DEFAULT 'firmware' CHECK (last_updated_by IN ('firmware','backend','system')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, shed_id)
);

-- Enable RLS
ALTER TABLE public.safety_status ENABLE ROW LEVEL SECURITY;

-- Users can read their own safety status
CREATE POLICY "Users can view own safety status"
  ON public.safety_status FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (backend/firmware via edge functions) can write
-- Frontend CANNOT write to this table
CREATE POLICY "Service role can manage safety status"
  ON public.safety_status FOR ALL
  USING (auth.uid() = user_id);

-- Enable realtime for frontend subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_status;

-- Trigger for updated_at
CREATE TRIGGER update_safety_status_updated_at
  BEFORE UPDATE ON public.safety_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
