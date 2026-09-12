# অডিট রিপোর্ট যাচাই + ফিক্স পরিকল্পনা

## যাচাইয়ের ফলাফল (আমি নিজে কোড পড়ে মিলিয়েছি)

রিপোর্টটি বাস্তবসম্মত এবং অতিরঞ্জিত নয়। নিচেরগুলো কোডে নিশ্চিত হয়েছে:

| # | দাবি | যাচাই |
|---|------|-------|
| 1 | `mqtt-publish` এ কোনো auth নেই, arbitrary topic-এ publish করা যায় | **সত্য** — হ্যান্ডলারে Authorization পড়াই হয় না, service-role client দিয়ে সরাসরি publish; `config.toml`-এ `verify_jwt = false` |
| 2 | OTA admin অ্যাকশনে role-check নেই; `list`/`auto-advance` এ auth নেই | **সত্য** — `push/rollback/start-rollout/advance-rollout` শুধু `getUser(token)` দেখে; `list` ও `auto-advance` সম্পূর্ণ খোলা |
| 3 | INV-2 lethal-cold heating `!heaterLocked` দিয়ে gated (৩ মিনিট) | **সত্য** — সেফটি ইঞ্জিনে lethal-cold heating reboot lockout bypass করতে পারে না (কমেন্টে উল্টো লেখা আছে, কোড আসলে গেট করে) |
| 4 | INV-7 sensor loss → নিঃশর্ত heater OFF | **সত্য** — বয়স/ঠান্ডা বিবেচনা ছাড়াই forceHeaterOff |
| 5 | Offline queue drain-এ current user-এর id বসে | **সত্য** — `useOfflineSync` insert-এ `user_id: user.id` |
| 7 | pairing code `Math.random()`, কিন্তু token/secret CSPRNG | **সত্য** (রিপোর্টের self-correction ঠিক) |

অর্থাৎ #1 আসলেই CRITICAL এবং সবার আগে ঠিক করা দরকার।

## যা আমি ভিন্নভাবে দেখি

- আইটেম ৩ ও ৪ (heater lockout / sensor-loss heater OFF) আসলে **ইচ্ছাকৃত ডিজাইন** — fire/runaway ঠেকানোর জন্য। এগুলোকে "বাগ" না ধরে "শীতকালীন brooding-এর জন্য টিউনিং দরকার" হিসেবে দেখা উচিত, এবং হার্ডওয়্যার টেস্ট ছাড়া লাইভে দেওয়া যাবে না।
- আইটেম ১৩ (`phase_c_roadmap`) সত্যিই benign — ছোঁয়ার দরকার নেই।

## প্রস্তাবিত ফিক্স-ক্রম

### Phase 1 — ব্যাকএন্ড সিকিউরিটি (আজই, ঝুঁকি কম, হার্ডওয়্যার লাগে না)
1. `mqtt-publish`: JWT বাধ্যতামূলক করা, arbitrary `topic` বাতিল (শুধু `device_token_id` → resolved prefix), caller-এর farm access `user_can_access_farm` দিয়ে যাচাই, `log_security_event` অডিট। ESP32 কখনো এই ফাংশন কল করে না — তাই `verify_jwt = true` করা নিরাপদ।
2. `ota-firmware`: `push/rollback/start-rollout/advance-rollout`-এ super_admin অথবা farm-admin role গেট; `push`-এ device→farm scoping; `list`-এ auth; `auto-advance`-এ cron secret header।
3. `provision-device`: pairing code `crypto.getRandomValues()`, `/claim`-এ IP/code-ভিত্তিক rate-limit + ব্যর্থতা লগ।

### Phase 2 — ফ্রন্টএন্ড ডেটা ইন্টেগ্রিটি
4. Offline queue-তে enqueue করার সময়ই `user_id` (ও `farm_id`) সংরক্ষণ করা, drain-এ সেটাই ব্যবহার করা; mismatch হলে item স্কিপ করে ওয়ার্নিং। ইউনিট টেস্টসহ।

### Phase 3 — ফার্মওয়্যার (কোড এখন, ফ্ল্যাশ পরে — লাইভ ফার্মে নয়)
5. INV-2: lethal-cold হলে reboot lockout bypass করে bounded "survival heat" (সর্বোচ্চ N মিনিট, alarm সহ)।
6. INV-7: sensor loss-এ heater পুরো OFF না করে brooding বয়সে time-limited pulse + alarm।
7. v8 arbiter-এ NH3 invariant যোগ (v10-এর সাথে মিলিয়ে), `sensorPlausible` gate arbiter-এ ব্যবহার করা।
8. `esp32-ota-signed.ino` WiFi wait bounded, v10 SMS blocking delay → non-blocking।

প্রতিটি ধাপের পর টাইপচেক + টেস্ট চলবে; DB schema বা API contract ভাঙা হবে না (additive-only), সেফটি ইঞ্জিন দুর্বল করা হবে না।

## আপনার সিদ্ধান্ত দরকার

Phase 1 এখনই শুরু করব, নাকি তিনটি Phase একসাথে?
