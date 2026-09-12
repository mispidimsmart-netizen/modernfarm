-- 1) Device runtime sessions
CREATE TABLE IF NOT EXISTS public.device_runtime_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL,
  shed_id uuid,
  user_id uuid,
  device_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  trigger_source text NOT NULL DEFAULT 'unknown',
  triggered_by uuid,
  mode text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drs_farm_started ON public.device_runtime_sessions (farm_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_drs_open ON public.device_runtime_sessions (farm_id, shed_id, device_name) WHERE ended_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.device_runtime_sessions TO authenticated;
GRANT ALL ON public.device_runtime_sessions TO service_role;

ALTER TABLE public.device_runtime_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm members read runtime sessions"
ON public.device_runtime_sessions FOR SELECT TO authenticated
USING (public.can_manage_farm(auth.uid(), farm_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "farm members write runtime sessions"
ON public.device_runtime_sessions FOR INSERT TO authenticated
WITH CHECK (public.can_manage_farm(auth.uid(), farm_id));

CREATE POLICY "farm members update runtime sessions"
ON public.device_runtime_sessions FOR UPDATE TO authenticated
USING (public.can_manage_farm(auth.uid(), farm_id))
WITH CHECK (public.can_manage_farm(auth.uid(), farm_id));

CREATE TRIGGER trg_drs_updated_at
BEFORE UPDATE ON public.device_runtime_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Batch public pages (QR targets)
CREATE TABLE IF NOT EXISTS public.batch_public_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  batch_kind text NOT NULL CHECK (batch_kind IN ('layer','broiler')),
  farm_id uuid,
  public_slug text NOT NULL UNIQUE,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, batch_kind)
);

GRANT SELECT, INSERT, UPDATE ON public.batch_public_pages TO authenticated;
GRANT ALL ON public.batch_public_pages TO service_role;

ALTER TABLE public.batch_public_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm members read batch pages"
ON public.batch_public_pages FOR SELECT TO authenticated
USING (public.can_manage_farm(auth.uid(), farm_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "farm managers insert batch pages"
ON public.batch_public_pages FOR INSERT TO authenticated
WITH CHECK (public.can_manage_farm(auth.uid(), farm_id));

CREATE POLICY "farm managers update batch pages"
ON public.batch_public_pages FOR UPDATE TO authenticated
USING (public.can_manage_farm(auth.uid(), farm_id))
WITH CHECK (public.can_manage_farm(auth.uid(), farm_id));

CREATE TRIGGER trg_bpp_updated_at
BEFORE UPDATE ON public.batch_public_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Slug generator + auto-create trigger
CREATE OR REPLACE FUNCTION public.generate_batch_public_slug()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  candidate text;
  i int := 0;
BEGIN
  LOOP
    candidate := substring(md5(random()::text || clock_timestamp()::text) from 1 for 12);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.batch_public_pages WHERE public_slug = candidate);
    i := i + 1;
    IF i > 10 THEN
      candidate := lower(replace(gen_random_uuid()::text, '-', ''));
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.autocreate_batch_public_page()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kind text;
BEGIN
  kind := CASE WHEN TG_TABLE_NAME = 'layer_batches' THEN 'layer' ELSE 'broiler' END;
  INSERT INTO public.batch_public_pages (batch_id, batch_kind, farm_id, public_slug, is_published)
  VALUES (NEW.id, kind, NEW.farm_id, public.generate_batch_public_slug(), false)
  ON CONFLICT (batch_id, batch_kind) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_layer_batch_public_page
AFTER INSERT ON public.layer_batches
FOR EACH ROW EXECUTE FUNCTION public.autocreate_batch_public_page();

CREATE TRIGGER trg_broiler_batch_public_page
AFTER INSERT ON public.broiler_batches
FOR EACH ROW EXECUTE FUNCTION public.autocreate_batch_public_page();

-- Backfill existing batches
INSERT INTO public.batch_public_pages (batch_id, batch_kind, farm_id, public_slug, is_published)
SELECT b.id, 'layer', b.farm_id, public.generate_batch_public_slug(), false
FROM public.layer_batches b
ON CONFLICT (batch_id, batch_kind) DO NOTHING;

INSERT INTO public.batch_public_pages (batch_id, batch_kind, farm_id, public_slug, is_published)
SELECT b.id, 'broiler', b.farm_id, public.generate_batch_public_slug(), false
FROM public.broiler_batches b
ON CONFLICT (batch_id, batch_kind) DO NOTHING;

-- 4) Farm photo column
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS photo_url text;

-- 5) Public read-only trace RPC
CREATE OR REPLACE FUNCTION public.get_public_batch_trace(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  page record;
  farm record;
  owner record;
  batch record;
  b_start date;
  b_end date;
  feed_rows jsonb := '[]'::jsonb;
  med_rows jsonb := '[]'::jsonb;
  env jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO page FROM public.batch_public_pages WHERE public_slug = _slug AND is_published = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF page.batch_kind = 'layer' THEN
    SELECT id, farm_id, user_id, batch_name, batch_name_bn, breed, start_date,
           COALESCE(actual_end_date, expected_end_date) AS end_date,
           initial_bird_count, current_bird_count, status
      INTO batch FROM public.layer_batches WHERE id = page.batch_id;
  ELSE
    SELECT id, farm_id, user_id, batch_name, batch_name_bn, breed, start_date,
           COALESCE(actual_end_date, expected_end_date) AS end_date,
           initial_bird_count, current_bird_count, status
      INTO batch FROM public.broiler_batches WHERE id = page.batch_id;
  END IF;

  IF batch.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT id, name, name_en, location, photo_url, owner_id INTO farm FROM public.farms WHERE id = batch.farm_id;
  SELECT user_name, farm_name, avatar_url INTO owner FROM public.profiles WHERE id = COALESCE(farm.owner_id, batch.user_id);

  b_start := batch.start_date;
  b_end := COALESCE(batch.end_date, CURRENT_DATE);

  IF page.batch_kind = 'broiler' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('date', f.feed_date, 'feed_type', f.feed_type, 'quantity_kg', f.quantity_kg) ORDER BY f.feed_date), '[]'::jsonb)
      INTO feed_rows FROM public.broiler_feed f WHERE f.batch_id = batch.id;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object('date', c.consumption_date, 'feed_type', c.feed_type, 'quantity_kg', c.quantity_kg) ORDER BY c.consumption_date), '[]'::jsonb)
      INTO feed_rows FROM public.feed_consumption c
      WHERE c.farm_id = batch.farm_id AND c.consumption_date BETWEEN b_start AND b_end;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', m.usage_date, 'name', m.medicine_name, 'type', m.medicine_type) ORDER BY m.usage_date), '[]'::jsonb)
    INTO med_rows FROM public.medicine_usage m
    WHERE (m.batch_id = batch.id) OR (m.batch_id IS NULL AND m.farm_id = batch.farm_id AND m.usage_date BETWEEN b_start AND b_end);

  SELECT jsonb_build_object(
           'avg_temperature', ROUND(AVG(NULLIF(s.temperature, 0))::numeric, 1),
           'avg_humidity', ROUND(AVG(NULLIF(s.humidity, 0))::numeric, 1),
           'readings', COUNT(*)
         )
    INTO env FROM public.sensor_readings s
    WHERE s.farm_id = batch.farm_id
      AND s.recorded_at >= b_start::timestamptz
      AND s.recorded_at < (b_end + 1)::timestamptz;

  RETURN jsonb_build_object(
    'found', true,
    'slug', page.public_slug,
    'generated_at', now(),
    'farm', jsonb_build_object(
      'name', farm.name,
      'name_en', farm.name_en,
      'location', farm.location,
      'photo_url', farm.photo_url
    ),
    'farmer', jsonb_build_object(
      'name', COALESCE(owner.user_name, owner.farm_name),
      'avatar_url', owner.avatar_url
    ),
    'batch', jsonb_build_object(
      'kind', page.batch_kind,
      'name', COALESCE(batch.batch_name_bn, batch.batch_name),
      'breed', batch.breed,
      'start_date', batch.start_date,
      'end_date', batch.end_date,
      'age_days', GREATEST(0, (LEAST(CURRENT_DATE, b_end) - batch.start_date)),
      'initial_bird_count', batch.initial_bird_count,
      'current_bird_count', batch.current_bird_count,
      'status', batch.status
    ),
    'feed', feed_rows,
    'medicine', med_rows,
    'environment', env
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_batch_trace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_batch_trace(text) TO anon, authenticated, service_role;