-- Drop the problematic policy
DROP POLICY IF EXISTS "Super admins can view super admin list" ON public.super_admins;

-- Create a new policy that allows users to check if they are in the table
-- This avoids recursion by using a direct comparison
CREATE POLICY "Users can view their own super admin status"
  ON public.super_admins
  FOR SELECT
  USING (auth.uid() = user_id);