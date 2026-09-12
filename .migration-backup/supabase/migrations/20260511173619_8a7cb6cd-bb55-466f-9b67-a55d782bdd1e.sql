
-- License expiry notifications: in-app + email-ready

CREATE TABLE IF NOT EXISTS public.license_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  threshold_days int NOT NULL, -- 30, 14, 7, 3, 1, 0 (expired), -7 etc
  days_remaining int NOT NULL,
  license_expires_at timestamptz NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','critical','expired')),
  message_bn text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  dismissed_at timestamptz,
  email_sent_at timestamptz,
  email_error text,
  UNIQUE (organization_id, threshold_days, license_expires_at)
);

CREATE INDEX IF NOT EXISTS idx_license_notif_org ON public.license_notifications(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_notif_unsent_email ON public.license_notifications(email_sent_at) WHERE email_sent_at IS NULL;

ALTER TABLE public.license_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "license_notif_select_org_member"
ON public.license_notifications FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "license_notif_update_org_admin"
ON public.license_notifications FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()) OR is_org_admin(auth.uid(), organization_id))
WITH CHECK (is_super_admin(auth.uid()) OR is_org_admin(auth.uid(), organization_id));

-- Generator function: scans orgs, inserts notifications at threshold crossings
CREATE OR REPLACE FUNCTION public.generate_license_expiry_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_days int;
  v_threshold int;
  v_severity text;
  v_msg text;
  v_inserted int := 0;
  v_thresholds int[] := ARRAY[30, 14, 7, 3, 1, 0, -1, -7];
BEGIN
  FOR v_org IN
    SELECT id, name, license_expires_at
    FROM public.organizations
    WHERE license_expires_at IS NOT NULL
  LOOP
    v_days := EXTRACT(DAY FROM (v_org.license_expires_at - now()))::int;

    -- pick the highest threshold the org currently sits at-or-below
    v_threshold := NULL;
    FOREACH v_threshold IN ARRAY v_thresholds LOOP
      IF v_days <= v_threshold THEN
        EXIT;
      END IF;
    END LOOP;

    -- find the right threshold (largest threshold >= v_days, but only fire for ≤30)
    v_threshold := NULL;
    IF v_days <= 30 THEN
      SELECT t INTO v_threshold
      FROM unnest(v_thresholds) t
      WHERE v_days <= t
      ORDER BY t ASC
      LIMIT 1;
    END IF;

    IF v_threshold IS NULL THEN
      CONTINUE;
    END IF;

    IF v_threshold <= 0 THEN
      v_severity := 'expired';
      v_msg := 'আপনার লাইসেন্সের মেয়াদ ' || ABS(v_days) || ' দিন আগে শেষ হয়েছে। এখনই নবায়ন করুন।';
      IF v_days >= 0 THEN
        v_msg := 'আপনার লাইসেন্সের মেয়াদ আজই শেষ হচ্ছে। এখনই নবায়ন করুন।';
      END IF;
    ELSIF v_threshold <= 3 THEN
      v_severity := 'critical';
      v_msg := 'আপনার লাইসেন্সের মেয়াদ মাত্র ' || v_days || ' দিন বাকি। দ্রুত নবায়ন করুন।';
    ELSIF v_threshold <= 7 THEN
      v_severity := 'warning';
      v_msg := 'আপনার লাইসেন্সের মেয়াদ ' || v_days || ' দিন বাকি। নবায়নের পরিকল্পনা করুন।';
    ELSE
      v_severity := 'info';
      v_msg := 'আপনার লাইসেন্সের মেয়াদ ' || v_days || ' দিন বাকি।';
    END IF;

    BEGIN
      INSERT INTO public.license_notifications
        (organization_id, threshold_days, days_remaining, license_expires_at, severity, message_bn)
      VALUES
        (v_org.id, v_threshold, v_days, v_org.license_expires_at, v_severity, v_msg);
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      -- already notified at this threshold for this expiry
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.generate_license_expiry_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_license_expiry_notifications() TO authenticated, service_role;

-- Mark seen / dismiss helpers
CREATE OR REPLACE FUNCTION public.mark_license_notification_seen(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.license_notifications
  SET seen_at = COALESCE(seen_at, now())
  WHERE id = _id
    AND (is_super_admin(auth.uid())
         OR is_org_member(auth.uid(), organization_id));
$$;

CREATE OR REPLACE FUNCTION public.dismiss_license_notification(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.license_notifications
  SET dismissed_at = now(), seen_at = COALESCE(seen_at, now())
  WHERE id = _id
    AND (is_super_admin(auth.uid())
         OR is_org_admin(auth.uid(), organization_id));
$$;

GRANT EXECUTE ON FUNCTION public.mark_license_notification_seen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_license_notification(uuid) TO authenticated;

-- Schedule daily cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('license-expiry-notifications-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'license-expiry-notifications-daily',
  '0 3 * * *', -- 03:00 UTC = 09:00 BDT
  $$ SELECT public.generate_license_expiry_notifications(); $$
);

-- Run once now to backfill
SELECT public.generate_license_expiry_notifications();
