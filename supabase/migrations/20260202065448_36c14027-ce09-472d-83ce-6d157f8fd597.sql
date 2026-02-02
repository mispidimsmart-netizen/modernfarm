-- Create schedules table for all types of scheduling
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shed_id UUID REFERENCES public.sheds(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('feed', 'cleaning', 'vaccination', 'custom')),
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT,
  recurrence TEXT NOT NULL DEFAULT 'daily' CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly')),
  time_of_day TIME NOT NULL,
  day_of_week INTEGER, -- 0-6 for weekly recurrence
  day_of_month INTEGER, -- 1-31 for monthly recurrence
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_before_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather settings table
CREATE TABLE public.weather_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  location_name TEXT,
  auto_fan_adjustment BOOLEAN NOT NULL DEFAULT true,
  rain_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  heat_wave_protection BOOLEAN NOT NULL DEFAULT true,
  heat_wave_threshold NUMERIC NOT NULL DEFAULT 35,
  last_weather_fetch TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather data cache table
CREATE TABLE public.weather_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  temperature NUMERIC,
  feels_like NUMERIC,
  humidity NUMERIC,
  wind_speed NUMERIC,
  weather_condition TEXT,
  weather_icon TEXT,
  rain_probability NUMERIC,
  forecast_json JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create schedule notifications table
CREATE TABLE public.schedule_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'due', 'overdue')),
  message TEXT NOT NULL,
  message_bn TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedules
CREATE POLICY "Users can manage their own schedules"
ON public.schedules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for weather_settings
CREATE POLICY "Users can manage their own weather settings"
ON public.weather_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for weather_cache
CREATE POLICY "Users can manage their own weather cache"
ON public.weather_cache FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for schedule_notifications
CREATE POLICY "Users can manage their own schedule notifications"
ON public.schedule_notifications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weather_settings_updated_at
BEFORE UPDATE ON public.weather_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for schedules and weather
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_notifications;