-- Trigger function: enforce batch_id + farm_mode against active batch for the farm
CREATE OR REPLACE FUNCTION public.enforce_finance_batch_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _layer_id uuid;
  _broiler_id uuid;
  _batch_farm_id uuid;
  _batch_mode text;
BEGIN
  -- Resolve active batches for this farm
  IF NEW.farm_id IS NOT NULL THEN
    SELECT id INTO _layer_id
    FROM public.layer_batches
    WHERE farm_id = NEW.farm_id AND status = 'active'
    ORDER BY start_date DESC
    LIMIT 1;

    SELECT id INTO _broiler_id
    FROM public.broiler_batches
    WHERE farm_id = NEW.farm_id AND status = 'active'
    ORDER BY start_date DESC
    LIMIT 1;
  END IF;

  -- Auto-fill batch_id when missing (prefer layer if both somehow exist)
  IF NEW.batch_id IS NULL THEN
    IF _layer_id IS NOT NULL THEN
      NEW.batch_id := _layer_id;
      IF NEW.farm_mode IS NULL THEN NEW.farm_mode := 'layer'; END IF;
    ELSIF _broiler_id IS NOT NULL THEN
      NEW.batch_id := _broiler_id;
      IF NEW.farm_mode IS NULL THEN NEW.farm_mode := 'broiler'; END IF;
    END IF;
  END IF;

  -- If batch_id is set, verify it belongs to the same farm and infer mode
  IF NEW.batch_id IS NOT NULL THEN
    SELECT farm_id, 'layer' INTO _batch_farm_id, _batch_mode
    FROM public.layer_batches WHERE id = NEW.batch_id;

    IF _batch_farm_id IS NULL THEN
      SELECT farm_id, 'broiler' INTO _batch_farm_id, _batch_mode
      FROM public.broiler_batches WHERE id = NEW.batch_id;
    END IF;

    IF _batch_farm_id IS NULL THEN
      RAISE EXCEPTION 'Invalid batch_id %: not found in layer_batches or broiler_batches', NEW.batch_id;
    END IF;

    IF NEW.farm_id IS NOT NULL AND _batch_farm_id <> NEW.farm_id THEN
      RAISE EXCEPTION 'batch_id % does not belong to farm %', NEW.batch_id, NEW.farm_id;
    END IF;

    -- Auto-fill farm_mode from the batch type
    IF NEW.farm_mode IS NULL THEN
      NEW.farm_mode := _batch_mode;
    ELSIF NEW.farm_mode <> _batch_mode AND NEW.farm_mode <> 'both' THEN
      RAISE EXCEPTION 'farm_mode (%) does not match batch type (%) for batch %',
        NEW.farm_mode, _batch_mode, NEW.batch_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach to expenses
DROP TRIGGER IF EXISTS trg_enforce_finance_scope_expenses ON public.expenses;
CREATE TRIGGER trg_enforce_finance_scope_expenses
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_finance_batch_scope();

-- Attach to income
DROP TRIGGER IF EXISTS trg_enforce_finance_scope_income ON public.income;
CREATE TRIGGER trg_enforce_finance_scope_income
BEFORE INSERT OR UPDATE ON public.income
FOR EACH ROW
EXECUTE FUNCTION public.enforce_finance_batch_scope();
