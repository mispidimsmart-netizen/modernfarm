// Twilio inbound webhook: handles SMS/WhatsApp replies (STOP / START / ACK / HELP)
// Public endpoint — verify_jwt = false. Returns TwiML.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function twiml(text: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${text}</Message></Response>`;
  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

function emptyTwiml() {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, {
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Twilio sends application/x-www-form-urlencoded
  let form: URLSearchParams;
  try {
    const text = await req.text();
    form = new URLSearchParams(text);
  } catch {
    return emptyTwiml();
  }

  const fromRaw = (form.get("From") ?? "").trim();
  const toRaw = (form.get("To") ?? "").trim();
  const body = (form.get("Body") ?? "").trim();
  const sid = form.get("MessageSid") ?? null;

  const isWhatsApp = fromRaw.startsWith("whatsapp:");
  const channel = isWhatsApp ? "whatsapp" : "sms";
  const fromNumber = fromRaw.replace(/^whatsapp:/, "");

  const upper = body.toUpperCase();
  let action: "opt_in" | "opt_out" | "ack" | "help" | "unknown" = "unknown";
  if (/^(STOP|UNSUBSCRIBE|CANCEL|END|QUIT|বন্ধ)/i.test(body)) action = "opt_out";
  else if (/^(START|YES|UNSTOP|হ্যাঁ|চালু)/i.test(body)) action = "opt_in";
  else if (/^(HELP|সাহায্য)/i.test(body)) action = "help";
  else if (/^(ACK|OK|আছি|ঠিক)/i.test(body)) action = "ack";

  // Match user by phone or whatsapp_number
  const { data: cfgs } = await supa
    .from("notification_preferences")
    .select("user_id")
    .or(`phone_e164.eq.${fromNumber},whatsapp_number.eq.${fromNumber}`)
    .limit(1);
  const matchedUserId = cfgs?.[0]?.user_id ?? null;

  // Apply opt-in/out
  if (matchedUserId && (action === "opt_in" || action === "opt_out")) {
    const status = action === "opt_in" ? "opted_in" : "opted_out";
    const patch: Record<string, unknown> = isWhatsApp
      ? { whatsapp_optin_status: status, whatsapp_optin_at: new Date().toISOString() }
      : { sms_optin_status: status, sms_optin_at: new Date().toISOString() };
    await supa.from("notification_preferences").update(patch).eq("user_id", matchedUserId);
  }

  // ACK most recent unacknowledged alert for the user
  if (matchedUserId && action === "ack") {
    const { data: rows } = await supa
      .from("alerts")
      .select("id")
      .eq("user_id", matchedUserId)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (rows?.[0]?.id) {
      await supa.rpc("acknowledge_alert", { _alert_id: rows[0].id }).catch(() => {});
    }
  }

  await supa.from("twilio_inbound_log").insert({
    channel, from_number: fromNumber, to_number: toRaw.replace(/^whatsapp:/, ""),
    body, message_sid: sid, matched_user_id: matchedUserId, action,
  });

  // Reply
  if (action === "opt_out") {
    return twiml("আপনি সফলভাবে বার্তা গ্রহণ বন্ধ করেছেন। পুনরায় চালু করতে START লিখে পাঠান।");
  }
  if (action === "opt_in") {
    return twiml("ধন্যবাদ! আপনি Farmeye থেকে বার্তা পাবেন। বন্ধ করতে STOP লিখুন।");
  }
  if (action === "help") {
    return twiml("Farmeye সতর্কতা সেবা।\nবন্ধ করতে: STOP\nচালু করতে: START\nসতর্কতা স্বীকার করতে: ACK");
  }
  if (action === "ack") {
    return twiml("✓ সতর্কতা স্বীকৃত হয়েছে।");
  }
  return emptyTwiml();
});
