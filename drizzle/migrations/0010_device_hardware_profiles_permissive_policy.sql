-- device_hardware_profiles only had a RESTRICTIVE policy, which narrows access
-- but never grants it, so every read/write was denied. Add the matching
-- PERMISSIVE policy scoped to farms the user can access.
CREATE POLICY "Farm members manage hardware profiles"
  ON public.device_hardware_profiles
  FOR ALL
  TO authenticated
  USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_hardware_profiles TO authenticated;
GRANT ALL ON public.device_hardware_profiles TO service_role;
