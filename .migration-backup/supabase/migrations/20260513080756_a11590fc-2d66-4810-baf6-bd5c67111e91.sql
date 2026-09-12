-- 1) Cleanup existing super_admin entries in farm_members
DELETE FROM public.farm_members fm
USING public.user_roles ur
WHERE ur.user_id = fm.user_id AND ur.role = 'super_admin';

-- 2) Trigger: block inserts/updates that put a super_admin into farm_members
CREATE OR REPLACE FUNCTION public.block_super_admin_farm_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'super_admin users cannot be farm_members (user_id=%)', NEW.user_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_super_admin_farm_member ON public.farm_members;
CREATE TRIGGER trg_block_super_admin_farm_member
  BEFORE INSERT OR UPDATE ON public.farm_members
  FOR EACH ROW EXECUTE FUNCTION public.block_super_admin_farm_member();

-- 3) Trigger: when a user becomes super_admin, clean up their farm_members
CREATE OR REPLACE FUNCTION public.cleanup_farm_members_on_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' THEN
    DELETE FROM public.farm_members WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_farm_members_on_super_admin ON public.user_roles;
CREATE TRIGGER trg_cleanup_farm_members_on_super_admin
  AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_farm_members_on_super_admin();