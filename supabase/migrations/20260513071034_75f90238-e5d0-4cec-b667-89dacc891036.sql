-- ============================================================
-- 1) Trigger: farm_members → user_roles auto-sync
-- Keeps legacy user_roles (worker registry) in lock-step with
-- farm_members. Fires inside the same transaction as the write.
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_sync_user_roles_from_farm_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_old_owner uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT owner_id INTO v_old_owner FROM public.farms WHERE id = OLD.farm_id;
    IF v_old_owner IS NOT NULL THEN
      DELETE FROM public.user_roles
        WHERE user_id = OLD.user_id AND farm_owner_id = v_old_owner;
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE
  SELECT owner_id INTO v_owner FROM public.farms WHERE id = NEW.farm_id;
  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'worker' THEN
    INSERT INTO public.user_roles(user_id, farm_owner_id, role)
      VALUES (NEW.user_id, v_owner, 'worker'::app_role)
    ON CONFLICT (user_id, farm_owner_id) DO UPDATE
      SET role = 'worker'::app_role;
  ELSE
    -- role changed away from worker — remove legacy entry
    DELETE FROM public.user_roles
      WHERE user_id = NEW.user_id AND farm_owner_id = v_owner;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_farm_members_sync_user_roles ON public.farm_members;
CREATE TRIGGER trg_farm_members_sync_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.farm_members
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_user_roles_from_farm_members();

-- ============================================================
-- 2) Trigger: farms.owner_id change → migrate user_roles rows
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_sync_user_roles_on_farm_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    -- For every worker on this farm, move legacy entry to new owner
    INSERT INTO public.user_roles(user_id, farm_owner_id, role)
    SELECT fm.user_id, NEW.owner_id, 'worker'::app_role
      FROM public.farm_members fm
      WHERE fm.farm_id = NEW.id AND fm.role = 'worker'
    ON CONFLICT (user_id, farm_owner_id) DO UPDATE
      SET role = 'worker'::app_role;

    -- Remove legacy entries from old owner for those workers
    DELETE FROM public.user_roles ur
      USING public.farm_members fm
      WHERE fm.farm_id = NEW.id
        AND fm.role = 'worker'
        AND ur.user_id = fm.user_id
        AND ur.farm_owner_id = OLD.owner_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_farms_owner_sync_user_roles ON public.farms;
CREATE TRIGGER trg_farms_owner_sync_user_roles
AFTER UPDATE OF owner_id ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_user_roles_on_farm_owner_change();

-- ============================================================
-- 3) One-shot backfill: ensure legacy user_roles matches reality
-- ============================================================
INSERT INTO public.user_roles(user_id, farm_owner_id, role)
SELECT DISTINCT fm.user_id, f.owner_id, 'worker'::app_role
  FROM public.farm_members fm
  JOIN public.farms f ON f.id = fm.farm_id
  WHERE fm.role = 'worker' AND f.owner_id IS NOT NULL
ON CONFLICT (user_id, farm_owner_id) DO NOTHING;

-- ============================================================
-- 4) Admin repair RPC — manually reconcile a single user
-- ============================================================
CREATE OR REPLACE FUNCTION public.super_admin_repair_user_roles(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int := 0;
  v_deleted int := 0;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;

  -- Add missing entries for current worker memberships
  WITH ins AS (
    INSERT INTO public.user_roles(user_id, farm_owner_id, role)
    SELECT fm.user_id, f.owner_id, 'worker'::app_role
      FROM public.farm_members fm
      JOIN public.farms f ON f.id = fm.farm_id
      WHERE fm.user_id = _user_id
        AND fm.role = 'worker'
        AND f.owner_id IS NOT NULL
    ON CONFLICT (user_id, farm_owner_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_inserted FROM ins;

  -- Remove stale legacy entries (worker rows for owners they no longer work for)
  WITH del AS (
    DELETE FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'worker'::app_role
        AND NOT EXISTS (
          SELECT 1 FROM public.farm_members fm
          JOIN public.farms f ON f.id = fm.farm_id
          WHERE fm.user_id = _user_id
            AND fm.role = 'worker'
            AND f.owner_id = ur.farm_owner_id
        )
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  RETURN jsonb_build_object('inserted', v_inserted, 'deleted', v_deleted);
END $$;

REVOKE ALL ON FUNCTION public.super_admin_repair_user_roles(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_repair_user_roles(uuid) TO authenticated;