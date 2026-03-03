
-- Add ceiling_fan and sprinkler columns to safety_timeline
ALTER TABLE public.safety_timeline
  ADD COLUMN IF NOT EXISTS requested_ceiling_fan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_sprinkler boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS actual_ceiling_fan boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS actual_sprinkler boolean NOT NULL DEFAULT false;
