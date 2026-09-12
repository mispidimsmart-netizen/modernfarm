import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell as TCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Thermometer, Droplet, Wind } from 'lucide-react';
import { DEVICE_META, ALL_DEVICES, type SensorKey, type DeviceKey } from '@/lib/sensorDeviceImpact';
import type { CorrelatedRow } from '@/hooks/useSensorDeviceImpact';

interface Props {
  bn: boolean;
  loading: boolean;
  correlated: CorrelatedRow[];
  selectedSensors: Set<SensorKey>;
  selectedDevices: Set<DeviceKey>;
}

export function ImpactTable({ bn, loading, correlated, selectedSensors, selectedDevices }: Props) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="max-h-[420px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted">
            <TableRow>
              <TableHead className="text-xs">{bn ? 'সময়' : 'Time'}</TableHead>
              {selectedSensors.has('temperature') && (
                <TableHead className="text-xs"><Thermometer className="h-3 w-3 inline" /> °C</TableHead>
              )}
              {selectedSensors.has('humidity') && (
                <TableHead className="text-xs"><Droplet className="h-3 w-3 inline" /> %</TableHead>
              )}
              {selectedSensors.has('ammonia') && (
                <TableHead className="text-xs"><Wind className="h-3 w-3 inline" /> NH₃</TableHead>
              )}
              {selectedSensors.has('light_lux') && <TableHead className="text-xs">💡 lux</TableHead>}
              <TableHead className="text-xs">{bn ? 'সক্রিয় ডিভাইস' : 'Active devices'}</TableHead>
              <TableHead className="text-xs">{bn ? 'প্রভাব' : 'Impact'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TCell colSpan={6} className="text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                </TCell>
              </TableRow>
            ) : correlated.length === 0 ? (
              <TableRow>
                <TCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                  {bn ? 'এই সময়সীমার জন্য কোনো ডেটা নেই' : 'No data for this range'}
                </TCell>
              </TableRow>
            ) : (
              correlated.slice(-100).reverse().map((r, i) => {
                const active = ALL_DEVICES
                  .filter((d) => selectedDevices.has(d) && r.deviceState[d])
                  .map((d) => (bn ? DEVICE_META[d].bn : DEVICE_META[d].en));
                const variant: any =
                  r.status === 'CRITICAL' ? 'destructive' : r.status === 'WARNING' ? 'default' : 'secondary';
                return (
                  <TableRow key={i}>
                    <TCell className="text-xs whitespace-nowrap">{r.time}</TCell>
                    {selectedSensors.has('temperature') && <TCell className="text-xs">{r.temperature.toFixed(1)}</TCell>}
                    {selectedSensors.has('humidity') && <TCell className="text-xs">{r.humidity.toFixed(0)}</TCell>}
                    {selectedSensors.has('ammonia') && <TCell className="text-xs">{r.ammonia.toFixed(1)}</TCell>}
                    {selectedSensors.has('light_lux') && (
                      <TCell className="text-xs">{r.light_lux > 0 ? r.light_lux.toFixed(0) : '—'}</TCell>
                    )}
                    <TCell className="text-xs">
                      {active.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {active.map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px] px-1 py-0">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TCell>
                    <TCell className="text-xs">
                      <Badge variant={variant} className="text-[10px]">
                        {r.status_bn}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.reason_bn}</p>
                    </TCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
