
-- Org usage analytics: daily series + summary
CREATE OR REPLACE FUNCTION public.get_org_usage_analytics(
  _organization_id uuid,
  _days integer DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _org record;
  _series jsonb;
  _summary jsonb;
  _payments jsonb;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.is_super_admin(_u) OR public.is_org_member(_u, _organization_id)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF _days < 1 OR _days > 365 THEN _days := 30; END IF;

  SELECT * INTO _org FROM public.organizations WHERE id = _organization_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;

  -- Daily series: new farms, new members, cumulative counts
  WITH days AS (
    SELECT generate_series(
      (CURRENT_DATE - (_days - 1))::date,
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  ),
  farm_daily AS (
    SELECT created_at::date AS day, count(*) AS c
    FROM public.farms
    WHERE organization_id = _organization_id
      AND created_at >= CURRENT_DATE - (_days - 1)
    GROUP BY 1
  ),
  member_daily AS (
    SELECT created_at::date AS day, count(*) AS c
    FROM public.organization_members
    WHERE organization_id = _organization_id
      AND created_at >= CURRENT_DATE - (_days - 1)
    GROUP BY 1
  ),
  base_farm AS (
    SELECT count(*)::int AS c FROM public.farms
    WHERE organization_id = _organization_id
      AND created_at < CURRENT_DATE - (_days - 1)
  ),
  base_member AS (
    SELECT count(*)::int AS c FROM public.organization_members
    WHERE organization_id = _organization_id
      AND created_at < CURRENT_DATE - (_days - 1)
  ),
  joined AS (
    SELECT
      d.day,
      COALESCE(f.c, 0)::int AS new_farms,
      COALESCE(m.c, 0)::int AS new_members,
      (SELECT c FROM base_farm) +
        SUM(COALESCE(f.c, 0)) OVER (ORDER BY d.day)::int AS cumulative_farms,
      (SELECT c FROM base_member) +
        SUM(COALESCE(m.c, 0)) OVER (ORDER BY d.day)::int AS cumulative_members
    FROM days d
    LEFT JOIN farm_daily f ON f.day = d.day
    LEFT JOIN member_daily m ON m.day = d.day
  )
  SELECT jsonb_agg(to_jsonb(joined) ORDER BY day) INTO _series FROM joined;

  -- Summary
  SELECT jsonb_build_object(
    'organization_id', _org.id,
    'name', _org.name,
    'license_type', _org.license_type,
    'license_expires_at', _org.license_expires_at,
    'days_remaining', CASE
      WHEN _org.license_expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(DAY FROM (_org.license_expires_at - now()))::int)
    END,
    'max_farms', _org.max_farms,
    'max_users', _org.max_users,
    'current_farms', (SELECT count(*) FROM public.farms WHERE organization_id = _org.id),
    'current_users', (SELECT count(*) FROM public.organization_members WHERE organization_id = _org.id),
    'farms_pct', round(
      LEAST(100, (SELECT count(*)::numeric FROM public.farms WHERE organization_id = _org.id)
        / NULLIF(_org.max_farms, 0) * 100), 1),
    'users_pct', round(
      LEAST(100, (SELECT count(*)::numeric FROM public.organization_members WHERE organization_id = _org.id)
        / NULLIF(_org.max_users, 0) * 100), 1)
  ) INTO _summary;

  -- Payment history (last 12 months sum per month)
  SELECT jsonb_agg(p ORDER BY p->>'month') INTO _payments FROM (
    SELECT jsonb_build_object(
      'month', to_char(date_trunc('month', created_at), 'YYYY-MM'),
      'amount', sum(amount_bdt),
      'count', count(*)
    ) AS p
    FROM public.payment_requests
    WHERE organization_id = _organization_id
      AND status = 'approved'
      AND created_at >= now() - interval '12 months'
    GROUP BY date_trunc('month', created_at)
  ) t;

  RETURN jsonb_build_object(
    'summary', _summary,
    'series', COALESCE(_series, '[]'::jsonb),
    'payments', COALESCE(_payments, '[]'::jsonb)
  );
END $$;
