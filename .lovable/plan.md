
# রেজিস্ট্রেশনে মালিক/কর্মী সিলেকশন ও আমন্ত্রণ কোড

## পরিবর্তনের সারসংক্ষেপ

রেজিস্ট্রেশন পেজে একটি নতুন ড্রপডাউন যোগ করা হবে যেখানে ব্যবহারকারী নির্বাচন করতে পারবেন তারা "মালিক" না "কর্মী"। কর্মী সিলেক্ট করলে আমন্ত্রণ কোড ইনপুট ফিল্ড দেখাবে।

## UI পরিবর্তন (LoginPage.tsx)

```text
+----------------------------------+
|     রেজিস্ট্রেশন ফর্ম            |
+----------------------------------+
| মোবাইল / ইমেইল                  |
| [______________________]         |
|                                  |
| পাসওয়ার্ড                       |
| [______________________]         |
|                                  |
| আপনার নাম *                     |
| [______________________]         |
|                                  |
| অ্যাকাউন্টের ধরণ                 |  <-- নতুন
| [মালিক 👑] [কর্মী 👷]            |  <-- নতুন
|                                  |
| (শুধুমাত্র মালিক হলে):           |
|   খামারের নাম                   |
|   [______________________]       |
|                                  |
|   ফার্মের ধরণ                   |
|   [লেয়ার] [ব্রয়লার]            |
|                                  |
| (শুধুমাত্র কর্মী হলে):           |  <-- নতুন
|   আমন্ত্রণ কোড *                |  <-- নতুন
|   [______________________]       |  <-- নতুন
|                                  |
| [অ্যাকাউন্ট তৈরি করুন]           |
+----------------------------------+
```

## বাস্তবায়ন পদক্ষেপ

### ১. LoginPage.tsx আপডেট

**নতুন স্টেট যোগ:**
```typescript
type UserType = 'owner' | 'worker';
const [userType, setUserType] = useState<UserType>('owner');
const [invitationCode, setInvitationCode] = useState('');
```

**নতুন UI উপাদান (isSignUp সেকশনে):**
- অ্যাকাউন্টের ধরণ toggle (মালিক/কর্মী)
- কর্মী সিলেক্ট হলে আমন্ত্রণ কোড ইনপুট ফিল্ড দেখানো
- মালিক সিলেক্ট হলে খামারের নাম ও ধরণ দেখানো

**handleSubmit লজিক আপডেট:**
- কর্মী হলে আমন্ত্রণ কোড ভ্যালিডেশন করা
- রেজিস্ট্রেশনের পর কর্মী হলে স্বয়ংক্রিয়ভাবে ফার্মে যোগদান করা

### ২. রেজিস্ট্রেশন ফ্লো (কর্মী)

```text
১. কর্মী সিলেক্ট করে
২. আমন্ত্রণ কোড দেয়
৩. অ্যাকাউন্ট তৈরি হয়
৪. স্বয়ংক্রিয়ভাবে লগইন হয়
৫. user_roles টেবিলে worker হিসেবে এন্ট্রি হয়
৬. worker_invitations আপডেট হয় (used_at, used_by)
৭. ড্যাশবোর্ডে রিডাইরেক্ট
```

### ৩. ভ্যালিডেশন

- কর্মী সিলেক্ট হলে আমন্ত্রণ কোড বাধ্যতামূলক
- রেজিস্ট্রেশনের আগেই আমন্ত্রণ কোড বৈধ কিনা চেক করা (optional improvement)
- মেয়াদোত্তীর্ণ বা ব্যবহৃত কোডে এরর দেখানো

---

## প্রযুক্তিগত বিবরণ

### ফাইল পরিবর্তন

| ফাইল | পরিবর্তন |
|------|----------|
| `src/pages/LoginPage.tsx` | userType state, invitation code input, conditional UI, updated handleSubmit |

### নতুন ইম্পোর্ট

```typescript
import { Crown, HardHat, Ticket } from 'lucide-react';
```

### handleSubmit পরিবর্তন

```typescript
// After successful signup and login (for workers)
if (userType === 'worker' && invitationCode.trim()) {
  // Validate and use invitation code
  const { data: invitation, error: findError } = await supabase
    .from('worker_invitations')
    .select('*')
    .eq('invite_code', invitationCode.toUpperCase())
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invitation) {
    // Show error: Invalid or expired code
    return;
  }

  // Create worker role
  await supabase.from('user_roles').insert({
    user_id: user.id,
    farm_owner_id: invitation.farm_owner_id,
    role: 'worker',
  });

  // Mark invitation as used
  await supabase.from('worker_invitations').update({
    used_at: new Date().toISOString(),
    used_by: user.id,
  }).eq('id', invitation.id);
}
```

### UI Toggle স্টাইল

```typescript
<div className="flex rounded-2xl bg-muted/50 p-1">
  <button
    type="button"
    onClick={() => setUserType('owner')}
    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
      userType === 'owner'
        ? 'bg-primary text-primary-foreground shadow-md'
        : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <Crown className="h-4 w-4" />
    {language === 'bn' ? 'মালিক' : 'Owner'}
  </button>
  <button
    type="button"
    onClick={() => setUserType('worker')}
    className={...}
  >
    <HardHat className="h-4 w-4" />
    {language === 'bn' ? 'কর্মী' : 'Worker'}
  </button>
</div>
```

---

## সুবিধাসমূহ

1. কর্মীরা সরাসরি রেজিস্ট্রেশনের সময়ই ফার্মে যোগ দিতে পারবে
2. আলাদাভাবে "দল ব্যবস্থাপনা" খুঁজে বের করার প্রয়োজন নেই
3. মালিকরা শুধু কোড শেয়ার করলেই হবে
4. সরল ও স্বজ্ঞাত ব্যবহারকারী অভিজ্ঞতা
