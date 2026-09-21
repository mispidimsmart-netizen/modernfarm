/**
 * V8 OTA metadata contract.
 * Unsigned or digest-less metadata is never returned to a device.
 * Legacy ota-firmware remains available for old non-V8 clients; production
 * V8 firmware points here explicitly.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-device-token",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

function parseVersion(value: string): SemVer | null {
  const match = value.trim().match(
    /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/i,
  );
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareVersions(left: SemVer, right: SemVer): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }
  if (!left.prerelease.length && !right.prerelease.length) return 0;
  if (!left.prerelease.length) return 1;
  if (!right.prerelease.length) return -1;
  for (let i = 0; i < Math.max(left.prerelease.length, right.prerelease.length); i++) {
    if (i >= left.prerelease.length) return -1;
    if (i >= right.prerelease.length) return 1;
    const a = left.prerelease[i], b = right.prerelease[i];
    if (a === b) continue;
    const an = /^\d+$/.test(a), bn = /^\d+$/.test(b);
    if (an && bn) return Number(a) > Number(b) ? 1 : -1;
    if (an !== bn) return an ? -1 : 1;
    return a > b ? 1 : -1;
  }
  return 0;
}

function newer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate), b = parseVersion(current);
  return !!a && !!b && compareVersions(a, b) > 0;
}
function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}
function signed(fw: Record<string, unknown>): boolean {
  const signature = typeof fw.signature_b64 === "string" ? decodeBase64(fw.signature_b64) : null;
  const publicKey = typeof fw.signing_public_key_b64 === "string"
    ? decodeBase64(fw.signing_public_key_b64)
    : null;
  const configuredKey = Deno.env.get("V8_OTA_SIGNING_PUBLIC_KEY_B64");
  return /^v?8\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/i.test(String(fw.version ?? "")) &&
    !!configuredKey &&
    fw.require_signature === true &&
    typeof fw.url === "string" &&
    fw.url.startsWith("https://") &&
    Number.isInteger(fw.file_size_bytes) &&
    Number(fw.file_size_bytes) > 0 &&
    typeof fw.sha256_hex === "string" && /^[0-9a-f]{64}$/i.test(fw.sha256_hex) &&
    fw.signature_alg === "ed25519" &&
    signature?.length === 64 &&
    publicKey?.length === 32 &&
    fw.signing_public_key_b64 === configuredKey;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "boot-report" && req.method === "POST") {
      const token = req.headers.get("x-device-token");
      if (!token) return json({ error: "Missing device token" }, 401);
      const { data: device } = await supabase.from("device_tokens")
        .select("id, user_id, farm_id")
        .eq("token", token).eq("is_active", true).maybeSingle();
      if (!device?.id || !device.user_id || !device.farm_id) {
        return json({ error: "Invalid or unbound device token" }, 401);
      }
      const body = await req.json();
      const assignmentId = String(body?.assignment_id ?? "");
      const firmwareId = String(body?.firmware_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(assignmentId) || !firmwareId) {
        return json({ error: "assignment_id and firmware_id required" }, 400);
      }
      if (body?.boot_success === true && body?.signature_validated !== true) {
        return json({ error: "Successful boot must report signature validation" }, 400);
      }
      // assignment_id is the terminal-report idempotency key. Every
      // identity field is matched again so a valid token cannot report for a
      // different tenant/device/firmware.
      const { data: assignment, error: assignmentError } = await supabase
        .from("firmware_install_logs")
        .select("id, status, boot_attempts, to_version")
        .eq("id", assignmentId)
        .eq("device_token_id", device.id)
        .eq("firmware_id", firmwareId)
        .eq("user_id", device.user_id)
        .eq("farm_id", device.farm_id)
        .maybeSingle();
      if (assignmentError) return json({ error: "Unable to resolve OTA assignment" }, 503);
      // Retries after an acknowledged response are idempotent. A terminal
      // assignment must never be confused with another pending assignment.
      if (!assignment) return json({ error: "OTA assignment not found for device" }, 404);
      if (assignment.status !== "pending") {
        if ((body?.boot_success === true && assignment.status === "completed") ||
            (body?.boot_success !== true && assignment.status === "boot_failed")) {
          return json({ success: true, should_rollback: body?.boot_success !== true, already_terminal: true });
        }
        return json({ error: "OTA assignment is already terminal" }, 409);
      }

      // ── Server-side success verification ──────────────────────────────────
      // A client boolean alone must never mark an install complete. The running
      // version the board reports (and its image digest when it sends one) is
      // checked against the assigned firmware row; a mismatch is recorded as a
      // failed install and the device is told to roll back.
      let verificationError: string | null = null;
      if (body?.boot_success === true) {
        const { data: assignedFw, error: fwError } = await supabase
          .from("ota_firmware")
          .select("version, sha256_hex")
          .eq("id", firmwareId)
          .maybeSingle();
        if (fwError) return json({ error: "Unable to resolve assigned firmware" }, 503);
        if (!assignedFw) {
          verificationError = "assigned firmware metadata missing";
        } else {
          const norm = (v: unknown) => String(v ?? "").trim().replace(/^v/i, "").toLowerCase();
          const reported = norm(body?.version);
          const expected = norm(assignedFw.version);
          const target = norm(assignment.to_version);
          if (!reported) {
            verificationError = "running version not reported";
          } else if (reported !== expected || (target && reported !== target)) {
            verificationError = `running version ${reported} does not match assigned ${expected}`;
          } else if (typeof body?.installed_sha256 === "string" && body.installed_sha256.length === 64 &&
                     String(assignedFw.sha256_hex ?? "").toLowerCase() !== body.installed_sha256.toLowerCase()) {
            verificationError = "installed image digest mismatch";
          }
        }
      }
      const verifiedSuccess = body?.boot_success === true && verificationError === null;
      const finalStatus = verifiedSuccess ? "completed" : "boot_failed";
      const { error: reportError } = await supabase.from("firmware_install_logs")
        .update({
          status: finalStatus,
          boot_attempts: Number(assignment.boot_attempts ?? 0) + 1,
          boot_succeeded: verifiedSuccess,
          signature_validated: verifiedSuccess && body?.signature_validated === true,
          last_boot_at: new Date().toISOString(),
          completed_at: verifiedSuccess ? new Date().toISOString() : null,
          error_message: verifiedSuccess
            ? null
            : (verificationError ?? "boot validation failed"),
          rollback_triggered: !verifiedSuccess,
          auto_rolled_back: !verifiedSuccess,
        })
        .eq("id", assignment.id)
        .eq("status", "pending");
      if (reportError) return json({ error: "Unable to record boot report" }, 503);
      return json({
        success: true,
        should_rollback: !verifiedSuccess,
        ...(verificationError ? { verification_error: verificationError } : {}),
      });
    }

    if (action === "check") {
      const token = req.headers.get("x-device-token");
      if (!token) return json({ error: "Missing device token" }, 401);
      const { data: device } = await supabase.from("device_tokens")
      .select("id, user_id, farm_id, is_active").eq("token", token).eq("is_active", true).maybeSingle();
      if (!device) return json({ error: "Invalid device token" }, 401);
      if (!device.user_id || !device.farm_id) {
        return json({ error: "Device is not tenant-bound" }, 403);
      }
      const current = url.searchParams.get("current_version") ?? url.searchParams.get("version") ?? "";
      if (!parseVersion(current)) return json({ error: "Valid current_version is required" }, 400);

      // A V8 device may only receive its explicit per-device assignment. Do
      // not select newest global firmware: that bypasses canary rollout and
      // can cross tenant boundaries.
      const { data: assignment, error: assignmentError } = await supabase
        .from("firmware_install_logs")
        .select("id, firmware_id, user_id, farm_id, to_version")
        .eq("device_token_id", device.id)
        .eq("status", "pending")
        .eq("user_id", device.user_id)
        .eq("farm_id", device.farm_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (assignmentError) return json({ error: "OTA assignment unavailable" }, 503);
      if (!assignment) return json({ update_available: false, current_version: current });

      const { data: firmware, error } = await supabase.from("ota_firmware")
        .select("*").eq("id", assignment.firmware_id)
        .eq("is_active", true).maybeSingle();
      if (error) return json({ error: "OTA metadata unavailable" }, 503);
      if (!firmware || !newer(firmware.version, current) || !signed(firmware)) {
        return json({ update_available: false, current_version: current });
      }
      return json({
        update_available: true,
        assignment_id: assignment.id,
        firmware_id: firmware.id,
        version: firmware.version,
        url: firmware.url,
        size: firmware.file_size_bytes,
        checksum: firmware.checksum,
        sha256: firmware.sha256_hex,
        signature: firmware.signature_b64,
        signature_alg: firmware.signature_alg,
        signing_key: { public_key: firmware.signing_public_key_b64 },
        source: "ota_firmware_v8",
      });
    }

    if (action === "push" && req.method === "POST") {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const { data: { user } } = await supabase.auth.getUser(auth.slice(7));
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: admin } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      if (!admin) return json({ error: "Super admin required" }, 403);
      const body = await req.json();
      const { device_token_id, firmware_id } = body ?? {};
      const { data: device } = await supabase.from("device_tokens")
        .select("id, user_id, farm_id, is_active")
        .eq("id", device_token_id).eq("is_active", true).maybeSingle();
      if (!device || !device.user_id || !device.farm_id) {
        return json({ error: "Device is not tenant-bound" }, 400);
      }
      const { data: fw } = await supabase.from("ota_firmware").select("*")
        .eq("id", firmware_id).eq("is_active", true).maybeSingle();
      if (!fw || !signed(fw)) return json({ error: "V8 firmware metadata is unsigned or incomplete" }, 400);
      const { data: assignment, error: assignmentError } = await supabase.rpc(
        "queue_v8_ota_assignment",
        { _device_token_id: device.id, _firmware_id: fw.id },
      );
      if (assignmentError || !assignment?.assignment_id) {
        return json({ error: "Unable to queue tenant-bound OTA assignment" }, 503);
      }
      return json({
        success: true,
        message: "Signed V8 update queued",
        assignment_id: assignment.assignment_id,
        device_token_id: device.id,
        firmware_id: fw.id,
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("[V8 OTA]", error);
    return json({ error: "V8 OTA request failed closed" }, 503);
  }
});