## লক্ষ্য

অ্যাডমিন ড্যাশবোর্ডের ট্যাব-ভীড় কমিয়ে ইউজার সংক্রান্ত সব ব্যবস্থাপনা একটি জায়গায় আনা, এবং সাইন-আপে অর্গানাইজেশন বেছে নেওয়া বাধ্যতামূলক করা যাতে প্রতিটি ফার্ম একটি অর্গানাইজেশনের অধীনে থাকে।

## নতুন ট্যাব কাঠামো

```text
অ্যাডমিন ড্যাশবোর্ড
├── 👥 ব্যবহারকারী ব্যবস্থাপনা (নতুন প্যারেন্ট ট্যাব)
│   ├── 👑 অ্যাডমিন      → বিদ্যমান AdminManagementTab
│   ├── 🏢 অর্গানাইজেশন  → বিদ্যমান OrganizationsPanel (তালিকা + তৈরি/এডিট/ডিলিট/সদস্য)
│   ├── 🚜 ফার্ম         → নতুন FarmsAdminPanel (সব ফার্ম + অর্গানাইজেশন বদলানো/ডিলিট)
│   └── 🛠️ ওয়ার্কার      → নতুন WorkersAdminPanel (ফার্মভিত্তিক ওয়ার্কারদের তালিকা)
├── 📊 অ্যানালিটিক্স
├── 🔔 নোটিফিকেশন
├── ⚙️ সিস্টেম (System Health, MQTT, Phase 8/9, OTA, Scale, Roadmap একসাথে)
├── 🛡️ সিকিউরিটি ও অডিট (Security Logs, Isolation, Forensic, Audit Report)
├── 🔌 ফার্মওয়্যার ও PCB
├── 💳 পেমেন্ট
└── 📚 ডকুমেন্টেশন (Docs + Architecture + Installation Guide একসাথে)
```

পুরোনো বিচ্ছিন্ন "কোম্পানি", "ফার্ম অ্যাসাইনমেন্ট", "আইসোলেশন", "PCB", "পর্যবেক্ষণ", "পারফরম্যান্স", "বেঞ্চমার্ক", "অডিট" ইত্যাদি আলাদা টপ-লেভেল ট্যাব আর থাকবে না — সব উপরের ৮টি গ্রুপের ভেতরে।

## সাইন-আপ ফ্লো পরিবর্তন

- `/signup` (এবং `OrgSignupPage`)-এ একটি **"অর্গানাইজেশন বেছে নিন"** সিলেক্ট/সার্চ যোগ হবে — অ্যাকটিভ অর্গানাইজেশনের তালিকা থেকে।
- নতুন ফার্ম তৈরি হলে সেটির `farms.organization_id` ঐ নির্বাচিত অর্গানাইজেশনে সেট হবে এবং ইউজার ঐ org-এর `member` হিসেবে `organization_members`-এ যুক্ত হবে।
- যদি কোনো অর্গানাইজেশন না থাকে, একটি ডিফল্ট "স্বতন্ত্র ব্যবহারকারী" org-এ যাবে (super admin তৈরি করে রাখবেন; UI fallback সহ)।
- অ্যাডমিন **ফার্ম** সাব-ট্যাব থেকে যে কোনো ফার্মের অর্গানাইজেশন বদলাতে/মুছতে পারবেন।

## নতুন উপাদান

1. **`UserManagementTab.tsx`** (নতুন) — ভেতরে একটি nested `<Tabs>` যাতে চারটি সাব-ট্যাব: Admins / Orgs / Farms / Workers। প্রতিটি সাব-ট্যাব ইতিমধ্যে থাকা/নতুন প্যানেল রেন্ডার করবে।
2. **`FarmsAdminPanel.tsx`** (নতুন) — সব ফার্মের তালিকা, প্রতিটির পাশে: org dropdown (পরিবর্তন), মালিক, সদস্য সংখ্যা, edit name, delete। RPC: `super_admin_set_farm_organization`, `super_admin_delete_farm`।
3. **`WorkersAdminPanel.tsx`** (নতুন) — ফার্ম সিলেক্ট → ঐ ফার্মের ওয়ার্কারদের (`farm_members` role=worker/viewer/manager) তালিকা; assign/remove (বিদ্যমান `OrgFarmAssignmentsPanel`-এর লজিক পুনরায় ব্যবহার)।
4. **`AdminPage.tsx`** — পুরোনো ১৮টি ফ্ল্যাট ট্যাব রিগ্রুপ করে ৮টি প্যারেন্ট ট্যাবে নামানো। কোনো বিদ্যমান প্যানেল কম্পোনেন্ট মুছে ফেলা হবে না — শুধু কোথায় রেন্ডার হচ্ছে সেটাই বদলাবে।
5. **`OrgSignupPage.tsx`** ও সাধারণ signup পথ — অর্গানাইজেশন সিলেক্টর ফিল্ড + সাবমিটে `farms.organization_id` সেট ও `organization_members` ইনসার্ট।

## ডাটাবেস পরিবর্তন

- নতুন RPC দরকার: `super_admin_set_farm_organization(_farm_id uuid, _org_id uuid)` — শুধু super admin চালাতে পারবেন; `farms.organization_id` আপডেট করবে এবং org_activity_audit-এ লিখবে।
- নতুন RPC: `super_admin_delete_farm(_farm_id uuid)` — সাবধানে cascade।
- `signup` flow-এ ব্যবহারের জন্য একটি লাইটওয়েট পাবলিক RPC: `list_active_organizations_for_signup()` (id, name, name_en, slug মাত্র; trial/lifetime/subscription-গুলো শুধু)।
- কোনো বিদ্যমান টেবিল/কলাম মুছবে না — সবটাই additive।

## ক্রম

1. SQL মাইগ্রেশন: তিনটি RPC যোগ করা।
2. `FarmsAdminPanel`, `WorkersAdminPanel`, `UserManagementTab` তৈরি।
3. `AdminPage.tsx` রিফ্যাক্টর — ট্যাব নতুন ৮-গ্রুপে সাজানো।
4. সাইন-আপ ফর্মে অর্গানাইজেশন সিলেক্টর যোগ + ফার্ম তৈরি লজিকে org_id সেট।
5. ব্রাউজার-প্রিভিউতে যাচাই।

## অপ্রভাবিত

- সব বিদ্যমান কম্পোনেন্ট, RLS, অটোমেশন রুল, ESP32 লজিক — কিছুই মুছছে না।
- "Hardware-as-Source-of-Truth" এবং safety invariants স্পর্শ করা হচ্ছে না।
- বিদ্যমান ফার্মগুলোর org_id NULL থাকলে সেগুলো NULL-ই থাকবে (অ্যাডমিন পরে অ্যাসাইন করতে পারবেন)।
