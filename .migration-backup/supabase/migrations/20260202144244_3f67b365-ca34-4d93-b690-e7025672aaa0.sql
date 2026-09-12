-- =====================================================
-- BIG FARM DATA MODEL LOCK - Required Fields for Scale
-- =====================================================

-- 1. Create farms table for multi-farm support
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'আমার ফার্ম',
  name_en TEXT NOT NULL DEFAULT 'My Farm',
  location TEXT,
  total_sheds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on farms
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- RLS policy for farms
CREATE POLICY "Users can manage their own farms"
  ON public.farms
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 2. Create device_mode enum type
DO $$ BEGIN
  CREATE TYPE public.device_mode AS ENUM ('AUTO', 'MANUAL', 'FAIL_SAFE', 'OFFLINE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Add farm_id to sheds table (links sheds to farms)
ALTER TABLE public.sheds 
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL;

-- 4. Add missing fields to sensor_logs for HSI tracking
ALTER TABLE public.sensor_logs
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hsi NUMERIC GENERATED ALWAYS AS (temperature + (humidity * 0.1)) STORED;

-- 5. Add missing fields to sensor_readings
ALTER TABLE public.sensor_readings
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS hsi NUMERIC GENERATED ALWAYS AS (temperature + (humidity * 0.1)) STORED;

-- 6. Add mode and farm_id to device_status
ALTER TABLE public.device_status
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'AUTO' CHECK (mode IN ('AUTO', 'MANUAL', 'FAIL_SAFE', 'OFFLINE')),
  ADD COLUMN IF NOT EXISTS hsi NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_cloud_sync TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 7. Add farm_id to device_health
ALTER TABLE public.device_health
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'AUTO' CHECK (mode IN ('AUTO', 'MANUAL', 'FAIL_SAFE', 'OFFLINE')),
  ADD COLUMN IF NOT EXISTS hsi NUMERIC DEFAULT 0;

-- 8. Create index for faster farm-based queries
CREATE INDEX IF NOT EXISTS idx_sheds_farm_id ON public.sheds(farm_id);
CREATE INDEX IF NOT EXISTS idx_sensor_logs_farm_id ON public.sensor_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farm_id ON public.sensor_readings(farm_id);
CREATE INDEX IF NOT EXISTS idx_device_status_farm_id ON public.device_status(farm_id);
CREATE INDEX IF NOT EXISTS idx_device_health_farm_id ON public.device_health(farm_id);
CREATE INDEX IF NOT EXISTS idx_sensor_logs_hsi ON public.sensor_logs(hsi);

-- 9. Add updated_at trigger for farms table
CREATE TRIGGER update_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();