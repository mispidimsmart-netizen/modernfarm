// Lovable Cloud backend function: resolve login identifier
// Purpose: allow "phone + password" login for accounts created with email,
// by resolving a phone number to the user's email stored in public.profiles.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  phone: z.string().trim().min(6).max(20),
});

function phoneVariants(input: string): string[] {
  const digits = input.replace(/\D/g, "");
  if (!digits) return [];

  const set = new Set<string>();
  set.add(digits);

  // Common BD patterns (0XXXXXXXXXX, 880XXXXXXXXXX)
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const json = await req.json().catch(() => ({}));
    const { phone } = BodySchema.parse(json);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ email: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const variants = phoneVariants(phone);
    if (variants.length === 0) {
      return new Response(JSON.stringify({ email: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin
      .from("profiles")
      .select("email")
      .in("phone", variants)
      .not("email", "is", null)
      .limit(1)
      .maybeSingle();

    // Avoid leaking details; always respond 200 with nullable email.
    if (error) {
      return new Response(JSON.stringify({ email: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email: data?.email ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ email: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
