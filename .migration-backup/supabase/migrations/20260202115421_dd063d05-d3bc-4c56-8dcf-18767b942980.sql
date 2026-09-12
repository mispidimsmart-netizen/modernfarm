-- Daily Summary table for farm health scores
CREATE TABLE public.daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  health_score INTEGER NOT NULL DEFAULT 0,
  avg_temperature NUMERIC,
  avg_humidity NUMERIC,
  avg_ammonia NUMERIC,
  total_water_usage NUMERIC DEFAULT 0,
  total_eggs INTEGER DEFAULT 0,
  mortality_count INTEGER DEFAULT 0,
  alerts_count INTEGER DEFAULT 0,
  power_outage_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_date)
);

-- Water Trends table for tracking water usage patterns
CREATE TABLE public.water_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  water_usage NUMERIC NOT NULL,
  trend_type TEXT NOT NULL DEFAULT 'normal', -- normal, increasing, decreasing, anomaly
  deviation_percent NUMERIC DEFAULT 0,
  rolling_avg_7d NUMERIC,
  rolling_avg_30d NUMERIC,
  shed_id UUID REFERENCES public.sheds(id),
  notes TEXT
);

-- Power Outage Logs for detailed outage tracking
CREATE TABLE public.power_outage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  power_outage_id UUID REFERENCES public.power_outages(id),
  log_type TEXT NOT NULL DEFAULT 'info', -- info, warning, critical, recovery
  message TEXT NOT NULL,
  battery_level INTEGER,
  temperature_during NUMERIC,
  humidity_during NUMERIC,
  actions_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mode Profiles for custom user-defined smart modes
CREATE TABLE public.mode_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT,
  description TEXT,
  description_bn TEXT,
  icon TEXT DEFAULT '⚙️',
  color TEXT DEFAULT 'text-gray-600',
  bg_color TEXT DEFAULT 'bg-gray-100',
  is_active BOOLEAN DEFAULT false,
  is_custom BOOLEAN DEFAULT true,
  temperature_min NUMERIC NOT NULL DEFAULT 18,
  temperature_max NUMERIC NOT NULL DEFAULT 32,
  humidity_min NUMERIC NOT NULL DEFAULT 40,
  humidity_max NUMERIC NOT NULL DEFAULT 80,
  ammonia_max NUMERIC NOT NULL DEFAULT 25,
  fan_low_temp_min NUMERIC NOT NULL DEFAULT 28,
  fan_low_temp_max NUMERIC NOT NULL DEFAULT 30,
  fan_medium_temp_min NUMERIC NOT NULL DEFAULT 30,
  fan_medium_temp_max NUMERIC NOT NULL DEFAULT 33,
  fan_high_temp_min NUMERIC NOT NULL DEFAULT 33,
  hsi_mild_threshold NUMERIC NOT NULL DEFAULT 70,
  hsi_moderate_threshold NUMERIC NOT NULL DEFAULT 75,
  hsi_severe_threshold NUMERIC NOT NULL DEFAULT 80,
  hsi_emergency_threshold NUMERIC NOT NULL DEFAULT 85,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_outage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mode_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own daily summaries" ON public.daily_summary
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own water trends" ON public.water_trends
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own power outage logs" ON public.power_outage_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own mode profiles" ON public.mode_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_daily_summary_user_date ON public.daily_summary(user_id, summary_date);
CREATE INDEX idx_water_trends_user_time ON public.water_trends(user_id, recorded_at);
CREATE INDEX idx_power_outage_logs_outage ON public.power_outage_logs(power_outage_id);
CREATE INDEX idx_mode_profiles_user_active ON public.mode_profiles(user_id, is_active);

-- Trigger for mode_profiles updated_at
CREATE TRIGGER update_mode_profiles_updated_at
  BEFORE UPDATE ON public.mode_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();