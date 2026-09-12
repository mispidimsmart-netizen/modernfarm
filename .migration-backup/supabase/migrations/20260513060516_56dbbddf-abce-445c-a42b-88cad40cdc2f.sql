DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canonical_role') THEN
    CREATE TYPE public.canonical_role AS ENUM ('super_admin','company_org','farm','worker');
  END IF;
END
$mig$;

CREATE OR REPLACE FUNCTION public.canonical_role_label_bn(_role public.canonical_role)
RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE _role
    WHEN 'super_admin' THEN 'সুপার এডমিন'
    WHEN 'company_org' THEN 'কোম্পানি/অর্গানাইজেশন'
    WHEN 'farm'        THEN 'ফার্ম'
    WHEN 'worker'      THEN 'ওয়ার্কার'
  END;
$f$;

CREATE OR REPLACE FUNCTION public.get_canonical_role(_user_id uuid, _farm_id uuid DEFAULT NULL)
RETURNS public.canonical_role
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $f$
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;

  IF EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id) THEN
    RETURN 'super_admin'::public.canonical_role;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = _user_id
      AND om.role IN ('org_owner','org_admin')
      AND (_farm_id IS NULL OR om.organization_id = (
        SELECT organization_id FROM public.farms WHERE id = _farm_id
      ))
  ) THEN
    RETURN 'company_org'::public.canonical_role;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.farms f
    WHERE f.owner_id = _user_id
      AND (_farm_id IS NULL OR f.id = _farm_id)
  ) THEN
    RETURN 'farm'::public.canonical_role;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'worker'
      AND (_farm_id IS NULL OR ur.farm_owner_id = (
        SELECT owner_id FROM public.farms WHERE id = _farm_id
      ))
  ) THEN
    RETURN 'worker'::public.canonical_role;
  END IF;

  RETURN NULL;
END
$f$;

CREATE OR REPLACE VIEW public.v_user_canonical_roles
WITH (security_invoker=on) AS
SELECT
  p.id AS user_id,
  p.user_name,
  p.phone,
  public.get_canonical_role(p.id, NULL) AS role,
  public.canonical_role_label_bn(public.get_canonical_role(p.id, NULL)) AS role_label_bn
FROM public.profiles p;

GRANT EXECUTE ON FUNCTION public.canonical_role_label_bn(public.canonical_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_canonical_role(uuid, uuid)                 TO authenticated;
GRANT SELECT  ON public.v_user_canonical_roles                                  TO authenticated;