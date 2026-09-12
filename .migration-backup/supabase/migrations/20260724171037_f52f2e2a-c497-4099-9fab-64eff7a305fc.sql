DROP POLICY IF EXISTS "Restrict device_commands writes to farmer+" ON public.device_commands;
DROP POLICY IF EXISTS "Restrict device_commands updates to farmer+" ON public.device_commands;
DROP POLICY IF EXISTS "Restrict device_commands deletes to farmer+" ON public.device_commands;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_commands TO authenticated;
GRANT ALL ON public.device_commands TO service_role;

-- Keep command writes scoped to the selected farm and current permission model.
DROP POLICY IF EXISTS "device_commands insert requires daily-log perm" ON public.device_commands;
CREATE POLICY "device_commands insert requires farm permission"
ON public.device_commands
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  farm_id IS NOT NULL
  AND can_log_daily_data(auth.uid(), farm_id)
);

DROP POLICY IF EXISTS "device_commands update requires daily-log perm" ON public.device_commands;
CREATE POLICY "device_commands update requires farm permission"
ON public.device_commands
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  farm_id IS NOT NULL
  AND can_log_daily_data(auth.uid(), farm_id)
)
WITH CHECK (
  farm_id IS NOT NULL
  AND can_log_daily_data(auth.uid(), farm_id)
);

DROP POLICY IF EXISTS "device_commands delete requires daily-log perm" ON public.device_commands;
CREATE POLICY "device_commands delete requires farm permission"
ON public.device_commands
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  farm_id IS NOT NULL
  AND can_log_daily_data(auth.uid(), farm_id)
);