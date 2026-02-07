-- Add heater_on column to device_status table
ALTER TABLE public.device_status 
ADD COLUMN IF NOT EXISTS heater_on boolean DEFAULT false;