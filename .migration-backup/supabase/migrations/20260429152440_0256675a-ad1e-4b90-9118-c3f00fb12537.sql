ALTER TABLE public.egg_production REPLICA IDENTITY FULL;
ALTER TABLE public.feed_consumption REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.egg_production;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_consumption;