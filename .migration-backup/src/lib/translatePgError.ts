// Translates common Postgres / PostgREST / Supabase error messages to Bengali
// for user-facing toasts. Falls back to the original message if no rule matches.

const RULES: { pattern: RegExp; bn: string }[] = [
  { pattern: /permission denied|insufficient_privilege|not authorized|forbidden/i,
    bn: 'অনুমতি নেই — আপনার এই কাজ করার অধিকার নেই।' },
  { pattern: /violates row-level security|row-level security policy/i,
    bn: 'অ্যাক্সেস আটকে আছে — এই ডেটায় আপনার প্রবেশাধিকার নেই।' },
  { pattern: /duplicate key|already exists|unique constraint/i,
    bn: 'এই এন্ট্রি আগে থেকেই আছে।' },
  { pattern: /foreign key|violates foreign key/i,
    bn: 'সম্পর্কিত ডেটা পাওয়া যায়নি — পরীক্ষা করে আবার চেষ্টা করুন।' },
  { pattern: /not null|null value in column/i,
    bn: 'বাধ্যতামূলক ফিল্ড ফাঁকা আছে।' },
  { pattern: /check constraint|violates check/i,
    bn: 'ইনপুট মান গ্রহণযোগ্য সীমার বাইরে।' },
  { pattern: /super_admin .* farm_members|cannot add super_admin/i,
    bn: 'সুপার এডমিনকে farm_member হিসেবে যোগ করা যায় না।' },
  { pattern: /no rows|0 rows|not found/i,
    bn: 'কোনো রেকর্ড পাওয়া যায়নি।' },
  { pattern: /timeout|timed out/i,
    bn: 'রিকোয়েস্টে সময় লেগে গেছে — আবার চেষ্টা করুন।' },
  { pattern: /network|fetch failed|failed to fetch/i,
    bn: 'নেটওয়ার্ক সমস্যা — ইন্টারনেট চেক করুন।' },
  { pattern: /jwt|token .* expired|invalid token/i,
    bn: 'সেশন শেষ — আবার লগইন করুন।' },
];

export function translatePgError(err: unknown): string {
  const raw =
    (err as any)?.message ||
    (err as any)?.error_description ||
    (err as any)?.details ||
    (typeof err === 'string' ? err : '') ||
    'অজানা সমস্যা হয়েছে।';
  for (const { pattern, bn } of RULES) {
    if (pattern.test(raw)) return bn;
  }
  return raw;
}
