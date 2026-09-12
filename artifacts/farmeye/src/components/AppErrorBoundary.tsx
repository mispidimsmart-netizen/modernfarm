import { Sentry } from "@/lib/sentry";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function FallbackUI({ resetError }: { resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4 border border-border rounded-lg p-6 bg-card">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="text-xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
        <p className="text-sm text-muted-foreground">
          অ্যাপে অপ্রত্যাশিত ত্রুটি হয়েছে। আমাদের টিমকে স্বয়ংক্রিয়ভাবে জানানো হয়েছে।
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Button onClick={resetError} variant="outline">
            আবার চেষ্টা করুন
          </Button>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            পেইজ রিলোড
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <FallbackUI resetError={resetError} />}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
