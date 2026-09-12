import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileJson, Shield, Sparkles } from 'lucide-react';

/**
 * Public OpenAPI 3.1 specification banner — placed at top of /api-docs.
 * Source of truth: /public/openapi.yaml
 */
const ENDPOINTS = [
  { path: '/esp32-api/sensor-data',  tag: 'ESP32',      method: 'POST', desc: 'Submit sensor reading (Phase 9 fields supported)' },
  { path: '/esp32-api/desired-state',tag: 'ESP32',      method: 'GET',  desc: 'Poll cloud-desired relay state' },
  { path: '/automation-engine',      tag: 'Automation', method: 'POST', desc: 'Server-side decision engine' },
  { path: '/safety-engine',          tag: 'Automation', method: 'POST', desc: '8 hardware invariants audit' },
  { path: '/ai-forecast',            tag: 'AI',         method: 'GET',  desc: '24-hour environment forecast' },
  { path: '/ai-forecast-7day',       tag: 'AI',         method: 'GET',  desc: '7-day farm health forecast (Phase A)' },
  { path: '/heat-risk',              tag: 'AI',         method: 'POST', desc: 'Heat-stress risk prediction' },
  { path: '/water-trend',            tag: 'AI',         method: 'POST', desc: 'Water consumption anomaly' },
  { path: '/report-export',          tag: 'Reports',    method: 'POST', desc: 'PDF / CSV / XLSX export' },
  { path: '/ota-firmware',           tag: 'ESP32',      method: 'GET',  desc: 'Signed OTA manifest' },
  { path: '/mqtt-publish',           tag: 'ESP32',      method: 'POST', desc: 'Realtime MQTT publish' },
  { path: '/gsm-sms-relay',          tag: 'ESP32',      method: 'POST', desc: 'SMS failover relay' },
];

const TAG_COLORS: Record<string, string> = {
  ESP32: 'border-blue-500 text-blue-600',
  Automation: 'border-purple-500 text-purple-600',
  AI: 'border-emerald-500 text-emerald-600',
  Reports: 'border-amber-500 text-amber-600',
};

export function OpenApiSpecCard() {
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <FileJson className="h-5 w-5 text-primary" />
          Public OpenAPI 3.1 Specification
          <Badge className="bg-primary text-[10px]">v10</Badge>
          <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            Phase A
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          সম্পূর্ণ machine-readable API spec ডাউনলোড করুন বা Swagger / Redoc-এ
          import করে interactive docs দেখুন।
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button variant="default" size="sm" asChild>
            <a href="/openapi.yaml" download>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              openapi.yaml
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://editor.swagger.io/?url=${encodeURIComponent('https://farmeye.pro.bd/openapi.yaml')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Swagger UI
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://redocly.github.io/redoc/?url=${encodeURIComponent('https://farmeye.pro.bd/openapi.yaml')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Redoc
            </a>
          </Button>
        </div>

        <div>
          <p className="text-xs font-semibold mb-1.5">Endpoints ({ENDPOINTS.length}):</p>
          <div className="border rounded-lg overflow-hidden">
            {ENDPOINTS.map((e) => (
              <div
                key={e.path}
                className="flex items-center gap-2 px-2 py-1.5 text-[11px] border-b last:border-b-0 bg-card/50"
              >
                <Badge variant="outline" className="text-[9px] w-12 justify-center shrink-0">
                  {e.method}
                </Badge>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${TAG_COLORS[e.tag] ?? ''}`}>
                  {e.tag}
                </Badge>
                <code className="font-mono text-[10px] shrink-0 text-primary">{e.path}</code>
                <span className="text-muted-foreground truncate flex-1">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-primary/20 bg-primary/5 rounded-lg p-2">
          <p className="text-[11px] flex items-start gap-1.5">
            <Shield className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Auth:</strong> Device endpoints — HMAC <code>Bearer DEVICE_TOKEN</code>।
              User endpoints — Supabase user JWT। Hardware-as-Source-of-Truth: cloud
              শুধু <code>desired_*</code> columns লেখে — ESP32 final state হোল্ডার।
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
