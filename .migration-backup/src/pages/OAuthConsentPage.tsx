import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Beta helper types on supabase.auth.oauth
type AuthDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
} | null;

type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<{ data: AuthDetails; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: AuthDetails; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: AuthDetails; error: { message: string } | null }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthDetails>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const api = oauthApi();
      const { data, error } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError("অথরাইজেশন সার্ভার কোনো redirect URL ফেরত দেয়নি।");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const clientName = details?.client?.name ?? "External app";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/50 bg-background p-6 shadow-xl">
        <h1 className="text-xl font-bold text-foreground mb-1">
          {clientName}-কে FarmEye-এর সাথে সংযুক্ত করুন
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          এটি অনুমোদন করলে <strong>{clientName}</strong> আপনার হয়ে (as you) FarmEye-এর সক্ষম টুলগুলো
          কল করতে পারবে। এটি অ্যাপের নিজস্ব permission ও backend policy-কে bypass করবে না।
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!details && !error && (
          <div className="py-6 text-center text-sm text-muted-foreground">লোড হচ্ছে…</div>
        )}

        {details && (
          <>
            <div className="mb-4 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              {details.client?.redirect_uri && (
                <div>
                  <span className="font-semibold text-foreground">Redirect URI: </span>
                  <span className="break-all">{details.client.redirect_uri}</span>
                </div>
              )}
              {details.scope && (
                <div>
                  <span className="font-semibold text-foreground">Scopes: </span>
                  <span>{details.scope}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
              >
                {busy ? "অপেক্ষা করুন…" : "অনুমোদন করুন"}
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="h-11 rounded-xl border-2 border-border bg-background text-foreground font-medium disabled:opacity-60"
              >
                বাতিল করুন
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
