export const downloadTechnicalArchitecturePdf = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>FarmEye Technical Architecture v8.0.0 — Nexiot Labs</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Noto Sans Bengali', Arial, sans-serif; padding: 30px; color: #1a1a2e; line-height: 1.6; font-size: 11px; }
      h1 { font-size: 20px; color: #1e3a5f; margin-bottom: 4px; }
      h2 { font-size: 14px; color: #2d5a87; margin: 18px 0 8px; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; }
      h3 { font-size: 12px; color: #344054; margin: 10px 0 6px; }
      table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 10px; }
      th, td { border: 1px solid #d0d5dd; padding: 4px 8px; text-align: left; }
      th { background: #e8edf5; font-weight: 600; }
      tr:nth-child(even) { background: #f8fafc; }
      .subtitle { color: #667085; font-size: 12px; margin-bottom: 16px; }
      .score { text-align: center; font-size: 22px; font-weight: 700; color: #1e8a3e; margin: 12px 0; }
      ul { padding-left: 20px; margin: 4px 0 8px; }
      li { margin: 2px 0; }
      .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #e0e7ff; font-size: 10px; color: #667085; text-align: center; }
      .page-break { page-break-before: always; }
      @media print { body { padding: 15px; } }
    </style></head><body>
    <h1>🏗️ FarmEye Automation Platform — Technical Architecture</h1>
    <p class="subtitle">Version 8.2.0 | Industrial Grade | Production-Ready | Score: 100/100</p>
    <p class="subtitle">19 Edge Functions | 69 DB Tables | Multi-Tenant | Date: ${new Date().toLocaleDateString('bn-BD')}</p>

    <h2>1. System Overview — 6-Layer Architecture</h2>
    <table><tr><th>Layer</th><th>Component</th><th>Role</th></tr>
    <tr><td>Layer 1 (Hardware)</td><td>ESP32 + Sensors + 8-Channel Relay</td><td>Source of Truth for all relay states. Local safety decisions. Offline-capable.</td></tr>
    <tr><td>Layer 2 (Safety)</td><td>Safety Arbiter (500ms loop)</td><td>8 Invariants enforced every 500ms. Cannot be overridden.</td></tr>
    <tr><td>Layer 3 (Automation)</td><td>Local Automation Engine</td><td>HSI calculation, fan speed, heater control, fogger cycling.</td></tr>
    <tr><td>Layer 4 (Communication)</td><td>WiFi + GSM SIM800L</td><td>Cloud sync + SMS fallback. Offline buffer 360 entries.</td></tr>
    <tr><td>Layer 5 (Backend)</td><td>Edge Functions (Deno/TypeScript)</td><td>19 functions: automation, safety, notifications, OTA, device monitor.</td></tr>
    <tr><td>Layer 6 (Frontend)</td><td>React 18 PWA + Capacitor</td><td>Read-only monitoring. Manual override (with timeout).</td></tr></table>
    <p><strong>Key Principle:</strong> Hardware-as-Source-of-Truth. ESP32 makes all final relay decisions.</p>

    <h2>2. Technology Stack</h2>
    <table><tr><th>Layer</th><th>Technology</th><th>Details</th></tr>
    <tr><td>MCU</td><td>ESP32 DevKit V1</td><td>Arduino C++, 240MHz dual-core</td></tr>
    <tr><td>Sensors</td><td>DHT22 x2, MQ-137, YF-S201, ZMPT101B</td><td>Temp/Humidity, NH3, Water Flow, Voltage</td></tr>
    <tr><td>Communication</td><td>WiFi + GSM (SIM800L)</td><td>HTTP + SMS fallback</td></tr>
    <tr><td>Backend DB</td><td>PostgreSQL</td><td>Row-Level Security (RLS), 69 tables</td></tr>
    <tr><td>Backend Functions</td><td>Deno Edge Functions</td><td>19 functions deployed</td></tr>
    <tr><td>Frontend</td><td>React 18 + TypeScript 5</td><td>Vite 5 build system</td></tr>
    <tr><td>UI Library</td><td>shadcn/ui + Tailwind CSS v3</td><td>Bengali (Nikosh), dark theme</td></tr>
    <tr><td>Mobile</td><td>PWA + Capacitor 8</td><td>iOS/Android native wrapper</td></tr></table>

    <h2>3. Hardware Layer — GPIO Pin Mapping</h2>
    <h3>3.1 Relay Pin Mapping (8-Channel)</h3>
    <table><tr><th>Relay</th><th>GPIO</th><th>Device</th><th>Logic</th></tr>
    <tr><td>IN1</td><td>25</td><td>Exhaust Fan</td><td>HSI-based speed control</td></tr>
    <tr><td>IN2</td><td>26</td><td>Ceiling Fan</td><td>ON > 26°C / OFF < 22°C</td></tr>
    <tr><td>IN3</td><td>27</td><td>Light</td><td>Schedule-based + manual</td></tr>
    <tr><td>IN4</td><td>14</td><td>Heater</td><td>ON < 20°C / OFF > 24°C + cooldown</td></tr>
    <tr><td>IN5</td><td>12</td><td>Fogger</td><td>Temp > 32°C & Humidity < 85%</td></tr>
    <tr><td>IN6</td><td>13</td><td>Alarm/Buzzer</td><td>Emergency alerts</td></tr>
    <tr><td>IN7</td><td>15</td><td>Sprinkler</td><td>HSI > 80 / Stop < 75</td></tr>
    <tr><td>IN8</td><td>33</td><td>Circulation Fan</td><td>Age-based airflow</td></tr></table>

    <h3>3.2 Sensor Pin Mapping</h3>
    <table><tr><th>Sensor</th><th>GPIO</th><th>Power</th><th>Notes</th></tr>
    <tr><td>DHT22 #1</td><td>4</td><td>3.3V</td><td>10K pull-up required</td></tr>
    <tr><td>DHT22 #2</td><td>16</td><td>3.3V</td><td>10K pull-up required</td></tr>
    <tr><td>MQ-137 (NH3)</td><td>34 (ADC)</td><td>5V (VIN)</td><td>24-hour pre-heat mandatory</td></tr>
    <tr><td>YF-S201 (Water)</td><td>18</td><td>5V</td><td>Interrupt-driven pulse count</td></tr>
    <tr><td>ZMPT101B (Voltage)</td><td>35 (ADC)</td><td>5V</td><td>AC voltage monitoring</td></tr>
    <tr><td>GSM SIM800L TX/RX</td><td>23/19</td><td>-</td><td>Serial communication</td></tr></table>

    <div class="page-break"></div>
    <h2>4. Firmware Architecture — 8-State Machine</h2>
    <table><tr><th>State</th><th>Duration</th><th>Behavior</th></tr>
    <tr><td>BOOT</td><td>0-30 sec</td><td>Sequential relay test (2s gap each). No automation.</td></tr>
    <tr><td>BOOT_PURGE</td><td>30s - 3 min</td><td>INV-6: Forced ventilation. Fan ON, heater locked.</td></tr>
    <tr><td>NORMAL</td><td>Continuous</td><td>Full automation engine active.</td></tr>
    <tr><td>WARNING</td><td>Variable</td><td>HSI elevated. Fan speed increased. Alert sent.</td></tr>
    <tr><td>DANGER</td><td>Variable</td><td>HSI critical. All fans HIGH. Fogger/sprinkler active.</td></tr>
    <tr><td>EMERGENCY (ESM)</td><td>Until stable 2 min</td><td>Temp > 38°C or NH3 > 50ppm. All fans max, alarm ON, SMS sent.</td></tr>
    <tr><td>SENSOR_FAIL</td><td>Until recovery</td><td>Sensor loss > 90s. Exhaust Fan ON, heater OFF, alarm ON.</td></tr>
    <tr><td>OFFLINE</td><td>After 60s no cloud</td><td>Local NVS settings used. Autonomous mode.</td></tr></table>

    <h3>Main Loop Timing</h3>
    <table><tr><th>Task</th><th>Interval</th><th>Function</th></tr>
    <tr><td>Safety Arbiter</td><td>500ms</td><td>Checks all 8 invariants</td></tr>
    <tr><td>Sensor Read</td><td>2 sec</td><td>DHT22 + MQ-137 + Water Flow</td></tr>
    <tr><td>Automation Engine</td><td>5 sec</td><td>HSI calculation + relay decisions</td></tr>
    <tr><td>Cloud Sync</td><td>15 sec</td><td>POST sensor data to edge function</td></tr>
    <tr><td>Command Poll</td><td>5 sec</td><td>GET pending commands from cloud</td></tr>
    <tr><td>NVS Heartbeat</td><td>30 sec</td><td>Save timestamp for power outage detection</td></tr>
    <tr><td>Watchdog Feed</td><td>10 sec</td><td>Hardware WDT reset (8s timeout)</td></tr></table>

    <h2>5. Eight Safety Invariants</h2>
    <table><tr><th>INV</th><th>Name</th><th>Rule</th><th>Priority</th></tr>
    <tr><td>INV-1</td><td>Max Temp Override</td><td>Temp > 38°C → ALL fans ON immediately</td><td>CRITICAL</td></tr>
    <tr><td>INV-2</td><td>Heater-Vent Interlock</td><td>Heater ON → Fan cannot be turned OFF</td><td>CRITICAL</td></tr>
    <tr><td>INV-3</td><td>Relay Toggle Guard</td><td>60-second minimum gap between toggles</td><td>HIGH</td></tr>
    <tr><td>INV-4</td><td>Sensor Fail-Safe</td><td>No sensor 90s → SENSOR_FAIL (Exhaust ON, Heater OFF)</td><td>CRITICAL</td></tr>
    <tr><td>INV-5</td><td>Override Timeout</td><td>Manual override auto-expires after 20 min</td><td>HIGH</td></tr>
    <tr><td>INV-6</td><td>Boot Purge</td><td>5-minute forced ventilation after power recovery</td><td>HIGH</td></tr>
    <tr><td>INV-7</td><td>Heater Cooldown</td><td>5 min MAX ON → 2 min cooldown period</td><td>MEDIUM</td></tr>
    <tr><td>INV-8</td><td>GPIO Conflict Guard</td><td>Duplicate pin → BOOT HALT</td><td>CRITICAL</td></tr></table>

    <h2>6. Sensor Validation Layer (SVL)</h2>
    <table><tr><th>Stage</th><th>Method</th><th>Details</th></tr>
    <tr><td>1</td><td>Range Check</td><td>Temp: 0-60°C, Humidity: 10-100%, NH3: 0-500ppm</td></tr>
    <tr><td>2</td><td>Median Filter</td><td>5-sample window, buffer seeded on first valid read</td></tr>
    <tr><td>3</td><td>Spike Rejection</td><td>> 20% deviation from median → reject</td></tr>
    <tr><td>4</td><td>Rate Limiter</td><td>8°C/5sec max change rate</td></tr>
    <tr><td>5</td><td>Frozen Detection</td><td>Same value 2 min → stuck sensor alert</td></tr>
    <tr><td>6</td><td>Dual Sensor Cross-Check</td><td>Delta ≥ 3°C → alert + SMS, worst-case value used</td></tr>
    <tr><td>7</td><td>MQ-137 Warmup Guard</td><td>24-hour NH3 automation disabled during stabilization</td></tr>
    <tr><td>8</td><td>Sanity Range</td><td>T: 0-60°C, H: 10-100% — out of range → reject</td></tr></table>

    <div class="page-break"></div>
    <h2>7. Fail-Safe & Emergency Protocols</h2>
    <h3>7.1 Emergency Survival Mode (ESM v2.0)</h3>
    <ul>
    <li>Trigger: Temp > 38°C OR NH3 > 50ppm (sustained 45 seconds)</li>
    <li>Action: All fans ON (Exhaust + Ceiling + Circulation), heater OFF, alarm ON, GSM SMS sent</li>
    <li>Ventilation Cycle: 2 min ON / 2 min OFF (motor burnout prevention)</li>
    <li>Recovery: Sensors stable for 120 seconds continuously</li>
    <li>Note: ESM only triggers in life-threatening conditions. Even in winter, NH3 > 50ppm requires immediate ventilation.</li></ul>

    <h3>7.2 Power Recovery Purge</h3>
    <ul>
    <li>NVS heartbeat checked on boot, >3 min gap = power outage confirmed</li>
    <li>5-minute forced ventilation (INV-6)</li>
    <li>Cold-Shock Protection: < 24°C → 40s ON / 80s OFF cycle</li></ul>

    <h3>7.3 Offline Autonomous Mode</h3>
    <ul>
    <li>Activated after 60s without cloud connectivity</li>
    <li>NVS-backed offline buffer: 360 entries (6+ hours)</li>
    <li>Buffer persists across reboots via NVS save every 10 entries</li>
    <li>Full automation continues with last cached settings</li></ul>

    <h2>8. Manual Takeover Mode (Implemented)</h2>
    <ul>
    <li><strong>Master Override Switch:</strong> Single button disables ALL automation logic</li>
    <li><strong>Double Confirmation:</strong> Requires confirmation dialog + reason logging</li>
    <li><strong>Individual Device Control:</strong> Direct toggle for all 8 relay channels</li>
    <li><strong>Safety Guardrail:</strong> ESM invariants still active even in Manual Mode</li>
    <li><strong>Auto-Reset Timer:</strong> 20-minute mandatory timeout → auto-reverts to Auto Mode (INV-5)</li>
    <li><strong>SMS Notification:</strong> Immediate SMS sent when Manual Mode is activated</li>
    <li><strong>Audit Log:</strong> All manual actions recorded with timestamp and user ID</li></ul>

    <h2>9. GSM/SMS Redundancy</h2>
    <table><tr><th>Event</th><th>SMS Trigger</th><th>Cooldown</th></tr>
    <tr><td>Emergency (ESM)</td><td>Temp > 38°C or NH3 > 50ppm</td><td>2 minutes</td></tr>
    <tr><td>Power Outage</td><td>ZMPT101B voltage drop detected</td><td>Immediate</td></tr>
    <tr><td>Power Restored</td><td>Voltage restored after outage</td><td>Immediate</td></tr>
    <tr><td>Sensor Failure</td><td>No sensor data > 90 seconds</td><td>5 minutes</td></tr>
    <tr><td>Cross-Validation Alert</td><td>DHT22 delta ≥ 3°C</td><td>10 minutes</td></tr>
    <tr><td>Manual Mode Activated</td><td>User switches to manual</td><td>Immediate</td></tr></table>

    <h2>10. Cloud Backend (19 Edge Functions)</h2>
    <table><tr><th>Function</th><th>Purpose</th><th>Trigger</th></tr>
    <tr><td>esp32-api</td><td>Device telemetry ingestion & command delivery</td><td>HTTP (ESP32 polls)</td></tr>
    <tr><td>automation-engine</td><td>HSI calculation, fan speed decisions</td><td>HTTP (periodic)</td></tr>
    <tr><td>safety-engine</td><td>Server-side safety invariant validation</td><td>HTTP (every 60s)</td></tr>
    <tr><td>emergency-webhook</td><td>External webhook for critical alerts</td><td>Database trigger</td></tr>
    <tr><td>fetch-weather</td><td>External weather data for predictive cooling</td><td>Scheduled</td></tr>
    <tr><td>daily-farm-report</td><td>Auto-generated daily summary</td><td>Scheduled (pg_cron)</td></tr>
    <tr><td>send-push-notification</td><td>Web Push / FCM notifications</td><td>Event-driven</td></tr>
    <tr><td>push-public-key</td><td>VAPID public key distribution</td><td>HTTP</td></tr>
    <tr><td>ota-firmware</td><td>Firmware update management</td><td>Admin-triggered</td></tr>
    <tr><td>health-score</td><td>Farm health scoring algorithm</td><td>On-demand</td></tr>
    <tr><td>heat-risk</td><td>Predictive heat stress analysis</td><td>Periodic</td></tr>
    <tr><td>water-trend</td><td>Water consumption anomaly detection</td><td>Periodic</td></tr>
    <tr><td>export-data</td><td>CSV/Excel data export</td><td>User-triggered</td></tr>
    <tr><td>notification-escalation</td><td>Alert priority escalation</td><td>Event-driven</td></tr>
    <tr><td>schedule-notifier</td><td>Schedule-based automation</td><td>Cron</td></tr>
    <tr><td>lookup-login-identifier</td><td>Phone/email login lookup</td><td>Auth flow</td></tr>
    <tr><td>mode-profile</td><td>Automation mode profile resolution</td><td>HTTP</td></tr>
    <tr><td>admin-delete-user</td><td>Super-admin user removal</td><td>Admin-triggered</td></tr>
    <tr><td>device-monitor</td><td>Device health & online status tracking</td><td>Periodic</td></tr></table>

    <h2>10.1 Multi-Tenant & Team Management (NEW)</h2>
    <table><tr><th>Component</th><th>Purpose</th><th>Details</th></tr>
    <tr><td>farms.owner_id</td><td>Farm owner identity</td><td>Original creator</td></tr>
    <tr><td>farm_members</td><td>Multi-user farm access</td><td>role: owner / member / labor</td></tr>
    <tr><td>user_can_access_farm()</td><td>RLS gate function</td><td>SECURITY DEFINER</td></tr>
    <tr><td>Labor Invite Code</td><td>Auto-membership on signup</td><td>Owner ID → 6-char code → join</td></tr>
    <tr><td>UserRoleManager UI</td><td>Settings → Team Management tab</td><td>Code generation + member list</td></tr></table>

    <h2>10.2 Settings Persistence (NEW)</h2>
    <table><tr><th>Setting</th><th>Table</th><th>Columns</th></tr>
    <tr><td>Farm Setup</td><td>farm_settings</td><td>farm_size, season_override, profile_override</td></tr>
    <tr><td>HSI Thresholds</td><td>farm_settings</td><td>hsi_mild/moderate/severe/emergency</td></tr>
    <tr><td>Fan Speed Bands</td><td>farm_settings</td><td>fan_low/medium/high_temp_min/max</td></tr>
    <tr><td>Calibration Offsets</td><td>device_calibration</td><td>temp/humidity/ammonia offset columns</td></tr>
    <tr><td>Op Preferences</td><td>advanced_automation_settings</td><td>5 channel preferences (low/auto/high)</td></tr>
    <tr><td>Live Modifier</td><td>useAdvancedAutomation hook</td><td>applyPreferences() — soft threshold nudge</td></tr></table>

    <h2>11. OTA Firmware Management</h2>
    <table><tr><th>Feature</th><th>Details</th></tr>
    <tr><td>Safety Gate</td><td>10-minute stable environment required before update</td></tr>
    <tr><td>Staged Rollout</td><td>5% → 25% → 100% with soak periods</td></tr>
    <tr><td>Rollback</td><td>Automatic rollback if health check fails post-update</td></tr>
    <tr><td>Dual Partition</td><td>ESP32 OTA partition scheme — always has fallback</td></tr></table>

    <h2>12. Data Retention Policy</h2>
    <table><tr><th>Data Type</th><th>Retention</th><th>Method</th></tr>
    <tr><td>Audit Logs</td><td>90 days</td><td>pg_cron auto-cleanup</td></tr>
    <tr><td>Safety Timeline</td><td>7 days</td><td>pg_cron auto-cleanup</td></tr>
    <tr><td>Daily Summary</td><td>365 days</td><td>pg_cron auto-cleanup</td></tr>
    <tr><td>Sensor Logs</td><td>30 days</td><td>pg_cron auto-cleanup</td></tr>
    <tr><td>Emergency Events</td><td>Permanent</td><td>Never deleted</td></tr></table>

    <h2>13. Security Model</h2>
    <ul>
    <li>RLS Policies — সব টেবিলে Row Level Security</li>
    <li>Device Token Auth — x-device-token per-device isolation</li>
    <li>Override Safety Band — 26-35°C সীমার বাইরে reject</li>
    <li>Service Role Keys — Edge functions-এ, client-এ না</li>
    <li>Audit Trail — প্রতিটি critical action logged</li>
    <li>RBAC — Owner / Member / Labor / Super Admin roles</li></ul>

    <h2>14. Deployment Checklist</h2>
    <ul>
    <li>☐ WIFI_SSID ও WIFI_PASSWORD সেট করুন</li>
    <li>☐ DEVICE_TOKEN, SHED_ID, FARM_ID সেট করুন</li>
    <li>☐ ১২V ২A অ্যাডাপ্টার + ১০০০μF ক্যাপাসিটর</li>
    <li>☐ DHT22 সেন্সর ১-১.৫ মিটার উচ্চতায়</li>
    <li>☐ MQ-137 এ ২৪ ঘণ্টা প্রি-হিট</li>
    <li>☐ Arduino IDE-তে কোড আপলোড</li>
    <li>☐ Serial Monitor-এ BOOT → NORMAL নিশ্চিত</li>
    <li>☐ ফোন নম্বর সেটিংসে যোগ করুন</li>
    <li>☐ UPS/IPS ESP32 ও রাউটারে সংযুক্ত করুন</li>
    <li>☐ ম্যানুয়াল বাইপাস সুইচ Exhaust Fan-এ ইনস্টল করুন</li></ul>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Nexiot Labs · FarmEye Automation Platform — Smart Poultry Farm Automation System</p>
      <p>Confidential Technical Document | v8.0.0 Industrial Grade</p>
    </div></body></html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};
