// Static guardrails for V8 alert delivery. These checks deliberately avoid a
// live provider/database so deploy review catches regressions in severity
// normalization and crash-after-send handling.

const functionPath = new URL("./index.ts", import.meta.url);
const migrationPath = new URL(
  "../../migrations/20260912183100_v8_alert_delivery_claims.sql",
  import.meta.url,
);

Deno.test("danger and legacy critical/high bypass quiet hours", async () => {
  const source = await Deno.readTextFile(functionPath);
  for (const severity of ['"danger"', '"critical"', '"high"']) {
    if (!source.includes(severity)) {
      throw new Error(`severity normalization must support ${severity}`);
    }
  }
  if (!source.includes('const isCritical = normalizedSeverity === "critical";')) {
    throw new Error("quiet-hour bypass must use normalized critical severity");
  }
  if (!source.includes("const bypassQuiet = isCritical")) {
    throw new Error("critical severity must control quiet-hour bypass");
  }
});

Deno.test("provider ambiguity is terminal and no unsupported key is assumed", async () => {
  const [source, sql] = await Promise.all([
    Deno.readTextFile(functionPath),
    Deno.readTextFile(migrationPath),
  ]);
  if (source.includes("Idempotency-Key")) {
    throw new Error("dispatcher must not assume an undocumented provider idempotency header");
  }
  for (const required of [
    "claim lease expired; provider submission ambiguous",
    "SET status = 'failed'",
    "release_v8_alert_delivery_claim",
    "AND claim_token = p_claim_token",
  ]) {
    if (!sql.includes(required)) {
      throw new Error(`crash-after-send guard missing: ${required}`);
    }
  }
});