CREATE OR REPLACE FUNCTION public.list_active_organizations_for_signup()
RETURNS TABLE(id uuid, name text, name_en text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, name_en, slug
  FROM organizations
  WHERE license_type IN ('trial','lifetime','subscription')
    AND COALESCE(slug,'') NOT ILIKE 'personal-%'
    AND COALESCE(slug,'') NOT ILIKE '/personal-%'
  ORDER BY name ASC;
$$;