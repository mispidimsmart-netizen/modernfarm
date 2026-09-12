CREATE OR REPLACE FUNCTION public.create_organization_trial(
  _name text,
  _name_en text,
  _slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _u uuid := auth.uid();
  _new_id uuid;
  _existing_count int;
  _clean_slug text;
  _trial_days int := 14;
BEGIN
  IF _u IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate inputs
  IF _name IS NULL OR length(trim(_name)) < 2 THEN
    RAISE EXCEPTION 'কোম্পানির নাম কমপক্ষে ২ অক্ষরের হতে হবে';
  END IF;
  IF _name_en IS NULL OR length(trim(_name_en)) < 2 THEN
    RAISE EXCEPTION 'English name must be at least 2 characters';
  END IF;
  IF length(trim(_name)) > 100 OR length(trim(_name_en)) > 100 THEN
    RAISE EXCEPTION 'Name too long (max 100 chars)';
  END IF;

  _clean_slug := lower(regexp_replace(trim(_slug), '[^a-z0-9-]', '-', 'g'));
  IF length(_clean_slug) < 3 OR length(_clean_slug) > 50 THEN
    RAISE EXCEPTION 'Slug must be 3-50 characters (a-z, 0-9, -)';
  END IF;

  -- Limit: each user can self-create only one organization
  SELECT count(*) INTO _existing_count
  FROM public.organizations
  WHERE owner_user_id = _u;

  IF _existing_count >= 1 THEN
    RAISE EXCEPTION 'আপনি ইতিমধ্যে একটি কোম্পানির মালিক। নতুন কোম্পানি তৈরি করতে super admin-এর সাথে যোগাযোগ করুন।';
  END IF;

  -- Slug uniqueness
  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = _clean_slug) THEN
    RAISE EXCEPTION 'এই slug ব্যবহার করা হচ্ছে, অন্যটি বেছে নিন';
  END IF;

  INSERT INTO public.organizations (
    name, name_en, slug, owner_user_id,
    license_type, license_expires_at,
    max_farms, max_users
  ) VALUES (
    trim(_name), trim(_name_en), _clean_slug, _u,
    'trial', now() + (_trial_days || ' days')::interval,
    1, 3
  )
  RETURNING id INTO _new_id;

  -- Add owner as member
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_new_id, _u, 'org_owner');

  PERFORM public.log_security_event(
    'org_self_signup', _u, NULL, NULL, true,
    jsonb_build_object('org_id', _new_id, 'slug', _clean_slug, 'trial_days', _trial_days)
  );

  RETURN jsonb_build_object(
    'success', true,
    'org_id', _new_id,
    'slug', _clean_slug,
    'trial_expires_at', (now() + (_trial_days || ' days')::interval)
  );
END;
$$;