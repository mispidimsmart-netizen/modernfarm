-- 1) Add soft-delete column
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_farms_deleted_at ON public.farms(deleted_at) WHERE deleted_at IS NOT NULL;

-- 2) Soft delete RPC
CREATE OR REPLACE FUNCTION public.super_admin_soft_delete_farm(_farm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  UPDATE public.farms
    SET deleted_at = now(), is_active = false
    WHERE id = _farm_id AND deleted_at IS NULL;
END $$;

-- 3) Restore RPC
CREATE OR REPLACE FUNCTION public.super_admin_restore_farm(_farm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  UPDATE public.farms
    SET deleted_at = NULL, is_active = true
    WHERE id = _farm_id AND deleted_at IS NOT NULL;
END $$;

-- 4) List soft-deleted farms (admin only)
CREATE OR REPLACE FUNCTION public.super_admin_list_deleted_farms()
RETURNS TABLE(
  id uuid, name text, name_en text, location text,
  owner_id uuid, organization_id uuid, deleted_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  RETURN QUERY
    SELECT f.id, f.name, f.name_en, f.location,
           f.owner_id, f.organization_id, f.deleted_at, f.created_at
      FROM public.farms f
      WHERE f.deleted_at IS NOT NULL
      ORDER BY f.deleted_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.super_admin_soft_delete_farm(uuid) FROM public;
REVOKE ALL ON FUNCTION public.super_admin_restore_farm(uuid) FROM public;
REVOKE ALL ON FUNCTION public.super_admin_list_deleted_farms() FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_soft_delete_farm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_restore_farm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_deleted_farms() TO authenticated;