import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { setSentryContext } from "@/lib/sentry";

/**
 * Syncs the current authenticated user (id only — no PII)
 * to Sentry scope so errors include farm/user context.
 * Mount once inside AuthProvider.
 */
export function SentryUserSync() {
  const { user } = useAuth();

  useEffect(() => {
    setSentryContext({
      userId: user?.id,
      farmId: (user as any)?.user_metadata?.farm_id,
      role: (user as any)?.user_metadata?.role,
    });
  }, [user]);

  return null;
}
