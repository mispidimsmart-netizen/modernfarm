import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  useSmsAlertSettings,
  useUpdateSmsAlertSettings,
  useSmsPhoneNumbers,
  useAddPhoneNumber,
  useDeletePhoneNumber,
  useTogglePhoneNumber,
  useSmsLogs,
} from '@/hooks/useSmsAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Droplets,
  Wind,
  Zap,
  Waves,
  Wifi,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

export function SmsAlertSettingsCard() {
  const { language } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useSmsAlertSettings();
  const { data: phoneNumbers, isLoading: phonesLoading } = useSmsPhoneNumbers();
  const { data: smsLogs } = useSmsLogs(10);
  const updateSettings = useUpdateSmsAlertSettings();
  const addPhone = useAddPhoneNumber();
  const deletePhone = useDeletePhoneNumber();
  const togglePhone = useTogglePhoneNumber();
  
  const [newPhone, setNewPhone] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [showAlertTypes, setShowAlertTypes] = useState(false);

  const handleAddPhone = () => {
    if (newPhone.trim()) {
      addPhone.mutate(
        { phone_number: newPhone.trim(), label: newLabel.trim() || undefined },
        {
          onSuccess: () => {
            setNewPhone('');
            setNewLabel('');
          },
        }
      );
    }
  };

  const alertTypes = [
    { key: 'temperature_alerts', icon: Thermometer, label: language === 'bn' ? 'তাপমাত্রা' : 'Temperature', color: 'text-red-500' },
    { key: 'humidity_alerts', icon: Droplets, label: language === 'bn' ? 'আর্দ্রতা' : 'Humidity', color: 'text-blue-500' },
    { key: 'ammonia_alerts', icon: Wind, label: language === 'bn' ? 'অ্যামোনিয়া' : 'Ammonia', color: 'text-yellow-500' },
    { key: 'power_alerts', icon: Zap, label: language === 'bn' ? 'বিদ্যুৎ' : 'Power', color: 'text-orange-500' },
    { key: 'water_alerts', icon: Waves, label: language === 'bn' ? 'পানি' : 'Water', color: 'text-cyan-500' },
    { key: 'device_offline_alerts', icon: Wifi, label: language === 'bn' ? 'ডিভাইস অফলাইন' : 'Device Offline', color: 'text-gray-500' },
  ];

  if (settingsLoading || phonesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'SMS এলার্ট সেটিংস' : 'SMS Alert Settings'}
          </span>
          <Switch
            checked={settings?.enabled ?? false}
            onCheckedChange={(enabled) => updateSettings.mutate({ enabled })}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Numbers Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4" />
            {language === 'bn' ? 'ফোন নম্বর' : 'Phone Numbers'}
          </Label>
          
          {/* Add new phone */}
          <div className="flex gap-2">
            <Input
              placeholder={language === 'bn' ? 'ফোন নম্বর (01XXXXXXXXX)' : 'Phone (01XXXXXXXXX)'}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={language === 'bn' ? 'লেবেল' : 'Label'}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-24"
            />
            <Button
              size="icon"
              onClick={handleAddPhone}
              disabled={!newPhone.trim() || addPhone.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Phone list */}
          <div className="space-y-2">
            {phoneNumbers && phoneNumbers.length > 0 ? (
              phoneNumbers.map((phone) => (
                <div
                  key={phone.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={phone.is_active}
                      onCheckedChange={(is_active) =>
                        togglePhone.mutate({ id: phone.id, is_active })
                      }
                    />
                    <span className={phone.is_active ? '' : 'text-muted-foreground line-through'}>
                      {phone.phone_number}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {phone.label}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deletePhone.mutate(phone.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                {language === 'bn' ? 'কোনো ফোন নম্বর নেই' : 'No phone numbers added'}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Alert Types Section */}
        <Collapsible open={showAlertTypes} onOpenChange={setShowAlertTypes}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-sm font-medium">
                {language === 'bn' ? 'এলার্ট টাইপ নির্বাচন' : 'Alert Type Selection'}
              </span>
              {showAlertTypes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid grid-cols-2 gap-2">
              {alertTypes.map(({ key, icon: Icon, label, color }) => {
                const isEnabled = settings ? (settings as unknown as Record<string, boolean>)[key] ?? true : true;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(value) =>
                        updateSettings.mutate({ [key]: value })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Cooldown Setting */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {language === 'bn' ? 'কুলডাউন (মিনিট)' : 'Cooldown (minutes)'}
            </span>
          </div>
          <Input
            type="number"
            min={5}
            max={120}
            value={settings?.cooldown_minutes ?? 30}
            onChange={(e) =>
              updateSettings.mutate({ cooldown_minutes: parseInt(e.target.value) || 30 })
            }
            className="w-20 text-center"
          />
        </div>

        <Separator />

        {/* SMS Logs Section */}
        <Collapsible open={showLogs} onOpenChange={setShowLogs}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-sm font-medium">
                {language === 'bn' ? 'সাম্প্রতিক SMS লগ' : 'Recent SMS Logs'}
              </span>
              {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {smsLogs && smsLogs.length > 0 ? (
                smsLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-2 bg-muted/30 rounded-lg text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {log.status === 'sent' ? (
                          <CheckCircle2 className="h-3 w-3 text-status-normal" />
                        ) : (
                          <XCircle className="h-3 w-3 text-status-danger" />
                        )}
                        <span className="truncate">{log.phone_number}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {log.sent_via.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground truncate mt-1">{log.message}</p>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(log.created_at), 'dd/MM HH:mm', {
                        locale: language === 'bn' ? bn : undefined,
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {language === 'bn' ? 'কোনো SMS লগ নেই' : 'No SMS logs yet'}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* GSM Module Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <h4 className="text-xs font-medium mb-1">
            {language === 'bn' ? 'GSM মডিউল (SIM800L)' : 'GSM Module (SIM800L)'}
          </h4>
          <p className="text-xs text-muted-foreground">
            {language === 'bn'
              ? 'ইন্টারনেট না থাকলে ESP32 এই নম্বরগুলোতে সরাসরি SMS পাঠাবে'
              : 'ESP32 will send SMS directly to these numbers when offline'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
