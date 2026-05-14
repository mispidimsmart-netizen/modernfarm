# সম্পূর্ণ সফটওয়্যার অডিট — স্টেপ বাই স্টেপ

আমি পুরো সিস্টেম সূক্ষ্মভাবে যাচাই করব এবং প্রতিটি ধাপে রিপোর্ট দেব। বড় কাজ — তাই **৭ ফেজে** ভাগ করে চালাব। প্রতিটি ফেজ শেষে আপনাকে findings + fixes দেখাব, এরপর পরের ফেজে যাব।

## ফেজগুলো

### Phase 1 — Auth, Roles & Routing
- LoginPage, OrgSignup, ResetPassword flow
- 4-role guards: super_admin / org_owner / farm_owner / worker
- RoleProtectedRoute, PlatformRoleGuard, WorkerLockScreen
- usePermissions vs legacy useUserPermissions/useUserRole inconsistency
- Route table in App.tsx — প্রতিটি route-এ সঠিক guard আছে কিনা

### Phase 2 — Dashboard, Sensors & Sheds
- Dashboard cards (SensorCard, AlertCard, BroilerDashboardWidget, WeatherCard)
- useSensorData / useRealtimeSensorData / useSafetyStatus
- ShedSelector + multi-shed isolation (farm_id filter)
- Phase 9 sensors mapping (DHT22/SHT31, MQ-137/ZE03-NH3, GSM)

### Phase 3 — Automation & Control (Manual / Auto / Broiler / Layer)
- AutomationPage — RBAC gates (verify আগের fix কাজ করছে)
- ControlPage — temp override, 20m timeout, canChangeHardware
- BroilerAgeAutoModeCard, BroilerTempCurveCard — day-based curve
- 8 hardware invariants vs cloud mirror (heatStressIndex)
- Layer mode: ceiling fan, sprinkler thresholds
- AutomationEngineDashboard, AutomationStatusCard

### Phase 4 — Broiler & Layer Mode Specifics
- BroilerBatch/Feed/Weight sheets, FCR
- LayerBatch flock_info SSOT trigger
- Lighting curve + age-based suggestion
- Active batch → flock_info auto-sync verification

### Phase 5 — Finance, Reports & Analytics
- FinanceReportPage — batch_id scope filter
- FinanceAuditPanel hidden from farm page (constraint)
- Reports, Analytics, Phase9Report, BroilerCost

### Phase 6 — Admin & Org Panel
- AdminPage tabs (User, Role editor, Farm soft-delete/restore)
- OrgAdminPage — org member management
- Role auto-sync triggers + test_role_sync_invariants RPC
- Newly added test_role_write_invariants RPC button

### Phase 7 — Hardware/Edge Integration & Alerts
- esp32-api edge function — desired_* writes only
- safety-engine, automation-engine, ai-forecast
- Alert pipeline: SmartAlerts, AlertDispatcher, SMS/Push
- Device commands (no shed_id), device_status RLS

## প্রতিটি ফেজে যা করব
1. সংশ্লিষ্ট ফাইলগুলো পড়ব (parallel)
2. কোড vs memory rules vs DB schema cross-check
3. বাগ/inconsistency পেলে fix proposal লিখব
4. user-approved হলে fix apply করব
5. সংক্ষিপ্ত findings table দেব

## টেকনিক্যাল নোট
- পড়া-শোনা প্রধান কাজ, code edits শুধু confirmed bugs-এ
- Memory rules কঠোরভাবে মানা হবে (Bengali UI, hardware SSOT, no overwriting actual_* columns, ইত্যাদি)
- প্রতিটি ফেজ শেষে stop → আপনার সম্মতি নিয়ে পরের ফেজ

**শুরু করব Phase 1 দিয়ে?** নাকি কোনো নির্দিষ্ট ফেজ আগে চান (যেমন সরাসরি Phase 3 — Automation/Control)?
