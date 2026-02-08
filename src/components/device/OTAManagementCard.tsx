import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Download, Trash2, CheckCircle2, 
  AlertCircle, Loader2, Send, HardDrive,
  FileCode, Clock, Wifi
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';

interface Firmware {
  id: string;
  version: string;
  filename: string;
  url: string;
  file_size_bytes: number;
  is_stable: boolean;
  is_active: boolean;
  release_notes: string;
  release_notes_bn: string;
  farm_type: string;
  created_at: string;
}

export function OTAManagementCard() {
  const { language, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: deviceHealthList } = useAllDeviceHealth();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releaseNotesBn, setReleaseNotesBn] = useState('');
  const [farmType, setFarmType] = useState('all');
  const [isStable, setIsStable] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [firmwareToDelete, setFirmwareToDelete] = useState<string | null>(null);
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [selectedFirmwareForPush, setSelectedFirmwareForPush] = useState<Firmware | null>(null);
  const [selectedDeviceForPush, setSelectedDeviceForPush] = useState<string>('');

  // Fetch device tokens for push selection
  const { data: deviceTokens } = useQuery({
    queryKey: ['device_tokens', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch firmware list
  const { data: firmwares, isLoading } = useQuery({
    queryKey: ['ota_firmware'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ota_firmware')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Firmware[];
    },
  });

  // Upload firmware mutation
  const uploadFirmware = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !version || !user) {
        throw new Error('Missing required fields');
      }

      setIsUploading(true);
      setUploadProgress(10);

      // Upload file to storage
      const filename = `${version.replace(/\./g, '_')}_${Date.now()}.bin`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('firmware')
        .upload(filename, selectedFile, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(60);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('firmware')
        .getPublicUrl(filename);

      setUploadProgress(80);

      // Insert firmware record
      const { error: insertError } = await supabase
        .from('ota_firmware')
        .insert({
          version,
          filename,
          url: urlData.publicUrl,
          file_size_bytes: selectedFile.size,
          is_stable: isStable,
          is_active: true,
          release_notes: releaseNotes,
          release_notes_bn: releaseNotesBn,
          farm_type: farmType,
          created_by: user.id,
        });

      if (insertError) throw insertError;
      setUploadProgress(100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ota_firmware'] });
      toast({
        title: language === 'bn' ? '✅ ফার্মওয়্যার আপলোড সফল!' : '✅ Firmware uploaded!',
      });
      // Reset form
      setSelectedFile(null);
      setVersion('');
      setReleaseNotes('');
      setReleaseNotesBn('');
      setFarmType('all');
      setIsStable(false);
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: language === 'bn' ? 'আপলোড ব্যর্থ' : 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // Delete firmware mutation
  const deleteFirmware = useMutation({
    mutationFn: async (id: string) => {
      const firmware = firmwares?.find(f => f.id === id);
      if (!firmware) throw new Error('Firmware not found');

      // Delete from storage
      await supabase.storage.from('firmware').remove([firmware.filename]);

      // Delete record
      const { error } = await supabase
        .from('ota_firmware')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ota_firmware'] });
      toast({
        title: language === 'bn' ? 'ফার্মওয়্যার মুছে ফেলা হয়েছে' : 'Firmware deleted',
      });
      setDeleteDialogOpen(false);
      setFirmwareToDelete(null);
    },
  });

  // Push update to device mutation
  const pushUpdate = useMutation({
    mutationFn: async ({ deviceTokenId, firmwareId }: { deviceTokenId: string; firmwareId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ota-firmware', {
        body: { device_token_id: deviceTokenId, firmware_id: firmwareId },
        headers: { 'Content-Type': 'application/json' },
      });

      // Since we're using invoke with action in URL, we need to call directly
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ota-firmware?action=push`;
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_token_id: deviceTokenId, firmware_id: firmwareId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Push failed');
      }
    },
    onSuccess: () => {
      toast({
        title: language === 'bn' ? '✅ আপডেট পাঠানো হয়েছে!' : '✅ Update pushed!',
        description: language === 'bn' 
          ? 'ডিভাইস পরবর্তী চেকে আপডেট পাবে'
          : 'Device will receive update on next check',
      });
      setPushDialogOpen(false);
      setSelectedFirmwareForPush(null);
      setSelectedDeviceForPush('');
    },
    onError: (error: Error) => {
      toast({
        title: language === 'bn' ? 'পুশ ব্যর্থ' : 'Push Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get device OTA status
  const getDeviceOtaStatus = (deviceTokenId: string) => {
    const health = deviceHealthList?.find(h => h.device_token_id === deviceTokenId);
    return health ? {
      status: health.ota_status,
      progress: health.ota_progress,
      availableVersion: health.ota_version_available,
    } : null;
  };

  return (
    <div className="space-y-4">
      {/* Upload New Firmware */}
      <Card className="border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-500" />
            {language === 'bn' ? 'নতুন ফার্মওয়্যার আপলোড' : 'Upload New Firmware'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? '.bin ফাইল আপলোড করুন ESP32 আপডেটের জন্য' 
              : 'Upload .bin file for ESP32 OTA updates'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'ফার্মওয়্যার ফাইল (.bin)' : 'Firmware File (.bin)'}</Label>
            <Input
              type="file"
              accept=".bin"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              disabled={isUploading}
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          {/* Version */}
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'ভার্সন' : 'Version'}</Label>
            <Input
              placeholder="v1.2.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={isUploading}
            />
          </div>

          {/* Farm Type */}
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'খামারের ধরণ' : 'Farm Type'}</Label>
            <Select value={farmType} onValueChange={setFarmType} disabled={isUploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সব ধরণ' : 'All Types'}</SelectItem>
                <SelectItem value="layer">{language === 'bn' ? 'লেয়ার' : 'Layer'}</SelectItem>
                <SelectItem value="broiler">{language === 'bn' ? 'ব্রয়লার' : 'Broiler'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Release Notes */}
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'রিলিজ নোট (English)' : 'Release Notes (English)'}</Label>
            <Textarea
              placeholder="What's new in this version..."
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              disabled={isUploading}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'bn' ? 'রিলিজ নোট (বাংলা)' : 'Release Notes (Bangla)'}</Label>
            <Textarea
              placeholder="এই ভার্সনে নতুন কি আছে..."
              value={releaseNotesBn}
              onChange={(e) => setReleaseNotesBn(e.target.value)}
              disabled={isUploading}
              rows={2}
            />
          </div>

          {/* Stable Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
            <input
              type="checkbox"
              checked={isStable}
              onChange={(e) => setIsStable(e.target.checked)}
              disabled={isUploading}
              className="h-4 w-4 rounded"
            />
            <div>
              <p className="font-medium text-sm">
                {language === 'bn' ? 'স্ট্যাবল রিলিজ' : 'Stable Release'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' 
                  ? 'সব ডিভাইসে অটো-আপডেট হবে' 
                  : 'Auto-update for all devices'}
              </p>
            </div>
          </label>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Upload Button */}
          <Button
            className="w-full"
            onClick={() => uploadFirmware.mutate()}
            disabled={!selectedFile || !version || isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {language === 'bn' ? 'আপলোড করুন' : 'Upload Firmware'}
          </Button>
        </CardContent>
      </Card>

      {/* Firmware List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'আপলোড করা ফার্মওয়্যার' : 'Uploaded Firmwares'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : firmwares && firmwares.length > 0 ? (
            <div className="space-y-3">
              {firmwares.map((firmware) => (
                <motion.div
                  key={firmware.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-muted/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-primary" />
                      <span className="font-medium">{firmware.version}</span>
                      {firmware.is_stable && (
                        <Badge variant="default" className="text-xs">
                          {language === 'bn' ? 'স্ট্যাবল' : 'Stable'}
                        </Badge>
                      )}
                      {firmware.farm_type !== 'all' && (
                        <Badge variant="outline" className="text-xs">
                          {firmware.farm_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedFirmwareForPush(firmware);
                          setPushDialogOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setFirmwareToDelete(firmware.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {formatFileSize(firmware.file_size_bytes || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(firmware.created_at)}
                    </span>
                  </div>
                  {(firmware.release_notes || firmware.release_notes_bn) && (
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' ? firmware.release_notes_bn : firmware.release_notes}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{language === 'bn' ? 'কোনো ফার্মওয়্যার নেই' : 'No firmware uploaded'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device OTA Status */}
      {deviceTokens && deviceTokens.length > 0 && (
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
                    <p className="text-xs text-muted-foreground font-mono">
                      {device.token.substring(0, 12)}...
                    </p>
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
                      <Badge variant="secondary">
                        {language === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}
                      </Badge>
                    ) : otaStatus?.availableVersion ? (
                      <Badge variant="outline">
                        {otaStatus.availableVersion}
                      </Badge>
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
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'bn' ? 'ফার্মওয়্যার মুছে ফেলুন?' : 'Delete Firmware?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn' 
                ? 'এই ফার্মওয়্যার ফাইলটি স্থায়ীভাবে মুছে ফেলা হবে।' 
                : 'This firmware file will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => firmwareToDelete && deleteFirmware.mutate(firmwareToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Push Update Dialog */}
      <AlertDialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'bn' ? 'আপডেট পাঠান' : 'Push Update'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn' 
                ? `${selectedFirmwareForPush?.version} ভার্সন কোন ডিভাইসে পাঠাবেন?` 
                : `Which device should receive ${selectedFirmwareForPush?.version}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedDeviceForPush} onValueChange={setSelectedDeviceForPush}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'bn' ? 'ডিভাইস নির্বাচন করুন' : 'Select device'} />
              </SelectTrigger>
              <SelectContent>
                {deviceTokens?.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.device_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedFirmwareForPush && selectedDeviceForPush) {
                  pushUpdate.mutate({
                    deviceTokenId: selectedDeviceForPush,
                    firmwareId: selectedFirmwareForPush.id,
                  });
                }
              }}
              disabled={!selectedDeviceForPush || pushUpdate.isPending}
            >
              {pushUpdate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {language === 'bn' ? 'পাঠান' : 'Push'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
