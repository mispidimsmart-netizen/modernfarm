import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, CheckCircle, Cpu, Shield, Thermometer, Radio, Server, HardDrive, Lock, Smartphone, Zap, Database, Wifi, Settings, BarChart3 } from 'lucide-react';

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
    <p class="subtitle">Version 8.0.0 | Industrial Grade | Production-Ready | Score: 100/100</p>
    <p class="subtitle">Prepared for: Hardware Engineers & System Integrators | Date: ${new Date().toLocaleDateString('bn-BD')}</p>

    <h2>1. System Overview & Architecture</h2>
    <table><tr><th>Tier</th><th>Component</th><th>Role</th></tr>
    <tr><td>Tier 1 (Hardware)</td><td>ESP32 + Sensors + 8-Channel Relay</td><td>Source of Truth for all relay states. Local safety decisions. Offline-capable.</td></tr>
    <tr><td>Tier 2 (Backend)</td><td>Supabase Edge Functions (Deno/TypeScript)</td><td>Automation engine, safety validation, data persistence, push notifications.</td></tr>
    <tr><td>Tier 3 (Frontend)</td><td>React 18 PWA + Capacitor Mobile</td><td>Read-only monitoring dashboard. Manual override commands (with timeout).</td></tr></table>
    <p><strong>Key Principle:</strong> Hardware-as-Source-of-Truth. ESP32 makes all final relay decisions.</p>

    <h2>2. Technology Stack</h2>
    <table><tr><th>Layer</th><th>Technology</th><th>Details</th></tr>
    <tr><td>MCU</td><td>ESP32 DevKit V1</td><td>Arduino C++, 240MHz dual-core</td></tr>
    <tr><td>Sensors</td><td>DHT22 x2, MQ-137, YF-S201, ZMPT101B</td><td>Temp/Humidity, NH3, Water Flow, Voltage</td></tr>
    <tr><td>Communication</td><td>WiFi + GSM (SIM800L)</td><td>HTTP + SMS fallback</td></tr>
    <tr><td>Backend DB</td><td>PostgreSQL</td><td>Row-Level Security (RLS)</td></tr>
    <tr><td>Backend Functions</td><td>Deno Edge Functions</td><td>15+ functions deployed</td></tr>
    <tr><td>Frontend</td><td>React 18 + TypeScript 5</td><td>Vite 5 build system</td></tr>
    <tr><td>UI Library</td><td>shadcn/ui + Tailwind CSS v3</td><td>Responsive, dark mode</td></tr>
    <tr><td>Mobile</td><td>PWA + Capacitor 8</td><td>iOS/Android native wrapper</td></tr></table>

    <h2>3. Hardware Layer — GPIO Pin Mapping</h2>
    <h3>3.1 Relay Pin Mapping</h3>
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
    <h2>4. Firmware Architecture — State Machine</h2>
    <table><tr><th>State</th><th>Duration</th><th>Behavior</th></tr>
    <tr><td>BOOT</td><td>0-30 sec</td><td>Sequential relay test (2s gap each). No automation.</td></tr>
    <tr><td>BOOT_PURGE</td><td>30s - 3 min</td><td>INV-6: Forced ventilation. Fan ON, heater locked.</td></tr>
    <tr><td>NORMAL</td><td>Continuous</td><td>Full automation engine active.</td></tr>
    <tr><td>FAIL-SAFE</td><td>Until recovery</td><td>Sensor loss > 20s. Fan ON, heater OFF.</td></tr>
    <tr><td>EMERGENCY</td><td>Until stable 2 min</td><td>Temp > 38°C or NH3 > 50ppm. All fans max.</td></tr>
    <tr><td>OFFLINE</td><td>After 60s no cloud</td><td>Local NVS settings used. Autonomous mode.</td></tr></table>

    <h3>Main Loop Timing</h3>
    <table><tr><th>Task</th><th>Interval</th><th>Function</th></tr>
    <tr><td>Safety Arbiter</td><td>500ms</td><td>Checks all 8 invariants</td></tr>
    <tr><td>Sensor Read</td><td>2 sec</td><td>DHT22 + MQ-137 + Water Flow</td></tr>
    <tr><td>Automation Engine</td><td>5 sec</td><td>HSI calculation + relay decisions</td></tr>
    <tr><td>Cloud Sync</td><td>15 sec</td><td>POST sensor data to edge function</td></tr>
    <tr><td>Command Poll</td><td>5 sec</td><td>GET pending commands from cloud</td></tr>
    <tr><td>NVS Heartbeat</td><td>60 sec</td><td>Save timestamp for power outage detection</td></tr>
    <tr><td>Watchdog Feed</td><td>10 sec</td><td>Hardware WDT reset (8s timeout)</td></tr></table>

    <h2>5. Eight Safety Invariants</h2>
    <table><tr><th>INV</th><th>Name</th><th>Rule</th><th>Priority</th></tr>
    <tr><td>INV-1</td><td>Max Temp Override</td><td>Temp > 38°C → ALL fans ON immediately</td><td>CRITICAL</td></tr>
    <tr><td>INV-2</td><td>Heater-Vent Interlock</td><td>Heater ON → Fan cannot be turned OFF</td><td>CRITICAL</td></tr>
    <tr><td>INV-3</td><td>Relay Toggle Guard</td><td>5-second minimum gap between toggles</td><td>HIGH</td></tr>
    <tr><td>INV-4</td><td>Sensor Fail-Safe</td><td>No sensor 20s → Safe Mode (Fan ON, Heater OFF)</td><td>CRITICAL</td></tr>
    <tr><td>INV-5</td><td>Override Timeout</td><td>Manual override auto-expires after 20 min</td><td>HIGH</td></tr>
    <tr><td>INV-6</td><td>Boot Purge</td><td>3-minute forced ventilation after power recovery</td><td>HIGH</td></tr>
    <tr><td>INV-7</td><td>Heater Cooldown</td><td>Heater must pause every 2 minutes</td><td>MEDIUM</td></tr>
    <tr><td>INV-8</td><td>GPIO Conflict Guard</td><td>Duplicate pin → BOOT HALT</td><td>CRITICAL</td></tr></table>

    <h2>6. Sensor Validation Layer (SVL)</h2>
    <table><tr><th>Stage</th><th>Method</th><th>Details</th></tr>
    <tr><td>1</td><td>Range Check</td><td>Temp: -10 to 60°C, Humidity: 0-100%, NH3: 0-500ppm</td></tr>
    <tr><td>2</td><td>Median Filter</td><td>5-sample window, buffer seeded on first valid read</td></tr>
    <tr><td>3</td><td>Spike Rejection</td><td>> 20% deviation from median → reject</td></tr>
    <tr><td>4</td><td>Rate Limiter</td><td>8°C/5sec max change rate</td></tr>
    <tr><td>5</td><td>Frozen Detection</td><td>Same value 2 min → stuck sensor alert</td></tr>
    <tr><td>6</td><td>Dual Sensor Cross-Check</td><td>Delta ≥ 3°C → alert, worst-case value used</td></tr>
    <tr><td>7</td><td>MQ-137 Warmup Guard</td><td>24-hour NH3 automation disabled during stabilization</td></tr></table>

    <div class="page-break"></div>
    <h2>7. Fail-Safe & Emergency Protocols</h2>
    <h3>7.1 Emergency Survival Mode (ESM v2.0)</h3>
    <ul>
    <li>Trigger: Temp > 38°C OR NH3 > 50ppm</li>
    <li>Action: All fans ON, heater OFF, alarm ON, GSM SMS sent</li>
    <li>Ventilation Cycle: 2 min ON / 2 min OFF (motor burnout prevention)</li>
    <li>Recovery: Sensors stable for 120 seconds continuously</li></ul>

    <h3>7.2 Power Recovery Purge</h3>
    <ul>
    <li>NVS heartbeat checked on boot, >3 min gap = power outage confirmed</li>
    <li>3-minute forced ventilation (INV-6)</li>
    <li>Cold-Shock Protection: <24°C → 40s ON / 80s OFF cycle</li></ul>

    <h3>7.3 Offline Autonomous Mode</h3>
    <ul>
    <li>Activated after 60s without cloud connectivity</li>
    <li>NVS-backed offline buffer: 360 entries (6+ hours)</li>
    <li>Buffer persists across reboots via NVS save every 10 entries</li></ul>

    <h2>8. Cloud Backend (Edge Functions)</h2>
    <table><tr><th>Function</th><th>Purpose</th><th>Trigger</th></tr>
    <tr><td>esp32-api</td><td>Device telemetry ingestion & command delivery</td><td>HTTP (ESP32 polls)</td></tr>
    <tr><td>automation-engine</td><td>HSI calculation, fan speed decisions</td><td>HTTP (periodic)</td></tr>
    <tr><td>safety-engine</td><td>Safety invariant validation on server-side</td><td>HTTP (every 60s)</td></tr>
    <tr><td>emergency-webhook</td><td>External webhook for critical alerts</td><td>Database trigger</td></tr>
    <tr><td>fetch-weather</td><td>External weather data for predictive cooling</td><td>Scheduled</td></tr>
    <tr><td>daily-farm-report</td><td>Auto-generated daily summary</td><td>Scheduled (pg_cron)</td></tr>
    <tr><td>send-push-notification</td><td>Web Push / FCM notifications</td><td>Event-driven</td></tr>
    <tr><td>ota-firmware</td><td>Firmware update management</td><td>Admin-triggered</td></tr>
    <tr><td>health-score</td><td>Farm health scoring algorithm</td><td>On-demand</td></tr>
    <tr><td>heat-risk</td><td>Predictive heat stress analysis</td><td>Periodic</td></tr>
    <tr><td>water-trend</td><td>Water consumption anomaly detection</td><td>Periodic</td></tr>
    <tr><td>export-data</td><td>CSV/Excel data export</td><td>User-triggered</td></tr></table>

    <h2>9. OTA Firmware Management</h2>
    <table><tr><th>Feature</th><th>Details</th></tr>
    <tr><td>Safety Gate</td><td>10-minute stable environment required before update</td></tr>
    <tr><td>Staged Rollout</td><td>5% → 25% → 100% with soak periods</td></tr>
    <tr><td>Rollback</td><td>Automatic rollback if health check fails post-update</td></tr>
    <tr><td>Dual Partition</td><td>ESP32 OTA partition scheme — always has fallback</td></tr></table>

    <h2>10. Deployment Checklist</h2>
    <ul>
    <li>☐ WIFI_SSID ও WIFI_PASSWORD সেট করুন</li>
    <li>☐ DEVICE_TOKEN, SHED_ID, FARM_ID সেট করুন</li>
    <li>☐ ১২V ২A অ্যাডাপ্টার + ১০০০μF ক্যাপাসিটর</li>
    <li>☐ DHT22 সেন্সর ১-১.৫ মিটার উচ্চতায়</li>
    <li>☐ MQ-137 এ ২৪ ঘণ্টা প্রি-হিট</li>
    <li>☐ Arduino IDE-তে কোড আপলোড</li>
    <li>☐ Serial Monitor-এ BOOT → NORMAL নিশ্চিত</li>
    <li>☐ ফোন নম্বর সেটিংসে যোগ করুন</li></ul>

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
              <p className="text-blue-400/80 text-sm mt-1">Version 8.0.0 | Industrial Grade | Score: 100/100</p>
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
          {/* 1. System Overview */}
          <ArchSection icon={<BarChart3 className="w-5 h-5 text-blue-400" />} title="১. System Architecture">
            <DataTable
              headers={['Tier', 'Component', 'Role']}
              rows={[
                ['Tier 1 (Hardware)', 'ESP32 + Sensors + 8-Ch Relay', 'Source of Truth. Local safety. Offline-capable.'],
                ['Tier 2 (Backend)', 'Edge Functions (Deno)', 'Automation engine, safety validation, persistence.'],
                ['Tier 3 (Frontend)', 'React 18 PWA + Capacitor', 'Read-only dashboard. Manual override (20min).'],
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
                ['Backend', 'PostgreSQL + Deno Edge', '15+ functions, RLS'],
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

          {/* 4. Firmware State Machine */}
          <ArchSection icon={<Cpu className="w-5 h-5 text-cyan-400" />} title="৪. Firmware State Machine">
            <DataTable
              headers={['State', 'Duration', 'Behavior']}
              rows={[
                ['BOOT', '0-30 sec', 'Sequential relay test (2s gap)'],
                ['BOOT_PURGE', '30s-3 min', 'INV-6: Forced ventilation'],
                ['NORMAL', 'Continuous', 'Full automation active'],
                ['FAIL-SAFE', 'Until recovery', 'Fan ON, Heater OFF'],
                ['EMERGENCY', 'Until stable 2m', 'All fans max, alarm ON'],
                ['OFFLINE', 'After 60s no cloud', 'NVS autonomous mode'],
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
                ['NVS Heartbeat', '60 sec', 'Power outage detection'],
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
                ['INV-3', 'Relay Toggle Guard', '5s minimum gap', 'HIGH'],
                ['INV-4', 'Sensor Fail-Safe', 'No data 20s → Safe Mode', 'CRITICAL'],
                ['INV-5', 'Override Timeout', '20 min auto-expire', 'HIGH'],
                ['INV-6', 'Boot Purge', '3-min forced ventilation', 'HIGH'],
                ['INV-7', 'Heater Cooldown', '2-min max cycle', 'MEDIUM'],
                ['INV-8', 'GPIO Conflict', 'Duplicate pin → HALT', 'CRITICAL'],
              ]}
            />
          </ArchSection>

          {/* 6. SVL */}
          <ArchSection icon={<Thermometer className="w-5 h-5 text-green-400" />} title="৬. Sensor Validation Layer (SVL)">
            <DataTable
              headers={['Stage', 'Method', 'Details']}
              rows={[
                ['1', 'Range Check', 'T: -10~60°C, H: 0-100%'],
                ['2', 'Median Filter', '5-sample window'],
                ['3', 'Spike Rejection', '>20% deviation → reject'],
                ['4', 'Rate Limiter', '8°C/5sec max change'],
                ['5', 'Frozen Detection', 'Same value 2 min'],
                ['6', 'Dual Cross-Check', 'Δ≥3°C → alert, worst-case'],
                ['7', 'MQ-137 Warmup', '24h automation disabled'],
              ]}
            />
          </ArchSection>

          {/* 7. Emergency */}
          <ArchSection icon={<Radio className="w-5 h-5 text-red-400" />} title="৭. Fail-Safe & Emergency">
            <div className="space-y-3 text-slate-300">
              <div>
                <p className="font-semibold text-slate-200 text-xs">ESM v2.0</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-400">
                  <li>Trigger: Temp &gt; 38°C OR NH3 &gt; 50ppm</li>
                  <li>All fans ON, heater OFF, alarm ON, SMS sent</li>
                  <li>Ventilation: 2 min ON / 2 min OFF cycle</li>
                  <li>Recovery: 120s stable sensors required</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-200 text-xs">Power Recovery</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-400">
                  <li>NVS heartbeat &gt;3 min gap = outage confirmed</li>
                  <li>3-min forced ventilation (INV-6)</li>
                  <li>Cold-Shock: &lt;24°C → 40s ON / 80s OFF</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-200 text-xs">Offline Mode</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-400">
                  <li>After 60s without cloud → autonomous</li>
                  <li>NVS buffer: 360 entries (6+ hours)</li>
                </ul>
              </div>
            </div>
          </ArchSection>

          {/* 8. Edge Functions */}
          <ArchSection icon={<Server className="w-5 h-5 text-violet-400" />} title="৮. Cloud Edge Functions">
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
              ]}
            />
          </ArchSection>

          {/* 9. OTA */}
          <ArchSection icon={<Wifi className="w-5 h-5 text-emerald-400" />} title="৯. OTA Firmware Management">
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

          {/* Security */}
          <ArchSection icon={<Lock className="w-5 h-5 text-rose-400" />} title="১০. Security & Database">
            <div className="space-y-2">
              {[
                'RLS Policies — সব টেবিলে Row Level Security',
                'Device Token Auth — x-device-token per-device isolation',
                'Override Safety Band — 26-35°C সীমার বাইরে reject',
                'Service Role Keys — Edge functions-এ, client-এ না',
                'Audit Trail — প্রতিটি critical action logged',
                'Audit Cleanup — 90-day auto-cleanup via pg_cron',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
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
