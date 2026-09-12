/**
 * Forensic Safety Timeline — Dispute Analysis UI
 * 
 * Shows last 24h of:
 * - Requested vs Actual relay states
 * - Environment response to actuator actions
 * - Safety overrides and mismatches
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForensicTimeline, ForensicEntry } from '@/hooks/useForensicTimeline';
import { Shield, AlertTriangle, Activity, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

function StateColor({ state }: { state: string }) {
  const colors: Record<string, string> = {
    NORMAL: 'bg-green-500/20 text-green-700 dark:text-green-400',
    WARNING: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    DANGER: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    EMERGENCY: 'bg-red-500/20 text-red-700 dark:text-red-400',
    SURVIVAL: 'bg-red-600/20 text-red-800 dark:text-red-300',
    SENSOR_FAIL: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  };
  return <Badge className={colors[state] || 'bg-muted text-muted-foreground'}>{state}</Badge>;
}

function RelayDiff({ label, requested, actual }: { label: string; requested: boolean; actual: boolean }) {
  const match = requested === actual;
  return (
    <span className={`text-xs font-mono ${match ? 'text-muted-foreground' : 'text-destructive font-bold'}`}>
      {label}: {requested ? '▶' : '◻'}→{actual ? '▶' : '◻'}{!match && ' ⚠'}
    </span>
  );
}

function ForensicRow({ entry, expanded, onToggle }: { entry: ForensicEntry; expanded: boolean; onToggle: () => void }) {
  const time = format(new Date(entry.recorded_at), 'HH:mm:ss');
  
  return (
    <div className={`border-b border-border/50 ${entry.relay_mismatch ? 'bg-destructive/5' : ''}`}>
      <button onClick={onToggle} className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-muted/50">
        <span className="text-xs font-mono text-muted-foreground w-16">{time}</span>
        <StateColor state={entry.system_state} />
        <Badge variant="outline" className="text-xs">{entry.event_type}</Badge>
        {entry.relay_mismatch && <Badge variant="destructive" className="text-xs">MISMATCH</Badge>}
        {entry.safety_override_active && <Badge className="text-xs bg-orange-500/20 text-orange-700">OVERRIDE</Badge>}
        <span className="flex-1" />
        {entry.temperature !== null && (
          <span className="text-xs font-mono">{Number(entry.temperature).toFixed(1)}°C</span>
        )}
        {entry.temp_delta_1min !== null && Number(entry.temp_delta_1min) !== 0 && (
          <span className={`text-xs font-mono ${Number(entry.temp_delta_1min) > 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {Number(entry.temp_delta_1min) > 0 ? '↑' : '↓'}{Math.abs(Number(entry.temp_delta_1min)).toFixed(1)}
          </span>
        )}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          {/* Relay States */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-muted/30 rounded">
            <span className="col-span-3 font-semibold text-foreground">Relay: Requested → Actual</span>
            <RelayDiff label="FAN" requested={entry.requested_fan} actual={entry.actual_fan} />
            <RelayDiff label="HTR" requested={entry.requested_heater} actual={entry.actual_heater} />
            <RelayDiff label="FOG" requested={entry.requested_fogger} actual={entry.actual_fogger} />
            <RelayDiff label="ALM" requested={entry.requested_alarm} actual={entry.actual_alarm} />
            <RelayDiff label="CIRC" requested={entry.requested_circulation_fan} actual={entry.actual_circulation_fan} />
          </div>
          
          {entry.mismatch_details && (
            <div className="p-2 bg-destructive/10 rounded text-destructive font-mono">
              {entry.mismatch_details}
            </div>
          )}
          
          {/* Environment */}
          <div className="grid grid-cols-4 gap-1 p-2 bg-muted/30 rounded">
            <span className="col-span-4 font-semibold text-foreground">Environment</span>
            <span>T: {entry.temperature !== null ? Number(entry.temperature).toFixed(1) : '-'}°C</span>
            <span>H: {entry.humidity !== null ? Number(entry.humidity).toFixed(0) : '-'}%</span>
            <span>NH3: {entry.ammonia !== null ? Number(entry.ammonia).toFixed(0) : '-'}ppm</span>
            <span>HSI: {entry.hsi_value !== null ? Number(entry.hsi_value).toFixed(0) : '-'}</span>
            {entry.worst_case_max_temp !== null && (
              <span className="col-span-2">Max: {Number(entry.worst_case_max_temp).toFixed(1)}°C Min: {Number(entry.worst_case_min_temp).toFixed(1)}°C</span>
            )}
          </div>
          
          {/* Deltas */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-muted/30 rounded">
            <span className="col-span-3 font-semibold text-foreground">Environment Response</span>
            <span>ΔT 1m: {entry.temp_delta_1min !== null ? (Number(entry.temp_delta_1min) >= 0 ? '+' : '') + Number(entry.temp_delta_1min).toFixed(2) : '-'}°C</span>
            <span>ΔT 5m: {entry.temp_delta_5min !== null ? (Number(entry.temp_delta_5min) >= 0 ? '+' : '') + Number(entry.temp_delta_5min).toFixed(2) : '-'}°C</span>
            <span>ΔH 1m: {entry.humidity_delta_1min !== null ? (Number(entry.humidity_delta_1min) >= 0 ? '+' : '') + Number(entry.humidity_delta_1min).toFixed(1) : '-'}%</span>
          </div>
          
          {/* Safety */}
          <div className="flex flex-wrap gap-1">
            {!entry.heater_allowed && <Badge variant="destructive" className="text-xs">Heater Blocked</Badge>}
            {entry.force_ventilation && <Badge className="text-xs bg-blue-500/20 text-blue-700">Forced Vent</Badge>}
            {entry.fan_effect_verified === false && <Badge variant="destructive" className="text-xs">Fan Effect ✗</Badge>}
            {entry.heater_effect_verified === false && <Badge variant="destructive" className="text-xs">Heater Effect ✗</Badge>}
            {!entry.thermal_model_plausible && <Badge variant="destructive" className="text-xs">Thermal Model ✗</Badge>}
            {entry.reboot_heater_locked && <Badge className="text-xs bg-yellow-500/20">Reboot Lock</Badge>}
            {entry.reboot_vent_purge && <Badge className="text-xs bg-blue-500/20">Purge Active</Badge>}
          </div>
          
          {entry.event_detail && (
            <div className="font-mono text-muted-foreground">{entry.event_detail}</div>
          )}
          <div className="text-muted-foreground">Source: {entry.source} | Uptime: {Math.round(entry.uptime_ms / 1000)}s</div>
        </div>
      )}
    </div>
  );
}

export default function ForensicTimelineCard() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const allData = useForensicTimeline(false);
  const mismatchData = useForensicTimeline(true);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-4 h-4" />
          ফরেনসিক সেফটি টাইমলাইন (24h)
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />{allData.totalEntries} entries
          </Badge>
          {allData.mismatchCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />{allData.mismatchCount} mismatches
            </Badge>
          )}
          {allData.criticalEvents > 0 && (
            <Badge className="text-xs bg-red-500/20 text-red-700">
              {allData.criticalEvents} critical
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />{allData.safetyOverrideCount} overrides
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="all">
          <TabsList className="mx-3 mb-2">
            <TabsTrigger value="all" className="text-xs">সব লগ</TabsTrigger>
            <TabsTrigger value="mismatches" className="text-xs">
              মিসম্যাচ {allData.mismatchCount > 0 && `(${allData.mismatchCount})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[400px]">
              {allData.isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : allData.entries.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  কোনো ফরেনসিক লগ নেই — ডিভাইস সংযুক্ত হলে স্বয়ংক্রিয়ভাবে শুরু হবে
                </div>
              ) : (
                allData.entries.map(entry => (
                  <ForensicRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="mismatches" className="mt-0">
            <ScrollArea className="h-[400px]">
              {mismatchData.entries.length === 0 ? (
                <div className="p-4 text-center text-green-600">
                  ✅ গত ২৪ ঘণ্টায় কোনো রিলে মিসম্যাচ নেই
                </div>
              ) : (
                mismatchData.entries.map(entry => (
                  <ForensicRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
