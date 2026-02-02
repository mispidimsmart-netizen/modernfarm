-- Phase 2: Multi-Shed Support, Device Health Monitoring

-- 1. Create sheds table for multi-shed support
CREATE TABLE public.sheds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'শেড ১',
  name_en TEXT NOT NULL DEFAULT 'Shed 1',
  description TEXT,
  bird_capacity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create device_health table for monitoring ESP32 health
CREATE TABLE public.device_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_token_id UUID NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL,
  wifi_signal_strength INTEGER, -- RSSI value in dBm
  uptime_seconds BIGINT DEFAULT 0,
  free_memory_bytes INTEGER,
  cpu_temperature NUMERIC(5,2),
  power_source TEXT DEFAULT 'mains', -- 'mains', 'battery', 'solar'
  battery_percentage INTEGER,
  firmware_version TEXT,
  last_restart_at TIMESTAMP WITH TIME ZONE,
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add shed_id to device_tokens to link devices to sheds
ALTER TABLE public.device_tokens 
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 4. Add shed_id to sensor_readings for shed-specific data
ALTER TABLE public.sensor_readings 
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 5. Add shed_id to sensor_logs for shed-specific logs
ALTER TABLE public.sensor_logs 
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 6. Add shed_id to device_status for shed-specific control
ALTER TABLE public.device_status 
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 7. Add shed_id to alerts for shed-specific alerts
ALTER TABLE public.alerts 
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 8. Add shed_id to egg_production
ALTER TABLE public.egg_production
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 9. Add shed_id to mortality_records
ALTER TABLE public.mortality_records
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 10. Add shed_id to flock_info
ALTER TABLE public.flock_info
ADD COLUMN shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL;

-- 11. Create offline_sync_queue for offline mode support
CREATE TABLE public.offline_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  record_data JSONB NOT NULL,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on new tables
ALTER TABLE public.sheds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sheds
CREATE POLICY "Users can manage their own sheds" 
ON public.sheds 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for device_health
CREATE POLICY "Users can view their own device health" 
ON public.device_health 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device health" 
ON public.device_health 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device health" 
ON public.device_health 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for offline_sync_queue
CREATE POLICY "Users can manage their own sync queue" 
ON public.offline_sync_queue 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_sheds_user_id ON public.sheds(user_id);
CREATE INDEX idx_device_health_user_id ON public.device_health(user_id);
CREATE INDEX idx_device_health_device_token_id ON public.device_health(device_token_id);
CREATE INDEX idx_device_health_shed_id ON public.device_health(shed_id);
CREATE INDEX idx_device_health_last_seen ON public.device_health(last_seen_at);
CREATE INDEX idx_offline_sync_queue_user_id ON public.offline_sync_queue(user_id);
CREATE INDEX idx_offline_sync_queue_synced ON public.offline_sync_queue(synced);
CREATE INDEX idx_sensor_readings_shed_id ON public.sensor_readings(shed_id);
CREATE INDEX idx_device_tokens_shed_id ON public.device_tokens(shed_id);

-- Trigger to update updated_at
CREATE TRIGGER update_sheds_updated_at
BEFORE UPDATE ON public.sheds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_device_health_updated_at
BEFORE UPDATE ON public.device_health
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user to create a default shed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  default_shed_id UUID;
BEGIN
  INSERT INTO public.profiles (id, phone, farm_name)
  VALUES (NEW.id, NEW.phone, 'আমার লেয়ার ফার্ম');
  
  INSERT INTO public.farm_settings (user_id)
  VALUES (NEW.id);
  
  -- Create default shed and get its ID
  INSERT INTO public.sheds (user_id, name, name_en, bird_capacity)
  VALUES (NEW.id, 'শেড ১', 'Shed 1', 1000)
  RETURNING id INTO default_shed_id;
  
  INSERT INTO public.device_status (user_id, shed_id)
  VALUES (NEW.id, default_shed_id);
  
  INSERT INTO public.lighting_schedule (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.flock_info (user_id, shed_id)
  VALUES (NEW.id, default_shed_id);
  
  RETURN NEW;
END;
$function$;

-- Enable realtime for device_health
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_health;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheds;