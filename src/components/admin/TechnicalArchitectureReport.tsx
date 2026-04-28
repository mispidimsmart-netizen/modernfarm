import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, CheckCircle, Cpu, Shield, Thermometer, Radio, Server, HardDrive, Lock, Smartphone, Zap, Database, Wifi, Settings, BarChart3, Hand, MessageSquare, Trash2, AlertTriangle } from 'lucide-react';

const handleDownloadPDF = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>FarmEye Technical Architecture v8.0.0</title>
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
    <p class="subtitle">18 Edge Functions | 67 DB Tables | Multi-Tenant | Date: ${new Date().toLocaleDateString('bn-BD')}</p>

    <h2>1. System Overview — 6-Layer Architecture</h2>
    <table><tr><th>Layer</th><th>Component</th><th>Role</th></tr>
    <tr><td>Layer 1 (Hardware)</td><td>ESP32 + Sensors + 8-Channel Relay</td><td>Source of Truth for all relay states. Local safety decisions. Offline-capable.</td></tr>
    <tr><td>Layer 2 (Safety)</td><td>Safety Arbiter (500ms loop)</td><td>8 Invariants enforced every 500ms. Cannot be overridden.</td></tr>
    <tr><td>Layer 3 (Automation)</td><td>Local Automation Engine</td><td>HSI calculation, fan speed, heater control, fogger cycling.</td></tr>
    <tr><td>Layer 4 (Communication)</td><td>WiFi + GSM SIM800L</td><td>Cloud sync + SMS fallback. Offline buffer 360 entries.</td></tr>
    <tr><td>Layer 5 (Backend)</td><td>Edge Functions (Deno/TypeScript)</td><td>15+ functions: automation, safety, notifications, OTA.</td></tr>
    <tr><td>Layer 6 (Frontend)</td><td>React 18 PWA + Capacitor</td><td>Read-only monitoring. Manual override (with timeout).</td></tr></table>
    <p><strong>Key Principle:</strong> Hardware-as-Source-of-Truth. ESP32 makes all final relay decisions.</p>

    <h2>2. Technology Stack</h2>
    <table><tr><th>Layer</th><th>Technology</th><th>Details</th></tr>
    <tr><td>MCU</td><td>ESP32 DevKit V1</td><td>Arduino C++, 240MHz dual-core</td></tr>
    <tr><td>Sensors</td><td>DHT22 x2, MQ-137, YF-S201, ZMPT101B</td><td>Temp/Humidity, NH3, Water Flow, Voltage</td></tr>
    <tr><td>Communication</td><td>WiFi + GSM (SIM800L)</td><td>HTTP + SMS fallback</td></tr>
    <tr><td>Backend DB</td><td>PostgreSQL</td><td>Row-Level Security (RLS), 67 tables</td></tr>
    <tr><td>Backend Functions</td><td>Deno Edge Functions</td><td>18 functions deployed</td></tr>
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
    <tr><td>YF-S201 (Water)</td><td>17</td><td>5V</td><td>Interrupt-driven pulse count</td></tr>
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

    <h2>8. Manual Takeover Mode (Proposed)</h2>
    <ul>
    <li><strong>Master Override Switch:</strong> Single button disables ALL automation logic</li>
    <li><strong>Double Confirmation:</strong> Requires confirmation dialog + reason logging</li>
    <li><strong>Individual Device Control:</strong> Direct toggle for all 8 relay channels</li>
    <li><strong>Safety Guardrail:</strong> ESM invariants still active even in Manual Mode</li>
    <li><strong>Auto-Reset Timer:</strong> 60-minute mandatory timeout → auto-reverts to Auto Mode</li>
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

    <h2>10. Cloud Backend (18 Edge Functions)</h2>
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
    <tr><td>admin-delete-user</td><td>Super-admin user removal</td><td>Admin-triggered</td></tr></table>

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
    <li>RBAC — Viewer / Farmer / Admin roles</li></ul>

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
      <p>© ${new Date().getFullYear()} FarmEye — Smart Poultry Farm Automation System | Developed by MonirIoT</p>
      <p>Confidential Technical Document | v8.0.0 Industrial Grade</p>
    </div></body></html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

interface ArchSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function ArchSection({ icon, title, children }: ArchSectionProps) {
  return (
    <Card className="bg-slate-800/50 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-white">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm">{children}</CardContent>
    </Card>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>{headers.map((h, i) => <th key={i} className="border border-white/10 bg-slate-700/50 text-slate-200 px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-700/20'}>
              {row.map((cell, j) => <td key={j} className="border border-white/10 text-slate-300 px-2 py-1.5">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TechnicalArchitectureReport() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/30 border-blue-500/20">
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-200">🏗️ Technical Architecture & System Documentation</h2>
              <p className="text-blue-400/80 text-sm mt-1">Version 8.2.0 | Industrial Grade | 18 Edge Functions | 67 Tables | Score: 100/100</p>
            </div>
            <Button onClick={handleDownloadPDF} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700">
              <Download className="w-4 h-4 mr-2" />
              PDF ডাউনলোড
            </Button>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="grid gap-4 md:grid-cols-2">
          {/* 1. System Overview - 6 Layer */}
          <ArchSection icon={<BarChart3 className="w-5 h-5 text-blue-400" />} title="১. 6-Layer Architecture">
            <DataTable
              headers={['Layer', 'Component', 'Role']}
              rows={[
                ['L1 (Hardware)', 'ESP32 + Sensors + 8-Ch Relay', 'Source of Truth. Local safety. Offline.'],
                ['L2 (Safety)', 'Safety Arbiter (500ms)', '8 Invariants enforced. Cannot override.'],
                ['L3 (Automation)', 'Local Automation Engine', 'HSI, fan speed, heater, fogger.'],
                ['L4 (Comms)', 'WiFi + GSM SIM800L', 'Cloud sync + SMS. 360 offline buffer.'],
                ['L5 (Backend)', 'Edge Functions (Deno)', '15+ functions. Safety, OTA, reports.'],
                ['L6 (Frontend)', 'React 18 PWA + Capacitor', 'Dashboard. Manual override (20min).'],
              ]}
            />
            <p className="text-slate-400 mt-2 text-xs">🔑 <strong className="text-slate-200">Key:</strong> Hardware-as-Source-of-Truth — ESP32 makes all final relay decisions.</p>
          </ArchSection>

          {/* 2. Tech Stack */}
          <ArchSection icon={<Settings className="w-5 h-5 text-violet-400" />} title="২. Technology Stack">
            <DataTable
              headers={['Layer', 'Technology', 'Details']}
              rows={[
                ['MCU', 'ESP32 DevKit V1', 'Arduino C++, 240MHz'],
                ['Sensors', 'DHT22×2, MQ-137, YF-S201', 'Temp, NH3, Water, Voltage'],
                ['Communication', 'WiFi + GSM SIM800L', 'HTTP + SMS fallback'],
                ['Backend', 'PostgreSQL + Deno Edge', '15+ functions, 19 tables, RLS'],
                ['Frontend', 'React 18 + TypeScript 5', 'Vite 5, shadcn/ui'],
                ['Mobile', 'PWA + Capacitor 8', 'iOS/Android wrapper'],
              ]}
            />
          </ArchSection>

          {/* 3. GPIO Pin Mapping */}
          <ArchSection icon={<HardDrive className="w-5 h-5 text-teal-400" />} title="৩. Hardware — Relay Pin Mapping">
            <DataTable
              headers={['Relay', 'GPIO', 'Device', 'Logic']}
              rows={[
                ['IN1', '25', 'Exhaust Fan', 'HSI-based speed'],
                ['IN2', '26', 'Ceiling Fan', 'ON>26°C / OFF<22°C'],
                ['IN3', '27', 'Light', 'Schedule + manual'],
                ['IN4', '14', 'Heater', 'ON<20°C / OFF>24°C'],
                ['IN5', '12', 'Fogger', 'T>32°C & H<85%'],
                ['IN6', '13', 'Alarm/Buzzer', 'Emergency alerts'],
                ['IN7', '15', 'Sprinkler', 'HSI>80 / Stop<75'],
                ['IN8', '33', 'Circulation Fan', 'Age-based airflow'],
              ]}
            />
          </ArchSection>

          {/* Sensor Pins */}
          <ArchSection icon={<Thermometer className="w-5 h-5 text-orange-400" />} title="৩.২ Sensor Pin Mapping">
            <DataTable
              headers={['Sensor', 'GPIO', 'Power', 'Notes']}
              rows={[
                ['DHT22 #1', '4', '3.3V', '10K pull-up'],
                ['DHT22 #2', '16', '3.3V', '10K pull-up'],
                ['MQ-137 (NH3)', '34 (ADC)', '5V', '24h pre-heat'],
                ['YF-S201 (Water)', '17', '5V', 'Interrupt-driven'],
                ['ZMPT101B (Voltage)', '35 (ADC)', '5V', 'AC monitoring'],
                ['GSM SIM800L', '23/19', '-', 'Serial TX/RX'],
              ]}
            />
          </ArchSection>

          {/* 4. Firmware State Machine - 8 States */}
          <ArchSection icon={<Cpu className="w-5 h-5 text-cyan-400" />} title="৪. 8-State Firmware Machine">
            <DataTable
              headers={['State', 'Duration', 'Behavior']}
              rows={[
                ['BOOT', '0-30 sec', 'Sequential relay test (2s gap)'],
                ['BOOT_PURGE', '30s-5 min', 'INV-6: Forced ventilation'],
                ['NORMAL', 'Continuous', 'Full automation active'],
                ['WARNING', 'Variable', 'HSI elevated. Fan speed up.'],
                ['DANGER', 'Variable', 'HSI critical. All fans HIGH.'],
                ['EMERGENCY', 'Until stable 2m', 'All fans max, alarm ON, SMS'],
                ['SENSOR_FAIL', 'Until recovery', 'Exhaust ON, Heater OFF, Alarm'],
                ['OFFLINE', 'After 60s', 'NVS autonomous mode'],
              ]}
            />
          </ArchSection>

          {/* Main Loop Timing */}
          <ArchSection icon={<Zap className="w-5 h-5 text-yellow-400" />} title="৪.২ Main Loop Timing">
            <DataTable
              headers={['Task', 'Interval', 'Function']}
              rows={[
                ['Safety Arbiter', '500ms', 'Checks all 8 invariants'],
                ['Sensor Read', '2 sec', 'DHT22 + MQ-137 + Water'],
                ['Automation Engine', '5 sec', 'HSI + relay decisions'],
                ['Cloud Sync', '15 sec', 'POST telemetry data'],
                ['Command Poll', '5 sec', 'GET pending commands'],
                ['NVS Heartbeat', '30 sec', 'Power outage detection'],
                ['Watchdog Feed', '10 sec', 'Hardware WDT (8s)'],
              ]}
            />
          </ArchSection>

          {/* 5. Safety Invariants */}
          <ArchSection icon={<Shield className="w-5 h-5 text-amber-400" />} title="৫. Eight Safety Invariants">
            <DataTable
              headers={['INV', 'Name', 'Rule', 'Priority']}
              rows={[
                ['INV-1', 'Max Temp Override', '>38°C → ALL fans ON', 'CRITICAL'],
                ['INV-2', 'Heater-Vent Interlock', 'Heater ON → Fan stays ON', 'CRITICAL'],
                ['INV-3', 'Relay Toggle Guard', '60s minimum gap', 'HIGH'],
                ['INV-4', 'Sensor Fail-Safe', 'No data 90s → SENSOR_FAIL', 'CRITICAL'],
                ['INV-5', 'Override Timeout', '20 min auto-expire', 'HIGH'],
                ['INV-6', 'Boot Purge', '5-min forced ventilation', 'HIGH'],
                ['INV-7', 'Heater Cooldown', '5-min MAX → 2-min cool', 'MEDIUM'],
                ['INV-8', 'GPIO Conflict', 'Duplicate pin → HALT', 'CRITICAL'],
              ]}
            />
          </ArchSection>

          {/* 6. SVL */}
          <ArchSection icon={<Thermometer className="w-5 h-5 text-green-400" />} title="৬. Sensor Validation Layer (SVL)">
            <DataTable
              headers={['Stage', 'Method', 'Details']}
              rows={[
                ['1', 'Range Check', 'T: 0~60°C, H: 10-100%'],
                ['2', 'Median Filter', '5-sample window'],
                ['3', 'Spike Rejection', '>20% deviation → reject'],
                ['4', 'Rate Limiter', '8°C/5sec max change'],
                ['5', 'Frozen Detection', 'Same value 2 min'],
                ['6', 'Dual Cross-Check', 'Δ≥3°C → SMS alert, worst-case'],
                ['7', 'MQ-137 Warmup', '24h automation disabled'],
                ['8', 'Sanity Range', 'Out of range → reject'],
              ]}
            />
          </ArchSection>

          {/* 7. Emergency */}
          <ArchSection icon={<Radio className="w-5 h-5 text-red-400" />} title="৭. Fail-Safe & Emergency">
            <div className="space-y-3 text-slate-300">
              <div>
                <p className="font-semibold text-slate-200 text-xs">ESM v2.0 (Emergency Survival Mode)</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-400">
                  <li>Trigger: Temp &gt; 38°C OR NH3 &gt; 50ppm (sustained 45s)</li>
                  <li>All fans ON (Exhaust+Ceiling+Circulation), heater OFF, alarm ON, SMS</li>
                  <li>Ventilation: 2 min ON / 2 min OFF cycle</li>
                  <li>Recovery: 120s stable sensors required</li>
                  <li>Winter note: NH3 &gt; 50ppm is lethal — ventilation still required</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-200 text-xs">Power Recovery Purge</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-400">
                  <li>NVS heartbeat &gt;3 min gap = outage confirmed</li>
                  <li>5-min forced ventilation (INV-6)</li>
                  <li>Cold-Shock: &lt;24°C → 40s ON / 80s OFF</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-200 text-xs">Offline Autonomous Mode</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-400">
                  <li>After 60s without cloud → autonomous</li>
                  <li>NVS buffer: 360 entries (6+ hours)</li>
                  <li>Full automation continues with cached settings</li>
                </ul>
              </div>
            </div>
          </ArchSection>

          {/* 8. Manual Takeover Mode */}
          <ArchSection icon={<Hand className="w-5 h-5 text-amber-400" />} title="৮. Manual Takeover Mode">
            <div className="space-y-2">
              {[
                { label: 'Master Override Switch', value: 'Single button disables ALL automation' },
                { label: 'Double Confirmation', value: 'Dialog + reason logging required' },
                { label: 'Individual Control', value: 'Direct toggle for all 8 relay channels' },
                { label: 'Safety Guardrail', value: 'ESM invariants still active in Manual Mode' },
                { label: 'Auto-Reset Timer', value: '60-min timeout → auto-reverts to Auto' },
                { label: 'SMS Alert', value: 'Immediate SMS when Manual Mode activated' },
                { label: 'Audit Log', value: 'All actions recorded with timestamp + user ID' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300 text-xs"><strong className="text-slate-200">{item.label}:</strong> {item.value}</span>
                </div>
              ))}
            </div>
          </ArchSection>

          {/* 9. GSM/SMS */}
          <ArchSection icon={<MessageSquare className="w-5 h-5 text-green-400" />} title="৯. GSM/SMS Redundancy">
            <DataTable
              headers={['Event', 'SMS Trigger', 'Cooldown']}
              rows={[
                ['Emergency (ESM)', 'Temp>38°C / NH3>50ppm', '2 min'],
                ['Power Outage', 'Voltage drop detected', 'Immediate'],
                ['Power Restored', 'Voltage restored', 'Immediate'],
                ['Sensor Failure', 'No data > 90 sec', '5 min'],
                ['Cross-Validation', 'DHT22 Δ ≥ 3°C', '10 min'],
                ['Manual Mode', 'User switches to manual', 'Immediate'],
              ]}
            />
          </ArchSection>

          {/* 10. Edge Functions */}
          <ArchSection icon={<Server className="w-5 h-5 text-violet-400" />} title="১০. Cloud Edge Functions (15+)">
            <DataTable
              headers={['Function', 'Purpose', 'Trigger']}
              rows={[
                ['esp32-api', 'Telemetry & commands', 'HTTP'],
                ['automation-engine', 'HSI, fan speed', 'Periodic'],
                ['safety-engine', 'Server-side safety', '60s sync'],
                ['emergency-webhook', 'Critical alerts', 'DB trigger'],
                ['fetch-weather', 'Predictive cooling', 'Scheduled'],
                ['daily-farm-report', 'Daily summary', 'pg_cron'],
                ['send-push-notification', 'Web Push/FCM', 'Event'],
                ['ota-firmware', 'Firmware updates', 'Admin'],
                ['health-score', 'Farm health score', 'On-demand'],
                ['heat-risk', 'Heat stress analysis', 'Periodic'],
                ['water-trend', 'Water anomaly detect', 'Periodic'],
                ['export-data', 'CSV/Excel export', 'User'],
                ['notification-escalation', 'Alert escalation', 'Event'],
                ['schedule-notifier', 'Schedule automation', 'Cron'],
                ['lookup-login-identifier', 'Login lookup', 'Auth'],
              ]}
            />
          </ArchSection>

          {/* 11. OTA */}
          <ArchSection icon={<Wifi className="w-5 h-5 text-emerald-400" />} title="১১. OTA Firmware Management">
            <div className="space-y-2">
              {[
                { label: 'Safety Gate', value: '10-minute stable environment required' },
                { label: 'Staged Rollout', value: '5% → 25% → 100% with soak periods' },
                { label: 'Rollback', value: 'Auto rollback if health check fails' },
                { label: 'Dual Partition', value: 'ESP32 OTA partition — always has fallback' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300 text-xs"><strong className="text-slate-200">{item.label}:</strong> {item.value}</span>
                </div>
              ))}
            </div>
          </ArchSection>

          {/* 12. Data Retention */}
          <ArchSection icon={<Trash2 className="w-5 h-5 text-orange-400" />} title="১২. Data Retention Policy">
            <DataTable
              headers={['Data Type', 'Retention', 'Method']}
              rows={[
                ['Audit Logs', '90 days', 'pg_cron auto-cleanup'],
                ['Safety Timeline', '7 days', 'pg_cron auto-cleanup'],
                ['Daily Summary', '365 days', 'pg_cron auto-cleanup'],
                ['Sensor Logs', '30 days', 'pg_cron auto-cleanup'],
                ['Emergency Events', 'Permanent', 'Never deleted'],
              ]}
            />
          </ArchSection>

          {/* 13. Security */}
          <ArchSection icon={<Lock className="w-5 h-5 text-rose-400" />} title="১৩. Security & Database">
            <div className="space-y-2">
              {[
                'RLS Policies — সব টেবিলে Row Level Security',
                'Device Token Auth — x-device-token per-device isolation',
                'Override Safety Band — 26-35°C সীমার বাইরে reject',
                'Service Role Keys — Edge functions-এ, client-এ না',
                'Audit Trail — প্রতিটি critical action logged',
                'RBAC — Viewer / Farmer / Admin roles',
                'Audit Cleanup — 90-day auto-cleanup via pg_cron',
                '19+ Tables — Full schema with foreign keys',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300 text-xs">{item}</span>
                </div>
              ))}
            </div>
          </ArchSection>

          {/* 14. Deployment Checklist */}
          <ArchSection icon={<AlertTriangle className="w-5 h-5 text-blue-400" />} title="১৪. Deployment Checklist">
            <div className="space-y-2">
              {[
                'WIFI_SSID ও WIFI_PASSWORD সেট করুন',
                'DEVICE_TOKEN, SHED_ID, FARM_ID সেট করুন',
                '১২V ২A অ্যাডাপ্টার + ১০০০μF ক্যাপাসিটর',
                'DHT22 সেন্সর ১-১.৫ মিটার উচ্চতায়',
                'MQ-137 এ ২৪ ঘণ্টা প্রি-হিট',
                'Arduino IDE-তে কোড আপলোড',
                'Serial Monitor-এ BOOT → NORMAL নিশ্চিত',
                'ফোন নম্বর সেটিংসে যোগ করুন',
                'UPS/IPS ESP32 ও রাউটারে সংযুক্ত',
                'ম্যানুয়াল বাইপাস সুইচ Exhaust Fan-এ ইনস্টল',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-blue-400 text-xs">☐</span>
                  <span className="text-slate-300 text-xs">{item}</span>
                </div>
              ))}
            </div>
          </ArchSection>
        </div>
      </ScrollArea>
    </div>
  );
}
