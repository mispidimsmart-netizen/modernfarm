-- Create SMS alert settings table
CREATE TABLE public.sms_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  -- Alert type filters
  temperature_alerts BOOLEAN NOT NULL DEFAULT true,
  humidity_alerts BOOLEAN NOT NULL DEFAULT true,
  ammonia_alerts BOOLEAN NOT NULL DEFAULT true,
  power_alerts BOOLEAN NOT NULL DEFAULT true,
  water_alerts BOOLEAN NOT NULL DEFAULT true,
  device_offline_alerts BOOLEAN NOT NULL DEFAULT true,
  -- Cooldown to prevent spam (minutes)
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  last_sms_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create SMS phone numbers table (multiple numbers per user)
CREATE TABLE public.sms_phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  label TEXT DEFAULT 'Primary',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SMS log table to track sent messages
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  sent_via TEXT NOT NULL DEFAULT 'gsm', -- 'gsm' or 'gateway'
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sms_alert_settings
CREATE POLICY "Users can manage their own SMS settings" 
ON public.sms_alert_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for sms_phone_numbers
CREATE POLICY "Users can manage their own phone numbers" 
ON public.sms_phone_numbers 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for sms_logs
CREATE POLICY "Users can view their own SMS logs" 
ON public.sms_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMS logs" 
ON public.sms_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_sms_alert_settings_updated_at
BEFORE UPDATE ON public.sms_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();