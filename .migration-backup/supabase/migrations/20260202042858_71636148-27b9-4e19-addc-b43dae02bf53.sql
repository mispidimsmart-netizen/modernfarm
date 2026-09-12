-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  farm_name TEXT NOT NULL DEFAULT 'আমার ফার্ম',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create farm_settings table for threshold values
CREATE TABLE public.farm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temperature_min NUMERIC NOT NULL DEFAULT 18,
  temperature_max NUMERIC NOT NULL DEFAULT 32,
  humidity_min NUMERIC NOT NULL DEFAULT 40,
  humidity_max NUMERIC NOT NULL DEFAULT 80,
  ammonia_max NUMERIC NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.farm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.farm_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.farm_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.farm_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create sensor_readings table for IoT data
CREATE TABLE public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temperature NUMERIC NOT NULL,
  humidity NUMERIC NOT NULL,
  ammonia NUMERIC NOT NULL,
  water_usage NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sensor readings"
  ON public.sensor_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensor readings"
  ON public.sensor_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create device_status table
CREATE TABLE public.device_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  power_on BOOLEAN NOT NULL DEFAULT true,
  fan_on BOOLEAN NOT NULL DEFAULT false,
  light_on BOOLEAN NOT NULL DEFAULT false,
  alarm_on BOOLEAN NOT NULL DEFAULT false,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device status"
  ON public.device_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own device status"
  ON public.device_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device status"
  ON public.device_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create automation_rules table
CREATE TYPE public.sensor_type AS ENUM ('temperature', 'humidity', 'ammonia');
CREATE TYPE public.operator_type AS ENUM ('>', '<', '>=', '<=');
CREATE TYPE public.device_type AS ENUM ('fan', 'light', 'alarm');

CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition_sensor public.sensor_type NOT NULL,
  condition_operator public.operator_type NOT NULL,
  condition_value NUMERIC NOT NULL,
  action_device public.device_type NOT NULL,
  action_state BOOLEAN NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rules"
  ON public.automation_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create lighting_schedule table
CREATE TABLE public.lighting_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIME NOT NULL DEFAULT '05:00',
  end_time TIME NOT NULL DEFAULT '21:00',
  total_hours NUMERIC NOT NULL DEFAULT 16,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.lighting_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own schedule"
  ON public.lighting_schedule FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create alerts table
CREATE TYPE public.alert_type AS ENUM ('temperature', 'ammonia', 'power', 'water');
CREATE TYPE public.alert_severity AS ENUM ('warning', 'danger');

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type public.alert_type NOT NULL,
  severity public.alert_severity NOT NULL,
  message TEXT NOT NULL,
  message_bn TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alerts"
  ON public.alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create daily_reports table
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  avg_temperature NUMERIC,
  avg_humidity NUMERIC,
  total_water_usage NUMERIC,
  egg_production INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_date)
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reports"
  ON public.daily_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to auto-create profile and default settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, farm_name)
  VALUES (NEW.id, NEW.phone, 'আমার লেয়ার ফার্ম');
  
  INSERT INTO public.farm_settings (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.device_status (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.lighting_schedule (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create user data
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farm_settings_updated_at
  BEFORE UPDATE ON public.farm_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_device_status_updated_at
  BEFORE UPDATE ON public.device_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lighting_schedule_updated_at
  BEFORE UPDATE ON public.lighting_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;