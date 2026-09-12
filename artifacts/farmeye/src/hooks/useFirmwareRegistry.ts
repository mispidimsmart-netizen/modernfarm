import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { crc32Hex, sha256Hex, parseVersionCode } from "@/lib/firmwareChecksum";

export interface FirmwareUploadPayload {
  file: File;
  version: string;
  channel: "stable" | "beta" | "canary";
  changelog: string;
  changelogBn: string;
  boardType: string;
  minRelays: string;
  signatureB64: string;
  signingKeyId: string;
  windowEnabled: boolean;
  windowStart: string;
  windowEnd: string;
  healthMinPct: string;
}

export function useFirmwareRegistry(t: (bn: string, en: string) => string) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: signingKeys } = useQuery({
    queryKey: ["firmware-signing-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firmware_signing_keys")
        .select("id, key_name, algorithm, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: firmwares, isLoading } = useQuery({
    queryKey: ["firmware-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firmware_registry")
        .select("*")
        .order("version_code", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("firmware_registry")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("আপডেট হয়েছে", "Updated"));
      qc.invalidateQueries({ queryKey: ["firmware-registry"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Returns true when the upload succeeded (so the form can reset). */
  const uploadFirmware = async (p: FirmwareUploadPayload): Promise<boolean> => {
    if (!p.file) {
      toast.error(t("ফাইল নির্বাচন করুন", "Select a file"));
      return false;
    }
    if (!p.version.match(/^v?\d+\.\d+\.\d+$/)) {
      toast.error(t("ভার্সন ফরম্যাট: v1.0.0", "Version format: v1.0.0"));
      return false;
    }
    if (!p.file.name.endsWith(".bin")) {
      toast.error(t("শুধু .bin ফাইল গ্রহণযোগ্য", "Only .bin files accepted"));
      return false;
    }

    setUploading(true);
    try {
      const versionClean = p.version.startsWith("v") ? p.version : `v${p.version}`;
      const buffer = await p.file.arrayBuffer();
      const crc = await crc32Hex(buffer);
      const sha = await sha256Hex(buffer);
      const path = `${p.channel}/${versionClean}-${Date.now()}.bin`;

      const { error: upErr } = await supabase.storage
        .from("firmware")
        .upload(path, p.file, {
          contentType: "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("firmware").getPublicUrl(path);

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("firmware_registry").insert({
        version: versionClean,
        version_code: parseVersionCode(versionClean),
        release_channel: p.channel,
        file_url: pub.publicUrl,
        file_size_bytes: p.file.size,
        crc32_checksum: crc,
        sha256_hex: sha,
        signature_b64: p.signatureB64.trim() || null,
        signing_key_id: p.signingKeyId === "none" ? null : p.signingKeyId,
        signature_alg: "ed25519",
        update_window_enabled: p.windowEnabled,
        update_window_start_hour: parseInt(p.windowStart) || 2,
        update_window_end_hour: parseInt(p.windowEnd) || 4,
        health_gate_min_success_pct: parseFloat(p.healthMinPct) || 95,
        changelog: p.changelog || null,
        changelog_bn: p.changelogBn || null,
        is_active: true,
        min_hardware: {
          board_types: [p.boardType],
          min_relay_count: parseInt(p.minRelays) || 8,
          required_features: [],
        },
        created_by: user?.id,
      });
      if (insErr) throw insErr;

      toast.success(t("ফার্মওয়্যার সফলভাবে আপলোড হয়েছে", "Firmware uploaded successfully"));
      qc.invalidateQueries({ queryKey: ["firmware-registry"] });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setUploading(false);
    }
  };

  return { signingKeys, firmwares, isLoading, toggleActive, uploadFirmware, uploading };
}
