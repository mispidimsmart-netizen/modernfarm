
-- Allow super_admin to SELECT all device_health rows (cross-tenant view for Admin Page)
CREATE POLICY "Super admins view all device_health"
ON public.device_health
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Allow super_admin to SELECT all device_restart_log rows (already partially covered, but ensure explicit)
-- Existing policy already includes is_super_admin via OR, so no change needed there.

-- Allow super_admin to SELECT all device_tokens (needed to show device names alongside health)
CREATE POLICY "Super admins view all device_tokens"
ON public.device_tokens
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Allow super_admin to SELECT all farms (needed to show farm names alongside health)
-- Existing "Members can view farms" + "Owners manage farms" do NOT cover super_admin SELECT.
CREATE POLICY "Super admins view all farms"
ON public.farms
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));
