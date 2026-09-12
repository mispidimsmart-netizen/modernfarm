/**
 * SSOT for FarmEye Technical Architecture report tables (v8.2.0).
 * Keep in sync with src/lib/technicalArchitecturePdf.ts.
 */

export const LAYER_ARCHITECTURE_ROWS: string[][] = [
  ['L1 (Hardware)', 'ESP32 + Sensors + 8-Ch Relay', 'Source of Truth. Local safety. Offline.'],
  ['L2 (Safety)', 'Safety Arbiter (500ms)', '8 Invariants enforced. Cannot override.'],
  ['L3 (Automation)', 'Local Automation Engine', 'HSI, fan speed, heater, fogger.'],
  ['L4 (Comms)', 'WiFi + GSM SIM800L', 'Cloud sync + SMS. 360 offline buffer.'],
  ['L5 (Backend)', 'Edge Functions (Deno)', '19 functions. Safety, OTA, monitor, reports.'],
  ['L6 (Frontend)', 'React 18 PWA + Capacitor', 'Dashboard. Manual override (20min).'],
];

export const TECH_STACK_ROWS: string[][] = [
  ['MCU', 'ESP32 DevKit V1', 'Arduino C++, 240MHz'],
  ['Sensors', 'DHT22×2, MQ-137, YF-S201', 'Temp, NH3, Water, Voltage'],
  ['Communication', 'WiFi + GSM SIM800L', 'HTTP + SMS fallback'],
  ['Backend', 'PostgreSQL + Deno Edge', '19 functions, 69 tables, RLS'],
  ['Frontend', 'React 18 + TypeScript 5', 'Vite 5, shadcn/ui'],
  ['Mobile', 'PWA + Capacitor 8', 'iOS/Android wrapper'],
];

export const RELAY_PIN_ROWS: string[][] = [
  ['IN1', '25', 'Exhaust Fan', 'HSI-based speed'],
  ['IN2', '26', 'Ceiling Fan', 'ON>26°C / OFF<22°C'],
  ['IN3', '27', 'Light', 'Schedule + manual'],
  ['IN4', '14', 'Heater', 'ON<20°C / OFF>24°C'],
  ['IN5', '12', 'Fogger', 'T>32°C & H<85%'],
  ['IN6', '13', 'Alarm/Buzzer', 'Emergency alerts'],
  ['IN7', '15', 'Sprinkler', 'HSI>80 / Stop<75'],
  ['IN8', '33', 'Circulation Fan', 'Age-based airflow'],
];

export const SENSOR_PIN_ROWS: string[][] = [
  ['DHT22 #1', '4', '3.3V', '10K pull-up'],
  ['DHT22 #2', '16', '3.3V', '10K pull-up'],
  ['MQ-137 (NH3)', '34 (ADC)', '5V', '24h pre-heat'],
  ['YF-S201 (Water)', '18', '5V', 'Interrupt-driven'],
  ['ZMPT101B (Voltage)', '35 (ADC)', '5V', 'AC monitoring'],
  ['GSM SIM800L', '23/19', '-', 'Serial TX/RX'],
];

export const STATE_MACHINE_ROWS: string[][] = [
  ['BOOT', '0-30 sec', 'Sequential relay test (2s gap)'],
  ['BOOT_PURGE', '30s-5 min', 'INV-6: Forced ventilation'],
  ['NORMAL', 'Continuous', 'Full automation active'],
  ['WARNING', 'Variable', 'HSI elevated. Fan speed up.'],
  ['DANGER', 'Variable', 'HSI critical. All fans HIGH.'],
  ['EMERGENCY', 'Until stable 2m', 'All fans max, alarm ON, SMS'],
  ['SENSOR_FAIL', 'Until recovery', 'Exhaust ON, Heater OFF, Alarm'],
  ['OFFLINE', 'After 60s', 'NVS autonomous mode'],
];

