-- Prevent duplicate calibration rows per farm at DB level
ALTER TABLE public.device_calibration
ADD CONSTRAINT device_calibration_farm_id_unique UNIQUE (farm_id);