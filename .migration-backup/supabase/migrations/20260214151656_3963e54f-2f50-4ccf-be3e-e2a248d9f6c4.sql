-- Add hardware validation fields to farm_setup_status
ALTER TABLE public.farm_setup_status 
ADD COLUMN IF NOT EXISTS hardware_validation_passed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS hardware_validation_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hardware_validation_results jsonb DEFAULT '{}'::jsonb;
