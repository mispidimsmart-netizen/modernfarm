-- Add farm_id to schedules and schedule_notifications for multi-farm scoping
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;

ALTER TABLE public.schedule_notifications
  ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;

-- Backfill: try shed -> farm first, then user's first farm
UPDATE public.schedules s
SET farm_id = sh.farm_id
FROM public.sheds sh
WHERE s.farm_id IS NULL AND s.shed_id = sh.id;

UPDATE public.schedules s
SET farm_id = (
  SELECT id FROM public.farms
  WHERE owner_id = s.user_id AND deleted_at IS NULL
  ORDER BY created_at ASC LIMIT 1
)
WHERE farm_id IS NULL;

UPDATE public.schedule_notifications sn
SET farm_id = s.farm_id
FROM public.schedules s
WHERE sn.farm_id IS NULL AND sn.schedule_id = s.id;

UPDATE public.schedule_notifications sn
SET farm_id = (
  SELECT id FROM public.farms
  WHERE owner_id = sn.user_id AND deleted_at IS NULL
  ORDER BY created_at ASC LIMIT 1
)
WHERE farm_id IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_farm_id ON public.schedules(farm_id);
CREATE INDEX IF NOT EXISTS idx_schedule_notifications_farm_id ON public.schedule_notifications(farm_id);

-- Update RLS policies to use farm_id with legacy fallback
DROP POLICY IF EXISTS "Users can manage their own schedules" ON public.schedules;

CREATE POLICY "View schedules: farm members or legacy owner"
ON public.schedules FOR SELECT
USING (
  (farm_id IS NOT NULL AND (
    public.can_manage_farm(auth.uid(), farm_id)
    OR public.can_log_daily_data(auth.uid(), farm_id)
  ))
  OR (farm_id IS NULL AND auth.uid() = user_id)
);

CREATE POLICY "Insert schedules: farm managers"
ON public.schedules FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    farm_id IS NULL OR public.can_manage_farm(auth.uid(), farm_id)
  )
);

CREATE POLICY "Update schedules: farm managers"
ON public.schedules FOR UPDATE
USING (
  (farm_id IS NOT NULL AND public.can_manage_farm(auth.uid(), farm_id))
  OR (farm_id IS NULL AND auth.uid() = user_id)
);

CREATE POLICY "Delete schedules: farm managers"
ON public.schedules FOR DELETE
USING (
  (farm_id IS NOT NULL AND public.can_manage_farm(auth.uid(), farm_id))
  OR (farm_id IS NULL AND auth.uid() = user_id)
);

DROP POLICY IF EXISTS "Users can manage their own schedule notifications" ON public.schedule_notifications;

CREATE POLICY "View schedule notifications: farm members"
ON public.schedule_notifications FOR SELECT
USING (
  (farm_id IS NOT NULL AND (
    public.can_manage_farm(auth.uid(), farm_id)
    OR public.can_log_daily_data(auth.uid(), farm_id)
  ))
  OR (farm_id IS NULL AND auth.uid() = user_id)
);

CREATE POLICY "Insert schedule notifications: self"
ON public.schedule_notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update schedule notifications: self or managers"
ON public.schedule_notifications FOR UPDATE
USING (
  auth.uid() = user_id
  OR (farm_id IS NOT NULL AND public.can_manage_farm(auth.uid(), farm_id))
);

CREATE POLICY "Delete schedule notifications: self or managers"
ON public.schedule_notifications FOR DELETE
USING (
  auth.uid() = user_id
  OR (farm_id IS NOT NULL AND public.can_manage_farm(auth.uid(), farm_id))
);

-- Ensure REPLICA IDENTITY FULL for realtime payloads
ALTER TABLE public.schedules REPLICA IDENTITY FULL;
ALTER TABLE public.schedule_notifications REPLICA IDENTITY FULL;