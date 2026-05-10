// Test notification edge function — sends a sample push to the caller
// to verify VAPID + subscription + service worker pipeline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Check subscriptions
    const { data: subs } = await supa
      .from("push_subscriptions")
      .select("id, endpoint, created_at")
      .eq("user_id", user.id);

    const diagnostics = {
      user_id: user.id,
      subscription_count: subs?.length ?? 0,
      vapid_configured: !!Deno.env.get("VAPID_PRIVATE_KEY") && !!Deno.env.get("VAPID_PUBLIC_KEY"),
      timestamp: new Date().toISOString(),
    };

    if ((subs?.length ?? 0) === 0) {
      return new Response(JSON.stringify({
        ok: false,
        diagnostics,
        message: "কোনো push subscription নেই — Settings থেকে push notification চালু করুন",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire test push via existing function
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        title: "🧪 টেস্ট নোটিফিকেশন",
        body: "Push notification সঠিকভাবে কাজ করছে! ✅",
        severity: "info",
      }),
    });

    const pushResult = await r.json().catch(() => ({}));

    return new Response(JSON.stringify({
      ok: r.ok,
      diagnostics,
      push_response: pushResult,
      message: r.ok
        ? "টেস্ট নোটিফিকেশন পাঠানো হয়েছে — এখনই দেখা উচিত"
        : "Push পাঠানো ব্যর্থ — diagnostics দেখুন",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
