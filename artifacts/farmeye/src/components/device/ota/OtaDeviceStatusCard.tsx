import { CheckCircle2, Loader2, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeviceToken {
  id: string;
  device_name: string;
  token: string;
}

interface OtaStatus {
  status: string | null;
  progress: number | null;
  availableVersion: string | null;
}

interface Props {
  language: string;
  deviceTokens: DeviceToken[];
  getDeviceOtaStatus: (id: string) => OtaStatus | null;
}

export function OtaDeviceStatusCard({ language, deviceTokens, getDeviceOtaStatus }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wifi className="h-5 w-5 text-blue-500" />
          {language === 'bn' ? 'ডিভাইস OTA স্ট্যাটাস' : 'Device OTA Status'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {deviceTokens.map((device) => {
          const otaStatus = getDeviceOtaStatus(device.id);
          return (
            <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">{device.device_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{device.token.substring(0, 12)}...</p>
              </div>
              <div className="text-right">
                {otaStatus?.status === 'downloading' || otaStatus?.status === 'installing' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-xs">{otaStatus.progress || 0}%</span>
                  </div>
                ) : otaStatus?.status === 'completed' ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {language === 'bn' ? 'আপডেটেড' : 'Updated'}
                  </Badge>
                ) : otaStatus?.status === 'pending' ? (
                  <Badge variant="secondary">{language === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</Badge>
                ) : otaStatus?.availableVersion ? (
                  <Badge variant="outline">{otaStatus.availableVersion}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'আপ টু ডেট' : 'Up to date'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
