-- Enable RLS on every existing sensor_readings partition (including default)
DO $$
DECLARE
  _rec record;
BEGIN
  FOR _rec IN
    SELECT c.relname
    FROM pg_inherits i
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE p.relname = 'sensor_readings'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _rec.relname);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', _rec.relname);
  END LOOP;
END $$;

-- Update partition factory to also enable RLS on newly created partitions
CREATE OR REPLACE FUNCTION public.create_sensor_partition_for_month(_month date)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _start date := date_trunc('month', _month)::date;
  _end   date := (date_trunc('month', _month) + interval '1 month')::date;
  _name  text := 'sensor_readings_y' || to_char(_start, 'YYYY') || 'm' || to_char(_start, 'MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.sensor_readings
       FOR VALUES FROM (%L) TO (%L)',
    _name, _start, _end);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', _name);
  RETURN _name;
END $$;