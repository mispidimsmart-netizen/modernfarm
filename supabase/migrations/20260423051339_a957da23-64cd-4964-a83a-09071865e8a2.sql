-- Enable realtime for instant device command push (replaces 5s polling)
ALTER TABLE public.device_commands REPLICA IDENTITY FULL;
ALTER TABLE public.device_status REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'device_commands'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_commands;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'device_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_status;
  END IF;
END $$;