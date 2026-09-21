import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { sha256Hex } from '@/lib/firmwareChecksum';
import { useFarmContext } from '@/context/FarmContext';

export interface Firmware {
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
  checksum: string | null;
  crc32: string | null;
  sha256_hex: string | null;
  signature_b64: string | null;
  signing_public_key_b64: string | null;
  signature_alg: string | null;
  require_signature: boolean;
}

export interface V8OtaAssignmentResponse {
  success: true;
  assignment_id: string;
  device_token_id: string;
  firmware_id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isV8OtaAssignmentResponse(value: unknown): value is V8OtaAssignmentResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.success === true &&
    typeof body.assignment_id === 'string' && UUID_RE.test(body.assignment_id) &&
    typeof body.device_token_id === 'string' && UUID_RE.test(body.device_token_id) &&
    typeof body.firmware_id === 'string' && UUID_RE.test(body.firmware_id);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function useOtaManagement() {
  const { language, user } = useAuth();
  const { selectedFarmId } = useFarmContext();
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

  const { data: deviceTokens } = useQuery({
    queryKey: ['device_tokens', user?.id, selectedFarmId],
    queryFn: async () => {
      if (!user || !selectedFarmId) return [];
      const { data, error } = await supabase
        .from('device_tokens')
        .select('id, device_name, is_active')
        .eq('farm_id', selectedFarmId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedFarmId,
  });

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

  const uploadFirmware = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !version || !user) {
        throw new Error('Missing required fields');
      }

      setIsUploading(true);
      setUploadProgress(10);

      const firmwareBuffer = await selectedFile.arrayBuffer();
      const sha256 = await sha256Hex(firmwareBuffer);
      // Private signing keys never enter the browser. The server-side
      // contract signs the digest and fails closed when the release key is
      // not provisioned.
      const { data: signingData, error: signingError } = await supabase.functions.invoke(
        'ota-signing-contract-v8',
        { body: { digest_sha256: sha256, version } },
      );
      if (
        signingError ||
        !signingData?.signature_b64 ||
        !signingData?.public_key_b64 ||
        signingData.signature_alg !== 'ed25519' ||
        signingData.signed_payload !== 'sha256_digest_bytes'
      ) {
        throw new Error('V8 OTA signing service unavailable; firmware was not published');
      }

      const filename = `${version.replace(/\./g, '_')}_${Date.now()}.bin`;
      const { error: uploadError } = await supabase.storage
        .from('firmware')
        .upload(filename, selectedFile, {
          contentType: 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      setUploadProgress(60);

      const { data: urlData } = supabase.storage.from('firmware').getPublicUrl(filename);
      setUploadProgress(80);

      const { error: insertError } = await supabase.from('ota_firmware').insert({
        version,
        filename,
        url: urlData.publicUrl,
        file_size_bytes: selectedFile.size,
        sha256_hex: sha256,
        signature_b64: signingData.signature_b64,
        signing_public_key_b64: signingData.public_key_b64,
        signature_alg: 'ed25519',
        require_signature: true,
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

  const deleteFirmware = useMutation({
    mutationFn: async (id: string) => {
      const firmware = firmwares?.find((f) => f.id === id);
      if (!firmware) throw new Error('Firmware not found');

      await supabase.storage.from('firmware').remove([firmware.filename]);

      const { error } = await supabase.from('ota_firmware').delete().eq('id', id);
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

  const pushUpdate = useMutation({
    mutationFn: async ({ deviceTokenId, firmwareId }: { deviceTokenId: string; firmwareId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

       const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ota-firmware-v8?action=push`;
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_token_id: deviceTokenId, firmware_id: firmwareId }),
      });

      const result: unknown = await res.json();
      if (!res.ok || !isV8OtaAssignmentResponse(result)) {
        const error = result as { error?: unknown };
        throw new Error(typeof error.error === 'string' ? error.error : 'Invalid V8 OTA assignment response');
      }
      if (result.device_token_id !== deviceTokenId || result.firmware_id !== firmwareId) {
        throw new Error('V8 OTA assignment response identity mismatch');
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: language === 'bn' ? '✅ আপডেট পাঠানো হয়েছে!' : '✅ Update pushed!',
        description:
          language === 'bn' ? 'ডিভাইস পরবর্তী চেকে আপডেট পাবে' : 'Device will receive update on next check',
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const getDeviceOtaStatus = (deviceTokenId: string) => {
    const health = deviceHealthList?.find((h) => h.device_token_id === deviceTokenId);
    return health
      ? {
          status: health.ota_status,
          progress: health.ota_progress,
          availableVersion: health.ota_version_available,
        }
      : null;
  };

  return {
    language,
    firmwares,
    isLoading,
    deviceTokens,
    form: {
      isUploading,
      uploadProgress,
      selectedFile,
      setSelectedFile,
      version,
      setVersion,
      releaseNotes,
      setReleaseNotes,
      releaseNotesBn,
      setReleaseNotesBn,
      farmType,
      setFarmType,
      isStable,
      setIsStable,
    },
    uploadFirmware,
    deleteFirmware,
    pushUpdate,
    dialogs: {
      deleteDialogOpen,
      setDeleteDialogOpen,
      firmwareToDelete,
      setFirmwareToDelete,
      pushDialogOpen,
      setPushDialogOpen,
      selectedFirmwareForPush,
      setSelectedFirmwareForPush,
      selectedDeviceForPush,
      setSelectedDeviceForPush,
    },
    formatDate,
    getDeviceOtaStatus,
  };
}
