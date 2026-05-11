
-- ============ Backfill ============

-- 1) Create one "personal" organization per farm owner that has none.
WITH owners AS (
  SELECT DISTINCT f.owner_id AS user_id
  FROM public.farms f
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_members om WHERE om.user_id = f.owner_id
  )
),
new_orgs AS (
  INSERT INTO public.organizations (name, name_en, slug, owner_user_id, license_type, max_farms, max_users, notes)
  SELECT
    COALESCE(p.farm_name, 'Personal Workspace'),
    COALESCE(p.farm_name, 'Personal Workspace'),
    'personal-' || substr(replace(o.user_id::text, '-', ''), 1, 12),
    o.user_id,
    'lifetime',
    10,
    20,
    'Auto-created during Phase 3 backfill'
  FROM owners o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  RETURNING id, owner_user_id
)
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT id, owner_user_id, 'org_owner' FROM new_orgs
ON CONFLICT DO NOTHING;

-- 2) Link every farm with NULL organization_id to its owner's first organization
UPDATE public.farms f
SET organization_id = sub.org_id
FROM (
  SELECT om.user_id, MIN(om.created_at) AS first_at,
         (SELECT om2.organization_id
          FROM public.organization_members om2
          WHERE om2.user_id = om.user_id
          ORDER BY om2.created_at ASC
          LIMIT 1) AS org_id
  FROM public.organization_members om
  GROUP BY om.user_id
) sub
WHERE f.organization_id IS NULL
  AND f.owner_id = sub.user_id;

-- ============ Helper functions ============

CREATE OR REPLACE FUNCTION public.get_farm_organization_id(_farm_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.farms WHERE id = _farm_id
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_farm_v2(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(_farm_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.farm_members WHERE user_id = _user_id AND farm_id = _farm_id)
    OR public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.farms f
      JOIN public.organization_members om
        ON om.organization_id = f.organization_id
       AND om.user_id = _user_id
       AND om.role IN ('org_owner', 'org_admin')
      WHERE f.id = _farm_id
        AND f.organization_id IS NOT NULL
    )
  ), false)
$$;

-- Replace the existing user_can_access_farm to delegate to v2.
-- Every existing RLS policy that calls user_can_access_farm now also honors
-- organization-level access without any policy changes.
CREATE OR REPLACE FUNCTION public.user_can_access_farm(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.user_can_access_farm_v2(_user_id, _farm_id)
$$;

-- ============ Auto-inherit organization for new farms ============

CREATE OR REPLACE FUNCTION public.auto_assign_farm_organization()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_count int;
  _org_id uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*), MIN(organization_id)
    INTO _org_count, _org_id
  FROM public.organization_members
  WHERE user_id = NEW.owner_id;

  IF _org_count = 1 THEN
    NEW.organization_id := _org_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_assign_farm_organization ON public.farms;
CREATE TRIGGER trg_auto_assign_farm_organization
BEFORE INSERT ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_farm_organization();
