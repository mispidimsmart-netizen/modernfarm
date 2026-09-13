// Static guardrails for the V8 actuator RPC. These assertions intentionally
// avoid a live database so migration review cannot regress authorization or
// idempotency while the edge function tests are run in isolation.

const migrationPath = new URL(
  '../../migrations/20260912184000_v8_actuator_command_idempotency.sql',
  import.meta.url,
);

Deno.test('V8 actuator RPC requires hardware permission', async () => {
  const sql = await Deno.readTextFile(migrationPath);
  if (!sql.includes('public.can_change_hardware(auth.uid(), p_farm_id)')) {
    throw new Error('queue_v8_actuator_command must require can_change_hardware(auth.uid(), p_farm_id)');
  }
});

Deno.test('V8 binding rejects ambiguous legacy farm/shed calls', async () => {
  const sql = await Deno.readTextFile(migrationPath);
  for (const required of [
    'p_device_token_id uuid',
    'IF p_device_token_id IS NULL THEN',
    'SELECT count(*)',
    'IF v_candidate_count <> 1 THEN',
    "RAISE EXCEPTION 'DEVICE_BINDING_AMBIGUOUS'",
    'AND (p_device_token_id IS NULL OR dt.id = p_device_token_id)',
    'Preserve the legacy five-argument entry point',
    'NULL::uuid',
  ]) {
    if (!sql.includes(required)) {
      throw new Error(`Explicit/ambiguous binding guard missing: ${required}`);
    }
  }
  if (sql.includes('ORDER BY (dt.shed_id = p_shed_id) DESC')) {
    throw new Error('Ambiguous binding must not fall back to oldest-device ordering');
  }
});

Deno.test('V8 idempotency compares the full command target and intent', async () => {
  const sql = await Deno.readTextFile(migrationPath);
  const conflictBlock = sql.match(
    /IF v_existing AND \(([\s\S]*?)\) THEN\s+RAISE EXCEPTION 'CLIENT_REQUEST_ID_CONFLICT'/g,
  ) ?? [];
  if (conflictBlock.length < 2) {
    throw new Error('Both initial lookup and concurrent-conflict lookup must reject key reuse');
  }
  for (const block of conflictBlock) {
    for (const required of [
      'v_existing_farm_id IS DISTINCT FROM p_farm_id',
      'v_existing_shed_id IS DISTINCT FROM v_device_shed_id',
      'v_existing_device_name IS DISTINCT FROM v_device_name',
      'v_existing_command_type IS DISTINCT FROM p_command_type',
      'v_existing_command_value IS DISTINCT FROM p_command_value',
    ]) {
      if (!block.includes(required)) {
        throw new Error(`Idempotency conflict check missing: ${required}`);
      }
    }
  }
});