export const LOOP_TIMING_ROWS: string[][] = [
  ['Safety Arbiter', '500ms', 'Checks all 8 invariants'],
  ['Sensor Read', '2 sec', 'DHT22 + MQ-137 + Water'],
  ['Automation Engine', '5 sec', 'HSI + relay decisions'],
  ['Cloud Sync', '15 sec', 'POST telemetry data'],
  ['Command Poll', '5 sec', 'GET pending commands'],
  ['NVS Heartbeat', '30 sec', 'Power outage detection'],
  ['Watchdog Feed', '10 sec', 'Hardware WDT (8s)'],
];

export const SAFETY_INVARIANT_ROWS: string[][] = [
  ['INV-1', 'Max Temp Override', '>38°C → ALL fans ON', 'CRITICAL'],
  ['INV-2', 'Heater-Vent Interlock', 'Heater ON → Fan stays ON', 'CRITICAL'],
  ['INV-3', 'Relay Toggle Guard', '60s minimum gap', 'HIGH'],
  ['INV-4', 'Sensor Fail-Safe', 'No data 90s → SENSOR_FAIL', 'CRITICAL'],
  ['INV-5', 'Override Timeout', '20 min auto-expire', 'HIGH'],
  ['INV-6', 'Boot Purge', '5-min forced ventilation', 'HIGH'],
  ['INV-7', 'Heater Cooldown', '5-min MAX → 2-min cool', 'MEDIUM'],
  ['INV-8', 'GPIO Conflict', 'Duplicate pin → HALT', 'CRITICAL'],
];

export const SVL_ROWS: string[][] = [
  ['1', 'Range Check', 'T: 0~60°C, H: 10-100%'],
  ['2', 'Median Filter', '5-sample window'],
  ['3', 'Spike Rejection', '>20% deviation → reject'],
  ['4', 'Rate Limiter', '8°C/5sec max change'],
  ['5', 'Frozen Detection', 'Same value 2 min'],
  ['6', 'Dual Cross-Check', 'Δ≥3°C → SMS alert, worst-case'],
  ['7', 'MQ-137 Warmup', '24h automation disabled'],
  ['8', 'Sanity Range', 'Out of range → reject'],
];

export const SMS_ROWS: string[][] = [
  ['Emergency (ESM)', 'Temp>38°C / NH3>50ppm', '2 min'],
  ['Power Outage', 'Voltage drop detected', 'Immediate'],
  ['Power Restored', 'Voltage restored', 'Immediate'],
  ['Sensor Failure', 'No data > 90 sec', '5 min'],
  ['Cross-Validation', 'DHT22 Δ ≥ 3°C', '10 min'],
  ['Manual Mode', 'User switches to manual', 'Immediate'],
];

export const EDGE_FUNCTION_ROWS: string[][] = [
  ['esp32-api', 'Telemetry & commands', 'HTTP'],
  ['automation-engine', 'HSI, fan speed', 'Periodic'],
  ['safety-engine', 'Server-side safety', '60s sync'],
  ['emergency-webhook', 'Critical alerts', 'DB trigger'],
  ['fetch-weather', 'Predictive cooling', 'Scheduled'],
  ['daily-farm-report', 'Daily summary', 'pg_cron'],
  ['send-push-notification', 'Web Push/FCM', 'Event'],
  ['push-public-key', 'VAPID key distribute', 'HTTP'],
  ['ota-firmware', 'Firmware updates', 'Admin'],
  ['health-score', 'Farm health score', 'On-demand'],
  ['heat-risk', 'Heat stress analysis', 'Periodic'],
  ['water-trend', 'Water anomaly detect', 'Periodic'],
  ['export-data', 'CSV/Excel export', 'User'],
  ['notification-escalation', 'Alert escalation', 'Event'],
  ['schedule-notifier', 'Schedule automation', 'Cron'],
  ['lookup-login-identifier', 'Login lookup', 'Auth'],
  ['mode-profile', 'Automation profile', 'HTTP'],
  ['admin-delete-user', 'Super-admin removal', 'Admin'],
  ['device-monitor', 'Device health & online tracking', 'Periodic'],
];

export const MULTI_TENANT_ROWS: string[][] = [
  ['farms.owner_id', 'Farm owner', 'Original creator'],
  ['farm_members', 'Multi-user access', 'role: owner/member/labor'],
  ['user_can_access_farm()', 'RLS gate', 'SECURITY DEFINER'],
  ['Labor Invite Code', 'Auto-membership', 'Owner ID → 6-char code'],
  ['UserRoleManager UI', 'Settings → Team tab', 'Code gen + member list'],
];

