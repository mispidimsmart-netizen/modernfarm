-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the schedule-notifier function to run every minute
SELECT cron.schedule(
  'schedule-notifier-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/schedule-notifier',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhid2Z1dnFyZmd0ZWZvemFqeWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDI5ODksImV4cCI6MjA4NTU3ODk4OX0.3yCPVRrzrfvpwBIBKITkfm-Y3dsVzo_QUzVs3RNlHC8"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);