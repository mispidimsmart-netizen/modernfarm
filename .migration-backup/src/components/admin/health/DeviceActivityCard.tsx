import { Battery, CheckCircle2, Clock, Cpu, Server, Wifi, WifiOff, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { formatUptime } from './healthUtils';
import type { HealthLabels, HealthLanguage } from './labels';

interface Props {
  labels: HealthLabels;
  language: HealthLanguage;
  selectedUserId: string;
  userDeviceHealth?: any[];
  loadingUserDevice: boolean;
  recentDevices?: any[];
  loadingDevices: boolean;
  recentErrors?: any[];
  loadingErrors: boolean;
}

function ErrorRow({ error, language, showType }: { error: any; language: HealthLanguage; showType?: boolean }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-red-300 truncate">{language === 'bn' ? error.message_bn : error.message}</p>
        <div className="flex items-center gap-2 mt-1">
          {showType && (
            <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
              {error.alert_type}
            </Badge>
          )}
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(error.created_at), { addSuffix: true, locale: bn })}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Right column: per-user device detail, or the fleet-wide recent devices + errors feed. */
export function DeviceActivityCard({
  labels,
  language,
  selectedUserId,
  userDeviceHealth,
  loadingUserDevice,
  recentDevices,
  loadingDevices,
  recentErrors,
  loadingErrors,
}: Props) {
  return (
    <Card className="bg-slate-800/50 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Server className="w-5 h-5 text-purple-400" />
          {selectedUserId === 'all' ? labels.recentActivity : labels.deviceStatus}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px]">
          {selectedUserId !== 'all' ? (
            <div className="space-y-3">
              {loadingUserDevice ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full bg-slate-700/50" />
                  ))}
                </div>
              ) : userDeviceHealth && userDeviceHealth.length > 0 ? (
                userDeviceHealth.map((device: any) => (
                  <div key={device.id} className="p-3 rounded-lg bg-slate-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device.is_online ? (
                          <Wifi className="w-4 h-4 text-green-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-white font-medium">
                          {device.device_tokens?.device_name || 'Unknown Device'}
                        </span>
                      </div>
                      <Badge className={device.is_online ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {device.is_online ? labels.online : labels.offline}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">{labels.mode}:</span>
                        <span className="text-white">{device.mode || 'AUTO'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Battery
                          className={`w-3 h-3 ${device.battery_percentage > 20 ? 'text-green-400' : 'text-red-400'}`}
                        />
                        <span className="text-gray-400">{labels.battery}:</span>
                        <span className="text-white">{device.battery_percentage || '-'}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wifi className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">{labels.signal}:</span>
                        <span className="text-white">{device.wifi_signal_strength || '-'} dBm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">{labels.uptime}:</span>
                        <span className="text-white">{formatUptime(device.uptime_seconds)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      {device.failsafe_mode && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">⚠️ Failsafe Mode</Badge>
                      )}
                      <span className="text-gray-500 ml-auto">
                        {device.last_seen_at &&
                          formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true, locale: bn })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{labels.noDeviceData}</p>
                </div>
              )}

              {recentErrors && recentErrors.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.errorLogs}</p>
                  <div className="space-y-2">
                    {recentErrors.map((error: any) => (
                      <ErrorRow key={error.id} error={error} language={language} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.deviceStatus}</p>
                {loadingDevices ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full bg-slate-700/50" />
                    ))}
                  </div>
                ) : recentDevices && recentDevices.length > 0 ? (
                  <div className="space-y-2">
                    {recentDevices.map((device: any) => (
                      <div key={device.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                        <div className="flex items-center gap-2">
                          {device.is_online ? (
                            <Wifi className="w-4 h-4 text-green-400" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-red-400" />
                          )}
                          <div>
                            <p className="text-sm text-white">{device.device_tokens?.device_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">
                              {device.mode} {device.failsafe_mode && '⚠️ Failsafe'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {device.wifi_signal_strength && (
                            <p className="text-xs text-gray-400">{device.wifi_signal_strength}dBm</p>
                          )}
                          {device.last_seen_at && (
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true, locale: bn })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">{labels.noActivity}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.errorLogs}</p>
                {loadingErrors ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-10 w-full bg-slate-700/50" />
                    ))}
                  </div>
                ) : recentErrors && recentErrors.length > 0 ? (
                  <div className="space-y-2">
                    {recentErrors.map((error: any) => (
                      <ErrorRow key={error.id} error={error} language={language} showType />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-1" />
                    <p className="text-green-400 text-sm">{labels.noErrors}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
