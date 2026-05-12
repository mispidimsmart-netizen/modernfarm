import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sentry, sentryEnabled, captureSupabaseError, captureEsp32AckIssue } from "@/lib/sentry";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

function BomberChild(): JSX.Element {
  // Throws during render — caught by Sentry.ErrorBoundary
  throw new Error("Sentry test: render error from /sentry-test");
}

export default function SentryTestPage() {
  const [bomb, setBomb] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const enabled = sentryEnabled();

  const handleManualException = () => {
    try {
      throw new Error("Sentry test: manual exception (button click)");
    } catch (e) {
      Sentry.captureException(e);
      setLastAction("✅ captureException পাঠানো হয়েছে");
    }
  };

  const handleMessage = () => {
    Sentry.captureMessage("Sentry test: info message from /sentry-test", "info");
    setLastAction("✅ captureMessage পাঠানো হয়েছে");
  };

  const handleSupabaseSim = () => {
    captureSupabaseError(new Error("Simulated RLS denial"), {
      operation: "insert",
      table: "device_commands",
      farmId: "test-farm-id",
    });
    setLastAction("✅ Supabase error report পাঠানো হয়েছে");
  };

  const handleEsp32Sim = () => {
    captureEsp32AckIssue({ ackRate: 0.72, totalCommands: 50, farmId: "test-farm" });
    setLastAction("✅ ESP32 ack warning পাঠানো হয়েছে");
  };

  const handleUnhandledRejection = () => {
    Promise.reject(new Error("Sentry test: unhandled promise rejection"));
    setLastAction("⚠️ Unhandled rejection trigger করা হয়েছে (App-এ swallow হতে পারে)");
  };

  if (bomb) return <BomberChild />;

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Sentry Verification</h1>

      <Card className={enabled ? "border-green-500/50" : "border-yellow-500/50"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {enabled ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Sentry সক্রিয়
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Sentry নিষ্ক্রিয় (preview/dev)
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {!enabled && (
            <>
              <p className="text-muted-foreground">
                Preview/dev-এ Sentry quota বাঁচানোর জন্য বন্ধ। Test করতে force-enable করুন:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = "/sentry-test?sentry=on";
                }}
              >
                Force enable + reload
              </Button>
            </>
          )}
          {enabled && (
            <p className="text-muted-foreground">
              নিচের কোনো বাটন চাপুন → Sentry dashboard → Issues tab-এ ৩০ সেকেন্ডের মধ্যে দেখা যাবে।
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Error Triggers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="destructive" onClick={() => setBomb(true)}>
            1. Render Error (ErrorBoundary)
          </Button>
          <Button variant="destructive" onClick={handleManualException}>
            2. Manual captureException
          </Button>
          <Button variant="outline" onClick={handleMessage}>
            3. Info Message
          </Button>
          <Button variant="outline" onClick={handleSupabaseSim}>
            4. Supabase error sim
          </Button>
          <Button variant="outline" onClick={handleEsp32Sim}>
            5. ESP32 ack warning
          </Button>
          <Button variant="outline" onClick={handleUnhandledRejection}>
            6. Unhandled rejection
          </Button>
        </CardContent>
      </Card>

      {lastAction && (
        <div className="rounded-md border border-border bg-muted p-3 text-sm">
          {lastAction}
        </div>
      )}

      <a
        href="https://sentry.io/organizations/nexiot-labs/issues/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        Sentry Dashboard খুলুন
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
