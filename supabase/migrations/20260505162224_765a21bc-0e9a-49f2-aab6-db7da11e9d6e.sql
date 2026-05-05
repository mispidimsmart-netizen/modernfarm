
-- Helper function: resolve avg unit price for a feed type from feed_inventory (latest 90 days)
CREATE OR REPLACE FUNCTION public.get_feed_avg_price(_farm_id uuid, _feed_type text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT AVG(unit_price)::numeric
     FROM public.feed_inventory
     WHERE farm_id = _farm_id
       AND feed_type = _feed_type
       AND unit_price > 0
       AND purchase_date >= (CURRENT_DATE - INTERVAL '90 days')),
    (SELECT unit_price
     FROM public.feed_inventory
     WHERE farm_id = _farm_id AND feed_type = _feed_type AND unit_price > 0
     ORDER BY purchase_date DESC LIMIT 1),
    0
  )
$$;

-- Trigger function: mirror feed_consumption rows into broiler_feed when batch is a broiler batch
CREATE OR REPLACE FUNCTION public.sync_feed_consumption_to_broiler_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_broiler boolean;
  _price numeric;
  _link_tag text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    _link_tag := '[auto:feed_consumption:' || OLD.id::text || ']';
    DELETE FROM public.broiler_feed WHERE notes LIKE _link_tag || '%';
    RETURN OLD;
  END IF;

  -- Only act when a batch_id is supplied
  IF NEW.batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.broiler_batches WHERE id = NEW.batch_id
  ) INTO _is_broiler;

  IF NOT _is_broiler THEN
    RETURN NEW;
  END IF;

  _link_tag := '[auto:feed_consumption:' || NEW.id::text || ']';
  _price := public.get_feed_avg_price(NEW.farm_id, NEW.feed_type);

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.broiler_feed (
      user_id, farm_id, batch_id, feed_date, feed_type,
      quantity_kg, cost_per_kg, notes
    ) VALUES (
      NEW.user_id, NEW.farm_id, NEW.batch_id, NEW.consumption_date, NEW.feed_type,
      NEW.quantity_kg, _price,
      _link_tag || COALESCE(' ' || NEW.notes, '')
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.broiler_feed
    SET feed_date = NEW.consumption_date,
        feed_type = NEW.feed_type,
        quantity_kg = NEW.quantity_kg,
        cost_per_kg = _price,
        batch_id = NEW.batch_id,
        farm_id = NEW.farm_id,
        notes = _link_tag || COALESCE(' ' || NEW.notes, '')
    WHERE notes LIKE _link_tag || '%';

    -- If no mirror existed (e.g. batch_id was just added), create one
    IF NOT FOUND THEN
      INSERT INTO public.broiler_feed (
        user_id, farm_id, batch_id, feed_date, feed_type,
        quantity_kg, cost_per_kg, notes
      ) VALUES (
        NEW.user_id, NEW.farm_id, NEW.batch_id, NEW.consumption_date, NEW.feed_type,
        NEW.quantity_kg, _price,
        _link_tag || COALESCE(' ' || NEW.notes, '')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_feed_consumption_to_broiler_feed ON public.feed_consumption;
CREATE TRIGGER trg_sync_feed_consumption_to_broiler_feed
AFTER INSERT OR UPDATE OR DELETE ON public.feed_consumption
FOR EACH ROW
EXECUTE FUNCTION public.sync_feed_consumption_to_broiler_feed();