export const SETTINGS_PERSISTENCE_ROWS: string[][] = [
  ['Farm Setup', 'farm_settings', 'farm_size, season, profile'],
  ['HSI Thresholds', 'farm_settings', 'hsi_mild/moderate/severe/emerg'],
  ['Fan Bands', 'farm_settings', 'fan_low/medium/high_temp'],
  ['Calibration', 'device_calibration', 'temp/humidity/NH3 offset'],
  ['Op Preferences', 'advanced_automation_settings', '5 channels low/auto/high'],
  ['Live Modifier', 'useAdvancedAutomation', 'applyPreferences() soft nudge'],
];

export const DATA_RETENTION_ROWS: string[][] = [
  ['Audit Logs', '90 days', 'pg_cron auto-cleanup'],
  ['Safety Timeline', '7 days', 'pg_cron auto-cleanup'],
  ['Daily Summary', '365 days', 'pg_cron auto-cleanup'],
  ['Sensor Logs', '30 days', 'pg_cron auto-cleanup'],
  ['Emergency Events', 'Permanent', 'Never deleted'],
];

export const MANUAL_TAKEOVER_ITEMS = [
  { label: 'Master Override Switch', value: 'Single button disables ALL automation' },
  { label: 'Double Confirmation', value: 'Dialog + reason logging required' },
  { label: 'Individual Control', value: 'Direct toggle for all 8 relay channels' },
  { label: 'Safety Guardrail', value: 'ESM invariants still active in Manual Mode' },
  { label: 'Auto-Reset Timer', value: '20-min timeout → auto-reverts to Auto (INV-5)' },
  { label: 'SMS Alert', value: 'Immediate SMS when Manual Mode activated' },
  { label: 'Audit Log', value: 'All actions recorded with timestamp + user ID' },
];

export const OTA_ITEMS = [
  { label: 'Safety Gate', value: '10-minute stable environment required' },
  { label: 'Staged Rollout', value: '5% → 25% → 100% with soak periods' },
  { label: 'Rollback', value: 'Auto rollback if health check fails' },
  { label: 'Dual Partition', value: 'ESP32 OTA partition — always has fallback' },
];

export const SECURITY_ITEMS: string[] = [
  'Farm-based RLS — user_can_access_farm() সব টেবিলে',
  'Device Token Auth — x-device-token per-device isolation',
  'Override Safety Band — 26-35°C সীমার বাইরে reject',
  'Service Role Keys — Edge functions-এ, client-এ না',
  'Audit Trail — farm_audit_logs টেবিলে সব action logged',
  'RBAC — Owner / Member / Labor / Super Admin',
  'Audit Cleanup — 90-day auto-cleanup via pg_cron',
  '67 Tables — Full schema with foreign keys & RLS',
  'farm_members (NEW) — multi-user farm access',
  'Labor Invite Code (NEW) — auto membership on signup',
];

export const DEPLOYMENT_CHECKLIST: string[] = [
  'WIFI_SSID ও WIFI_PASSWORD সেট করুন',
  'DEVICE_TOKEN, SHED_ID, FARM_ID সেট করুন',
  '১২V ২A অ্যাডাপ্টার + ১০০০μF ক্যাপাসিটর',
  'DHT22 সেন্সর ১-১.৫ মিটার উচ্চতায়',
  'MQ-137 এ ২৪ ঘণ্টা প্রি-হিট',
  'Arduino IDE-তে কোড আপলোড (ESP32-WROOM-32 only)',
  'Serial Monitor-এ BOOT → NORMAL নিশ্চিত',
  'ফোন নম্বর সেটিংসে যোগ করুন',
  'UPS/IPS ESP32 ও রাউটারে সংযুক্ত',
  'ম্যানুয়াল বাইপাস সুইচ Exhaust Fan-এ ইনস্টল',
  'Calibration Offsets রান করুন (DeviceSystemTab)',
  'Labor অ্যাকাউন্ট দরকার হলে Team Management থেকে কোড জেনারেট',
];
