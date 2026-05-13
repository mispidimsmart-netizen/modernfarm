CREATE OR REPLACE FUNCTION public.is_org_slug_available(_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE slug = lower(regexp_replace(trim(_slug), '[^a-z0-9-]', '-', 'g'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_slug_available(text) TO authenticated;