-- Add custom_interval_days column to schedules table for custom cleaning intervals
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS custom_interval_days integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.schedules.custom_interval_days IS 'Custom interval in days for cleaning schedules (e.g., every 2, 3, 4, 5, 6 days)';