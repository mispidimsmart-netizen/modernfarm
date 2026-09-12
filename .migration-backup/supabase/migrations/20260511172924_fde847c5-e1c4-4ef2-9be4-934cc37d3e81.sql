
-- Payment requests table for manual bKash/Nagad/Rocket/Bank payments
CREATE TYPE public.payment_method AS ENUM ('bkash', 'nagad', 'rocket', 'bank_transfer', 'other');
CREATE TYPE public.payment_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  payment_method public.payment_method NOT NULL,
  sender_account text NOT NULL,
  transaction_id text NOT NULL,
  amount_bdt numeric(12,2) NOT NULL CHECK (amount_bdt > 0),
  months_requested integer NOT NULL CHECK (months_requested BETWEEN 1 AND 36),
  requested_license_type public.org_license_type NOT NULL DEFAULT 'subscription',
  notes text,
  status public.payment_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  applied_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_requests_org ON public.payment_requests(organization_id, created_at DESC);
CREATE INDEX idx_payment_requests_status ON public.payment_requests(status, created_at DESC);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pay_select_org_or_super" ON public.payment_requests FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "pay_insert_org_admin" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND
    (public.is_super_admin(auth.uid()) OR public.is_org_admin(auth.uid(), organization_id))
  );

CREATE POLICY "pay_update_super_only" ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Submit payment request (org admin/owner)
CREATE OR REPLACE FUNCTION public.submit_payment_request(
  _organization_id uuid,
  _payment_method public.payment_method,
  _sender_account text,
  _transaction_id text,
  _amount_bdt numeric,
  _months_requested integer,
  _requested_license_type public.org_license_type DEFAULT 'subscription',
  _notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _id uuid;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.is_super_admin(_u) OR public.is_org_admin(_u, _organization_id)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  IF length(trim(_transaction_id)) < 4 THEN RAISE EXCEPTION 'Invalid transaction ID'; END IF;
  IF length(trim(_sender_account)) < 4 THEN RAISE EXCEPTION 'Invalid sender account'; END IF;

  INSERT INTO public.payment_requests (
    organization_id, submitted_by, payment_method, sender_account,
    transaction_id, amount_bdt, months_requested, requested_license_type, notes
  ) VALUES (
    _organization_id, _u, _payment_method, trim(_sender_account),
    trim(_transaction_id), _amount_bdt, _months_requested, _requested_license_type, _notes
  ) RETURNING id INTO _id;

  RETURN _id;
END $$;

-- Cancel own pending request
CREATE OR REPLACE FUNCTION public.cancel_payment_request(_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _r record;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _r FROM public.payment_requests WHERE id = _request_id;
  IF _r IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Only pending requests can be cancelled'; END IF;
  IF NOT (public.is_super_admin(_u) OR _r.submitted_by = _u OR public.is_org_admin(_u, _r.organization_id)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE public.payment_requests SET status = 'cancelled', reviewed_by = _u, reviewed_at = now()
    WHERE id = _request_id;
  RETURN true;
END $$;

-- Approve: extend license_expires_at by months_requested, set type, log audit
CREATE OR REPLACE FUNCTION public.approve_payment_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _r record;
  _org record;
  _new_expires timestamptz;
  _base timestamptz;
BEGIN
  IF _u IS NULL OR NOT public.is_super_admin(_u) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  SELECT * INTO _r FROM public.payment_requests WHERE id = _request_id FOR UPDATE;
  IF _r IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Already %', _r.status; END IF;

  SELECT * INTO _org FROM public.organizations WHERE id = _r.organization_id FOR UPDATE;
  IF _org IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;

  -- Extend from current expiry if still valid, else from now
  _base := CASE
    WHEN _org.license_expires_at IS NOT NULL AND _org.license_expires_at > now()
      THEN _org.license_expires_at
    ELSE now()
  END;
  _new_expires := _base + (_r.months_requested || ' months')::interval;

  UPDATE public.organizations
  SET license_type = _r.requested_license_type,
      license_expires_at = _new_expires,
      updated_at = now()
  WHERE id = _r.organization_id;

  UPDATE public.payment_requests
  SET status = 'approved', reviewed_by = _u, reviewed_at = now(),
      applied_expires_at = _new_expires
  WHERE id = _request_id;

  -- Audit log entry (uses existing org_license_audit if present)
  BEGIN
    INSERT INTO public.org_license_audit (
      organization_id, changed_by, action, new_license_type, new_expires_at, notes
    ) VALUES (
      _r.organization_id, _u, 'payment_approved',
      _r.requested_license_type, _new_expires,
      format('Payment %s via %s, txn %s, ৳%s, %s month(s)',
        _request_id, _r.payment_method, _r.transaction_id, _r.amount_bdt, _r.months_requested)
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'new_expires_at', _new_expires);
END $$;

-- Reject
CREATE OR REPLACE FUNCTION public.reject_payment_request(_request_id uuid, _reason text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
BEGIN
  IF _u IS NULL OR NOT public.is_super_admin(_u) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  IF length(trim(coalesce(_reason,''))) < 3 THEN
    RAISE EXCEPTION 'Rejection reason required';
  END IF;
  UPDATE public.payment_requests
  SET status = 'rejected', reviewed_by = _u, reviewed_at = now(), rejection_reason = _reason
  WHERE id = _request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found or not pending'; END IF;
  RETURN true;
END $$;

-- Suspend / Resume helpers (super admin)
CREATE OR REPLACE FUNCTION public.suspend_organization_license(_organization_id uuid, _reason text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL OR NOT public.is_super_admin(_u) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE public.organizations
  SET license_type = 'suspended', updated_at = now()
  WHERE id = _organization_id;
  BEGIN
    INSERT INTO public.org_license_audit (organization_id, changed_by, action, new_license_type, notes)
    VALUES (_organization_id, _u, 'suspended', 'suspended', _reason);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.resume_organization_license(_organization_id uuid, _new_type public.org_license_type, _new_expires_at timestamptz)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF _u IS NULL OR NOT public.is_super_admin(_u) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE public.organizations
  SET license_type = _new_type, license_expires_at = _new_expires_at, updated_at = now()
  WHERE id = _organization_id;
  BEGIN
    INSERT INTO public.org_license_audit (organization_id, changed_by, action, new_license_type, new_expires_at, notes)
    VALUES (_organization_id, _u, 'resumed', _new_type, _new_expires_at, 'License resumed');
  EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN true;
END $$;
