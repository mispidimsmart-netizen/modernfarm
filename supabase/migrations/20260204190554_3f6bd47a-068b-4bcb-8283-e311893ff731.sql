-- Allow super admins to manage all super_admins records
CREATE POLICY "Super admins can view all admins"
ON public.super_admins
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert new admins"
ON public.super_admins
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete other admins"
ON public.super_admins
FOR DELETE
USING (is_super_admin(auth.uid()));