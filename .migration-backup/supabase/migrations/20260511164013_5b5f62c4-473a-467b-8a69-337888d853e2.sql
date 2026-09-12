
-- Phase 1: Lock phase_c_roadmap edits to super_admin only (platform-level data)
DROP POLICY IF EXISTS "roadmap_admin_insert" ON public.phase_c_roadmap;
DROP POLICY IF EXISTS "roadmap_admin_update" ON public.phase_c_roadmap;
DROP POLICY IF EXISTS "roadmap_admin_delete" ON public.phase_c_roadmap;

CREATE POLICY "roadmap_super_admin_insert" ON public.phase_c_roadmap
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "roadmap_super_admin_update" ON public.phase_c_roadmap
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "roadmap_super_admin_delete" ON public.phase_c_roadmap
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
