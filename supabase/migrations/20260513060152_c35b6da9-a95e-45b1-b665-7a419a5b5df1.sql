
CREATE OR REPLACE FUNCTION public.can_manage_org(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = _user_id AND organization_id = _org_id
        AND role IN ('org_owner','org_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_farm(_user_id uuid, _farm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.farms f WHERE f.id = _farm_id AND f.owner_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.farms f
      JOIN public.organization_members om ON om.organization_id = f.organization_id
      WHERE f.id = _farm_id AND om.user_id = _user_id
        AND om.role IN ('org_owner','org_admin')
    );
$$;

-- user_roles has (user_id, farm_owner_id, role) — no farm_id column.
-- A worker is recognized as worker for the farm if they're under the farm's owner.
CREATE OR REPLACE FUNCTION public.is_worker_on_farm(_user_id uuid, _farm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.farms f ON f.owner_id = ur.farm_owner_id
      WHERE ur.user_id = _user_id AND ur.role = 'worker' AND f.id = _farm_id
    )
    AND NOT public.can_manage_farm(_user_id, _farm_id);
$$;

CREATE OR REPLACE FUNCTION public.can_change_hardware(_user_id uuid, _farm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_manage_farm(_user_id, _farm_id);
$$;

CREATE OR REPLACE FUNCTION public.can_log_daily_data(_user_id uuid, _farm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_manage_farm(_user_id, _farm_id)
      OR public.is_worker_on_farm(_user_id, _farm_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_farm(uuid, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_worker_on_farm(uuid, uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_change_hardware(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_log_daily_data(uuid, uuid)  TO authenticated;
