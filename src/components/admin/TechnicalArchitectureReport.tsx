import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, CheckCircle, Cpu, Shield, Thermometer, Radio, Server, HardDrive, Lock, Zap, Wifi, Settings, BarChart3, Hand, MessageSquare, Trash2, AlertTriangle } from 'lucide-react';
import { CurrentAutomationStatusBanner } from './CurrentAutomationStatusBanner';
import { ArchSection, DataTable, BulletList } from './architecture/ArchPrimitives';
import { downloadTechnicalArchitecturePdf } from '@/lib/technicalArchitecturePdf';
import {
  LAYER_ARCHITECTURE_ROWS,
  TECH_STACK_ROWS,
  RELAY_PIN_ROWS,
  SENSOR_PIN_ROWS,
  STATE_MACHINE_ROWS,
  LOOP_TIMING_ROWS,
  SAFETY_INVARIANT_ROWS,
  SVL_ROWS,
  SMS_ROWS,
  EDGE_FUNCTION_ROWS,
  MULTI_TENANT_ROWS,
  SETTINGS_PERSISTENCE_ROWS,
  DATA_RETENTION_ROWS,
  MANUAL_TAKEOVER_ITEMS,
  OTA_ITEMS,
  SECURITY_ITEMS,
  DEPLOYMENT_CHECKLIST,
} from '@/data/technicalArchitectureTables';

export function TechnicalArchitectureReport() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/30 border-blue-500/20">
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-200">🏗️ Technical Architecture & System Documentation</h2>
              <p className="text-blue-400/80 text-sm mt-1">Version 8.2.0 | Industrial Grade | 19 Edge Functions | 69 Tables | Score: 100/100</p>
            </div>
            <Button onClick={downloadTechnicalArchitecturePdf} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700">
              <Download className="w-4 h-4 mr-2" />
              PDF ডাউনলোড
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phase 1-9 live automation status (single source of truth) */}
      <CurrentAutomationStatusBanner />

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="grid gap-4 md:grid-cols-2">
          <ArchSection icon={<BarChart3 className="w-5 h-5 text-blue-400" />} title="১. 6-Layer Architecture">
            <DataTable headers={['Layer', 'Component', 'Role']} rows={LAYER_ARCHITECTURE_ROWS} />
            <p className="text-slate-400 mt-2 text-xs">🔑 <strong className="text-slate-200">Key:</strong> Hardware-as-Source-of-Truth — ESP32 makes all final relay decisions.</p>
          </ArchSection>

          <ArchSection icon={<Settings className="w-5 h-5 text-violet-400" />} title="২. Technology Stack">
            <DataTable headers={['Layer', 'Technology', 'Details']} rows={TECH_STACK_ROWS} />
          </ArchSection>

          <ArchSection icon={<HardDrive className="w-5 h-5 text-teal-400" />} title="৩. Hardware — Relay Pin Mapping">
            <DataTable headers={['Relay', 'GPIO', 'Device', 'Logic']} rows={RELAY_PIN_ROWS} />
          </ArchSection>

          <ArchSection icon={<Thermometer className="w-5 h-5 text-orange-400" />} title="৩.২ Sensor Pin Mapping">
            <DataTable headers={['Sensor', 'GPIO', 'Power', 'Notes']} rows={SENSOR_PIN_ROWS} />
          </ArchSection>

          <ArchSection icon={<Cpu className="w-5 h-5 text-cyan-400" />} title="৪. 8-State Firmware Machine">
            <DataTable headers={['State', 'Duration', 'Behavior']} rows={STATE_MACHINE_ROWS} />
          </ArchSection>

          <ArchSection icon={<Zap className="w-5 h-5 text-yellow-400" />} title="৪.২ Main Loop Timing">
            <DataTable headers={['Task', 'Interval', 'Function']} rows={LOOP_TIMING_ROWS} />
          </ArchSection>

          <ArchSection icon={<Shield className="w-5 h-5 text-amber-400" />} title="৫. Eight Safety Invariants">
            <DataTable headers={['INV', 'Name', 'Rule', 'Priority']} rows={SAFETY_INVARIANT_ROWS} />
          </ArchSection>

          <ArchSection icon={<Thermometer className="w-5 h-5 text-green-400" />} title="৬. Sensor Validation Layer (SVL)">
            <DataTable headers={['Stage', 'Method', 'Details']} rows={SVL_ROWS} />
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

          <ArchSection icon={<Hand className="w-5 h-5 text-amber-400" />} title="৮. Manual Takeover Mode">
            <BulletList items={MANUAL_TAKEOVER_ITEMS} color="text-amber-400" />
          </ArchSection>

          <ArchSection icon={<MessageSquare className="w-5 h-5 text-green-400" />} title="৯. GSM/SMS Redundancy">
            <DataTable headers={['Event', 'SMS Trigger', 'Cooldown']} rows={SMS_ROWS} />
          </ArchSection>

          <ArchSection icon={<Server className="w-5 h-5 text-violet-400" />} title="১০. Cloud Edge Functions (19)">
            <DataTable headers={['Function', 'Purpose', 'Trigger']} rows={EDGE_FUNCTION_ROWS} />
          </ArchSection>

          <ArchSection icon={<Lock className="w-5 h-5 text-purple-400" />} title="১০.১ Multi-Tenant Team (NEW)">
            <DataTable headers={['Component', 'Purpose', 'Details']} rows={MULTI_TENANT_ROWS} />
          </ArchSection>

          <ArchSection icon={<Settings className="w-5 h-5 text-indigo-400" />} title="১০.২ Settings Persistence (NEW)">
            <DataTable headers={['Setting', 'Table', 'Columns']} rows={SETTINGS_PERSISTENCE_ROWS} />
          </ArchSection>

          <ArchSection icon={<Wifi className="w-5 h-5 text-emerald-400" />} title="১১. OTA Firmware Management">
            <BulletList items={OTA_ITEMS} color="text-emerald-400" />
          </ArchSection>

          <ArchSection icon={<Trash2 className="w-5 h-5 text-orange-400" />} title="১২. Data Retention Policy">
            <DataTable headers={['Data Type', 'Retention', 'Method']} rows={DATA_RETENTION_ROWS} />
          </ArchSection>

          <ArchSection icon={<Lock className="w-5 h-5 text-rose-400" />} title="১৩. Security & Database">
            <div className="space-y-2">
              {SECURITY_ITEMS.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300 text-xs">{item}</span>
                </div>
              ))}
            </div>
          </ArchSection>

          <ArchSection icon={<AlertTriangle className="w-5 h-5 text-blue-400" />} title="১৪. Deployment Checklist">
            <div className="space-y-2">
              {DEPLOYMENT_CHECKLIST.map((item, i) => (
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
