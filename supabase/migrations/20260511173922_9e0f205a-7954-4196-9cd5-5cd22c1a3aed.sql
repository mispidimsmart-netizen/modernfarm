
CREATE TABLE IF NOT EXISTS public.org_activity_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('insert','update','delete')),
  entity_type text NOT NULL CHECK (entity_type IN ('organization','member')),
  entity_id uuid,
  actor_user_id uuid,
  before jsonb,
  after jsonb,
  changed_fields text[],
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_activity_audit_org_time
  ON public.org_activity_audit(organization_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_activity_audit_entity
  ON public.org_activity_audit(entity_type, action_type);

ALTER TABLE public.org_activity_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_activity_audit_select" ON public.org_activity_audit;
CREATE POLICY "org_activity_audit_select"
ON public.org_activity_audit FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR is_org_admin(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.tg_audit_organizations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_changed text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN v_changed := array_append(v_changed,'name'); END IF;
    IF NEW.license_type IS DISTINCT FROM OLD.license_type THEN v_changed := array_append(v_changed,'license_type'); END IF;
    IF NEW.license_expires_at IS DISTINCT FROM OLD.license_expires_at THEN v_changed := array_append(v_changed,'license_expires_at'); END IF;
    IF NEW.max_farms IS DISTINCT FROM OLD.max_farms THEN v_changed := array_append(v_changed,'max_farms'); END IF;
    IF NEW.max_users IS DISTINCT FROM OLD.max_users THEN v_changed := array_append(v_changed,'max_users'); END IF;
    IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN v_changed := array_append(v_changed,'owner_user_id'); END IF;
    IF array_length(v_changed,1) IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.org_activity_audit
      (organization_id, action_type, entity_type, entity_id, actor_user_id, before, after, changed_fields)
    VALUES (NEW.id, 'update', 'organization', NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW), v_changed);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.org_activity_audit
      (organization_id, action_type, entity_type, entity_id, actor_user_id, after)
    VALUES (NEW.id, 'insert', 'organization', NEW.id, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.org_activity_audit
      (organization_id, action_type, entity_type, entity_id, actor_user_id, before)
    VALUES (OLD.id, 'delete', 'organization', OLD.id, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_audit_organizations ON public.organizations;
CREATE TRIGGER trg_audit_organizations
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_organizations();

CREATE OR REPLACE FUNCTION public.tg_audit_org_members()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_changed text[] := ARRAY[]::text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.org_activity_audit
      (organization_id, action_type, entity_type, entity_id, actor_user_id, after)
    VALUES (NEW.organization_id, 'insert', 'member', NEW.id, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN v_changed := array_append(v_changed,'role'); END IF;
    IF array_length(v_changed,1) IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.org_activity_audit
      (organization_id, action_type, entity_type, entity_id, actor_user_id, before, after, changed_fields)
    VALUES (NEW.organization_id, 'update', 'member', NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW), v_changed);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.org_activity_audit
      (organization_id, action_type, entity_type, entity_id, actor_user_id, before)
    VALUES (OLD.organization_id, 'delete', 'member', OLD.id, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_audit_org_members ON public.organization_members;
CREATE TRIGGER trg_audit_org_members
AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_org_members();

CREATE OR REPLACE FUNCTION public.get_org_activity_audit(
  _org_id uuid,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _entity_type text DEFAULT NULL,
  _action_type text DEFAULT NULL,
  _actor uuid DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit int DEFAULT 200,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  changed_at timestamptz,
  action_type text,
  entity_type text,
  entity_id uuid,
  actor_user_id uuid,
  actor_name text,
  actor_email text,
  changed_fields text[],
  before jsonb,
  after jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.id, a.changed_at, a.action_type, a.entity_type, a.entity_id, a.actor_user_id,
    p.user_name AS actor_name,
    p.email     AS actor_email,
    a.changed_fields, a.before, a.after
  FROM public.org_activity_audit a
  LEFT JOIN public.profiles p ON p.id = a.actor_user_id
  WHERE a.organization_id = _org_id
    AND (is_super_admin(auth.uid()) OR is_org_admin(auth.uid(), _org_id))
    AND (_from IS NULL OR a.changed_at >= _from)
    AND (_to   IS NULL OR a.changed_at <= _to)
    AND (_entity_type IS NULL OR a.entity_type = _entity_type)
    AND (_action_type IS NULL OR a.action_type = _action_type)
    AND (_actor IS NULL OR a.actor_user_id = _actor)
    AND (
      _search IS NULL OR _search = '' OR
      p.user_name ILIKE '%'||_search||'%' OR
      p.email ILIKE '%'||_search||'%' OR
      a.changed_fields::text ILIKE '%'||_search||'%' OR
      a.after::text ILIKE '%'||_search||'%' OR
      a.before::text ILIKE '%'||_search||'%'
    )
  ORDER BY a.changed_at DESC
  LIMIT GREATEST(_limit, 1)
  OFFSET GREATEST(_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_org_activity_audit(uuid, timestamptz, timestamptz, text, text, uuid, text, int, int) TO authenticated;
