import { ShieldAlert } from 'lucide-react';

/**
 * Compact read-only banner shown at the top of a sheet when the current user
 * lacks write permission. Pair with `disabled={!canWrite}` on submit buttons.
 */
export function ReadOnlyBanner({
  message = 'আপনার শুধুমাত্র দেখার অনুমতি আছে — নতুন এন্ট্রি যোগ করতে পারবেন না।',
}: { message?: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-sm text-status-warning"
    >
      <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="leading-snug">{message}</span>
    </div>
  );
}
