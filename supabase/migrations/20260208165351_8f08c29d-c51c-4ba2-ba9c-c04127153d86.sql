-- Create device calibration table to store installation wizard results
CREATE TABLE public.device_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_token_id UUID REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL,
  
  -- Farm dimensions
  farm_length_meters NUMERIC,
  farm_width_meters NUMERIC,
  farm_height_meters NUMERIC,
  air_volume_cubic_meters NUMERIC,
  ventilation_baseline NUMERIC,
  
  -- Fan direction test
  fan_direction_test_passed BOOLEAN DEFAULT false,
  fan_direction_tested_at TIMESTAMPTZ,
  
  -- Temperature sensor placement
  temp_sensor_test_passed BOOLEAN DEFAULT false,
  temp_drop_rate NUMERIC,
  temp_sensor_placement_status TEXT DEFAULT 'unknown',
  temp_sensor_tested_at TIMESTAMPTZ,
  
  -- Ammonia baseline
  clean_air_nh3_ppm NUMERIC DEFAULT 0,
  nh3_baseline_calibrated_at TIMESTAMPTZ,
  
  -- Heater response test
  heater_test_passed BOOLEAN DEFAULT false,
  heater_temp_rise NUMERIC,
  heater_tested_at TIMESTAMPTZ,
  
  -- Water flow test
  water_flow_test_passed BOOLEAN DEFAULT false,
  water_normal_pulse_pattern NUMERIC,
  water_flow_tested_at TIMESTAMPTZ,
  
  -- Overall status
  overall_status TEXT DEFAULT 'pending',
  calibration_score INTEGER DEFAULT 0,
  wizard_completed BOOLEAN DEFAULT false,
  wizard_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_calibration ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own calibration data"
ON public.device_calibration
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all calibration data"
ON public.device_calibration
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Update trigger
CREATE TRIGGER update_device_calibration_updated_at
BEFORE UPDATE ON public.device_calibration
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_device_calibration_user_id ON public.device_calibration(user_id);
CREATE INDEX idx_device_calibration_device_token_id ON public.device_calibration(device_token_id);