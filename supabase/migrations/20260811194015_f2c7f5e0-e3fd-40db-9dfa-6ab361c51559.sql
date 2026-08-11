CREATE OR REPLACE FUNCTION public.get_public_batch_trace(_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT id, name, name_en, location, photo_url, owner_id, created_at, total_sheds
    INTO farm FROM public.farms WHERE id = COALESCE(batch.farm_id, page.farm_id);
  SELECT user_name, farm_name, avatar_url INTO owner FROM public.profiles WHERE id = COALESCE(farm.owner_id, batch.user_id);

  b_start := batch.start_date;
  b_end := COALESCE(batch.end_date, CURRENT_DATE);

  IF page.batch_kind = 'broiler' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('date', f.feed_date, 'feed_type', f.feed_type, 'quantity_kg', f.quantity_kg) ORDER BY f.feed_date), '[]'::jsonb)
      INTO feed_rows FROM public.broiler_feed f WHERE f.batch_id = batch.id;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object('date', c.consumption_date, 'feed_type', c.feed_type, 'quantity_kg', c.quantity_kg) ORDER BY c.consumption_date), '[]'::jsonb)
      INTO feed_rows FROM public.feed_consumption c
      WHERE c.farm_id = farm.id AND c.consumption_date BETWEEN b_start AND b_end;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', m.usage_date, 'name', m.medicine_name, 'type', m.medicine_type) ORDER BY m.usage_date), '[]'::jsonb)
    INTO med_rows FROM public.medicine_usage m
    WHERE (m.batch_id = batch.id) OR (m.batch_id IS NULL AND m.farm_id = farm.id AND m.usage_date BETWEEN b_start AND b_end);

  SELECT jsonb_build_object(
           'avg_temperature', ROUND(AVG(NULLIF(s.temperature, 0))::numeric, 1),
           'avg_humidity', ROUND(AVG(NULLIF(s.humidity, 0))::numeric, 1),
           'readings', COUNT(*)
         )
    INTO env FROM public.sensor_readings s
    WHERE s.farm_id = farm.id
      AND s.recorded_at >= b_start::timestamptz
      AND s.recorded_at < (b_end + 1)::timestamptz;

  RETURN jsonb_build_object(
    'found', true,
    'slug', page.public_slug,
    'generated_at', now(),
    'farm', jsonb_build_object(
      'id', farm.id,
      'code', UPPER(LEFT(REPLACE(farm.id::text, '-', ''), 8)),
      'name', farm.name,
      'name_en', farm.name_en,
      'location', farm.location,
      'photo_url', COALESCE(farm.photo_url, owner.avatar_url),
      'registered_at', farm.created_at,
      'total_sheds', farm.total_sheds
    ),
    'farmer', jsonb_build_object(
      'name', COALESCE(owner.user_name, owner.farm_name),
      'avatar_url', COALESCE(owner.avatar_url, farm.photo_url)
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
$function$;