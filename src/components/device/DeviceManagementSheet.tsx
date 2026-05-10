import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDeviceTokens, useAddDeviceToken, useUpdateDeviceToken, useDeleteDeviceToken, useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useSheds } from '@/hooks/useSheds';
import { DeviceHealthCard } from './DeviceHealthCard';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Cpu, Plus, Copy, Trash2, RefreshCw, Radio } from 'lucide-react';
import { toast } from 'sonner';

export function DeviceManagementSheet() {
  const { language } = useAuth();
  const { data: devices, isLoading: devicesLoading } = useDeviceTokens();
  const { data: deviceHealth } = useAllDeviceHealth();
  const { data: sheds } = useSheds();
  const addDevice = useAddDeviceToken();
  const updateDevice = useUpdateDeviceToken();
  const deleteDevice = useDeleteDeviceToken();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceShed, setNewDeviceShed] = useState<string>('');

  const handleAdd = async () => {
    if (!newDeviceName) {
      toast.error(language === 'bn' ? 'ডিভাইসের নাম দিন' : 'Please enter device name');
      return;
    }
    
    try {
      const result = await addDevice.mutateAsync({
        device_name: newDeviceName,
        shed_id: newDeviceShed || undefined,
      });
      
      // Copy token to clipboard
      await navigator.clipboard.writeText(result.token);
      toast.success(
        language === 'bn' 
          ? 'ডিভাইস যোগ হয়েছে! টোকেন কপি করা হয়েছে' 
          : 'Device added! Token copied to clipboard'
      );
      
      setNewDeviceName('');
      setNewDeviceShed('');
      setIsAdding(false);
    } catch (error) {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error adding device');
    }
  };

  const handleCopyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    toast.success(language === 'bn' ? 'টোকেন কপি হয়েছে' : 'Token copied');
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'bn' ? 'ডিভাইস মুছে ফেলতে চান?' : 'Delete this device?')) return;
    
    try {
      await deleteDevice.mutateAsync(id);
      toast.success(language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    } catch (error) {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error deleting');
    }
  };

  const handleAssignShed = async (deviceId: string, shedId: string) => {
    try {
      await updateDevice.mutateAsync({
        id: deviceId,
        shed_id: shedId || null,
      });
      toast.success(language === 'bn' ? 'শেড অ্যাসাইন হয়েছে' : 'Shed assigned');
    } catch (error) {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error assigning shed');
    }
  };

  const getDeviceHealth = (deviceId: string) => {
    return deviceHealth?.find(h => h.device_token_id === deviceId);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Cpu className="h-4 w-4" />
          {language === 'bn' ? 'ডিভাইস' : 'Devices'}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'ডিভাইস ম্যানেজমেন্ট' : 'Device Management'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto pb-6">
          {/* Add New Device */}
          {isAdding ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="space-y-3">
                <div>
                  <Label>{language === 'bn' ? 'ডিভাইসের নাম' : 'Device Name'}</Label>
                  <Input
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder={language === 'bn' ? 'ESP32 কন্ট্রোলার ১' : 'ESP32 Controller 1'}
                  />
                </div>
                <div>
                  <Label>{language === 'bn' ? 'শেড (ঐচ্ছিক)' : 'Shed (Optional)'}</Label>
                  <Select value={newDeviceShed} onValueChange={setNewDeviceShed}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'bn' ? 'শেড নির্বাচন করুন' : 'Select a shed'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sheds?.map((shed) => (
                        <SelectItem key={shed.id} value={shed.id}>
                          {language === 'bn' ? shed.name : shed.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} disabled={addDevice.isPending}>
                    {addDevice.isPending ? (
                      <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    {language === 'bn' ? 'যোগ করুন' : 'Add'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              {language === 'bn' ? 'নতুন ডিভাইস যোগ করুন' : 'Add New Device'}
            </Button>
          )}

          {/* Device List */}
          {devicesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : devices?.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <Cpu className="mx-auto mb-2 h-8 w-8" />
              <p>{language === 'bn' ? 'কোনো ডিভাইস নেই' : 'No devices yet'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices?.map((device) => {
                const health = getDeviceHealth(device.id);
                const assignedShed = sheds?.find(s => s.id === device.shed_id);
                
                return (
                  <div key={device.id} className="space-y-3">
                    {/* Device Info */}
                    <div className="rounded-xl border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{device.device_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {assignedShed 
                              ? (language === 'bn' ? assignedShed.name : assignedShed.name_en)
                              : (language === 'bn' ? 'শেড অ্যাসাইন নেই' : 'No shed assigned')
                            }
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleCopyToken(device.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleDelete(device.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Token Display */}
                      <div className="mb-3 rounded-lg bg-muted p-2">
                        <p className="text-xs text-muted-foreground">
                          {language === 'bn' ? 'ডিভাইস টোকেন:' : 'Device Token:'}
                        </p>
                        <code className="mt-1 block truncate text-xs">
                          {device.token}
                        </code>
                      </div>

                      {/* Shed Assignment */}
                      <Select 
                        value={device.shed_id || ''} 
                        onValueChange={(value) => handleAssignShed(device.id, value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={language === 'bn' ? 'শেড অ্যাসাইন করুন' : 'Assign to shed'} />
                        </SelectTrigger>
                        <SelectContent>
                          {sheds?.map((shed) => (
                            <SelectItem key={shed.id} value={shed.id}>
                              {language === 'bn' ? shed.name : shed.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Health Card */}
                    {health && (
                      <DeviceHealthCard device={health} deviceName={device.device_name} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
