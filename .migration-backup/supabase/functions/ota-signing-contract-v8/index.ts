/**
 * V8 OTA signing contract.
 *
 * The browser may calculate a digest, but it must never receive the Ed25519
 * private key. Configure V8_OTA_SIGNING_PRIVATE_KEY_B64 (PKCS#8) and
 * V8_OTA_SIGNING_PUBLIC_KEY_B64 (raw 32-byte key) as server secrets. This
 * function fails closed when either secret is absent or inconsistent.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function hexBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function isCanonicalBase64(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "POST required" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return response({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(url!, serviceKey!);
    const { data: { user } } = await supabase.auth.getUser(auth.slice(7));
    if (!user) return response({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isAdmin) return response({ error: "V8 firmware signing requires super admin" }, 403);

    const body = await req.json();
    const digest = String(body?.digest_sha256 ?? "").toLowerCase();
    const version = String(body?.version ?? "");
    if (!/^[0-9a-f]{64}$/.test(digest) || !/^v?\d+\.\d+\.\d+$/.test(version)) {
      return response({ error: "digest_sha256 and semantic version are required" }, 400);
    }

    const privateKeyB64 = Deno.env.get("V8_OTA_SIGNING_PRIVATE_KEY_B64");
    const publicKeyB64 = Deno.env.get("V8_OTA_SIGNING_PUBLIC_KEY_B64");
    if (!privateKeyB64 || !publicKeyB64) {
      console.error("[V8 OTA] signing secrets are not provisioned");
      return response({ error: "V8 signing key is not provisioned" }, 503);
    }
    if (!isCanonicalBase64(privateKeyB64) || !isCanonicalBase64(publicKeyB64)) {
      return response({ error: "invalid signing key encoding" }, 503);
    }
    const publicKey = decodeBase64(publicKeyB64);
    if (publicKey.length !== 32) return response({ error: "invalid signing public key" }, 503);

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      decodeBase64(privateKeyB64),
      { name: "Ed25519" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "Ed25519",
      privateKey,
      hexBytes(digest),
    );
    // Verify with the configured public key before returning metadata. This
    // catches a mismatched PKCS#8/private-key and public-key secret pair at
    // provisioning time rather than publishing an update no V8 device can
    // accept.
    const verifierKey = await crypto.subtle.importKey(
      "raw",
      publicKey,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const keyPairMatches = await crypto.subtle.verify(
      "Ed25519",
      verifierKey,
      signature,
      hexBytes(digest),
    );
    if (!keyPairMatches) {
      console.error("[V8 OTA] signing key pair mismatch");
      return response({ error: "V8 signing key pair mismatch" }, 503);
    }

    return response({
      signature_b64: btoa(String.fromCharCode(...new Uint8Array(signature))),
      public_key_b64: publicKeyB64,
      signature_alg: "ed25519",
      signed_payload: "sha256_digest_bytes",
      version,
    });
  } catch (error) {
    console.error("[V8 OTA] signing contract failed", error);
    return response({ error: "V8 signing failed closed" }, 503);
  }
});