// Lovable Cloud backend function: resolve login identifier
// Purpose: allow login with phone OR real email for accounts using synthetic email auth.
// Resolves phone/email to the actual auth email used in Supabase auth.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  phone: z.string().trim().min(6).max(255).optional(),
  email: z.string().trim().email().optional(),
}).refine(d => d.phone || d.email, { message: "phone or email required" });

function phoneVariants(input: string): string[] {
  const digits = input.replace(/\D/g, "");
  if (!digits) return [];

  const set = new Set<string>();
  set.add(digits);

  if (digits.startsWith("0")) {
    set.add(digits.substring(1));
    set.add("880" + digits.substring(1));
    set.add("+880" + digits.substring(1));
  }
  if (digits.startsWith("880")) {
    const local = digits.substring(3);
    set.add(local);
    set.add("0" + local);
    set.add("+" + digits);
  }
  if (digits.startsWith("+880")) {
    const local = digits.substring(4);
    set.add(local);
    set.add("0" + local);
    set.add("880" + local);
  }

  return Array.from(set);
}

// Convert phone to synthetic email (must match frontend phoneToEmail logic)
function phoneToSyntheticEmail(phone: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("880")) normalized = normalized.substring(3);
  if (normalized.startsWith("0")) normalized = normalized.substring(1);
  return `${normalized}@phone.layerfarm.app`;
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) return jsonResponse({ email: null });

    const { phone, email } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ email: null });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Case 1: Phone lookup → find profile by phone → get actual auth email
    if (phone) {
      const variants = phoneVariants(phone);
      if (variants.length === 0) return jsonResponse({ email: null });

      const { data: profile } = await admin
        .from("profiles")
        .select("id, phone")
        .in("phone", variants)
        .limit(1)
        .maybeSingle();

      if (profile?.id) {
        // Get the actual auth email from auth.users via admin API
        const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
        if (authUser?.user?.email) {
          return jsonResponse({ email: authUser.user.email });
        }
        // Fallback to synthetic email
        if (profile.phone) {
          return jsonResponse({ email: phoneToSyntheticEmail(profile.phone) });
        }
      }
      return jsonResponse({ email: null });
    }

    // Case 2: Real email lookup → find the user's actual auth email
    if (email) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, phone")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (profile?.id) {
        // Get the actual auth email from auth.users
        const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
        if (authUser?.user?.email) {
          return jsonResponse({ email: authUser.user.email });
        }
        // Fallback to synthetic email from phone
        if (profile.phone) {
          return jsonResponse({ email: phoneToSyntheticEmail(profile.phone) });
        }
      }
      // Fallback: maybe account was created with this real email directly
      return jsonResponse({ email: email });
    }

    return jsonResponse({ email: null });
  } catch (_e) {
    return jsonResponse({ email: null });
  }
});
