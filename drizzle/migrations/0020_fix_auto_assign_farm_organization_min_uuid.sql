CREATE OR REPLACE FUNCTION public.auto_assign_farm_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_count int;
  _org_id uuid;
BEGIN
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _org_count
  FROM public.organization_members
  WHERE user_id = NEW.owner_id;

  IF _org_count = 1 THEN
    SELECT organization_id INTO _org_id
    FROM public.organization_members
    WHERE user_id = NEW.owner_id
    LIMIT 1;
    NEW.organization_id := _org_id;
  END IF;

  RETURN NEW;
END $function$;