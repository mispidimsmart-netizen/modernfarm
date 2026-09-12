
-- Enum for org membership roles
DO $$ BEGIN
  CREATE TYPE public.org_role AS ENUM ('org_owner', 'org_admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- License type enum
DO $$ BEGIN
  CREATE TYPE public.org_license_type AS ENUM ('trial', 'lifetime', 'subscription', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL,
  license_type public.org_license_type NOT NULL DEFAULT 'trial',
  license_expires_at TIMESTAMPTZ,
  max_farms INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- Add organization_id to farms (nullable, backward-compat)
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_farms_organization ON public.farms(organization_id);

-- Helper functions (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('org_owner', 'org_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id;
$$;

-- updated_at trigger reuse
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "org_select_members_or_super"
ON public.organizations FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_org_member(auth.uid(), id)
);

CREATE POLICY "org_insert_super_admin_only"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "org_update_admin_or_super"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_org_admin(auth.uid(), id)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.is_org_admin(auth.uid(), id)
);

CREATE POLICY "org_delete_super_admin_only"
ON public.organizations FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Organization members policies
CREATE POLICY "org_members_select_same_org_or_super"
ON public.organization_members FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "org_members_insert_admin_or_super"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.is_org_admin(auth.uid(), organization_id)
);

CREATE POLICY "org_members_update_admin_or_super"
ON public.organization_members FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_org_admin(auth.uid(), organization_id)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.is_org_admin(auth.uid(), organization_id)
);

CREATE POLICY "org_members_delete_admin_or_super"
ON public.organization_members FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_org_admin(auth.uid(), organization_id)
);
