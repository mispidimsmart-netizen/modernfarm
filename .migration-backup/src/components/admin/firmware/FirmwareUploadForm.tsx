import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import type { FirmwareUploadPayload } from "@/hooks/useFirmwareRegistry";

interface SigningKey {
  id: string;
  key_name: string;
  algorithm: string;
}

interface Props {
  t: (bn: string, en: string) => string;
  signingKeys?: SigningKey[] | null;
  uploading: boolean;
  onUpload: (payload: FirmwareUploadPayload) => Promise<boolean>;
}

export function FirmwareUploadForm({ t, signingKeys, uploading, onUpload }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"stable" | "beta" | "canary">("stable");
  const [changelog, setChangelog] = useState("");
  const [changelogBn, setChangelogBn] = useState("");
  const [boardType, setBoardType] = useState("esp32_devkit_v1");
  const [minRelays, setMinRelays] = useState("8");

  // Phase 5 hardening fields
  const [signatureB64, setSignatureB64] = useState("");
  const [signingKeyId, setSigningKeyId] = useState<string>("none");
  const [windowEnabled, setWindowEnabled] = useState(true);
  const [windowStart, setWindowStart] = useState("2");
  const [windowEnd, setWindowEnd] = useState("4");
  const [healthMinPct, setHealthMinPct] = useState("95");

  const handleUpload = async () => {
    if (!file) return;
    const ok = await onUpload({
      file, version, channel, changelog, changelogBn, boardType, minRelays,
      signatureB64, signingKeyId, windowEnabled, windowStart, windowEnd, healthMinPct,
    });
    if (ok) {
      setFile(null);
      setVersion("");
      setChangelog("");
      setChangelogBn("");
      setSignatureB64("");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          {t("নতুন ফার্মওয়্যার আপলোড", "Upload New Firmware")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">{t("ভার্সন (v1.0.0)", "Version (v1.0.0)")}</Label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0.0"
              className="bg-slate-800/80 border-cyan-500/20 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-300">{t("রিলিজ চ্যানেল", "Release Channel")}</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger className="bg-slate-800/80 border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">{t("স্থিতিশীল (Stable)", "Stable")}</SelectItem>
                <SelectItem value="beta">{t("বিটা (Beta)", "Beta")}</SelectItem>
                <SelectItem value="canary">{t("ক্যানারি (Canary)", "Canary")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300">{t("বোর্ড টাইপ", "Board Type")}</Label>
            <Select value={boardType} onValueChange={setBoardType}>
              <SelectTrigger className="bg-slate-800/80 border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="esp32_devkit_v1">ESP32 DevKit v1</SelectItem>
                <SelectItem value="esp32_wroom_32">ESP32-WROOM-32</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300">{t("সর্বনিম্ন রিলে সংখ্যা", "Min Relay Count")}</Label>
            <Input
              type="number"
              value={minRelays}
              onChange={(e) => setMinRelays(e.target.value)}
              className="bg-slate-800/80 border-cyan-500/20 text-white"
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-300">{t("চেঞ্জলগ (English)", "Changelog (English)")}</Label>
          <Textarea
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={2}
            className="bg-slate-800/80 border-cyan-500/20 text-white"
          />
        </div>
        <div>
          <Label className="text-slate-300">{t("চেঞ্জলগ (বাংলা)", "Changelog (Bengali)")}</Label>
          <Textarea
            value={changelogBn}
            onChange={(e) => setChangelogBn(e.target.value)}
            rows={2}
            className="bg-slate-800/80 border-cyan-500/20 text-white"
          />
        </div>

        <div>
          <Label className="text-slate-300">{t(".bin ফাইল", ".bin File")}</Label>
          <Input
            type="file"
            accept=".bin"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="bg-slate-800/80 border-cyan-500/20 text-white file:text-white file:bg-cyan-600 file:border-0 file:rounded file:px-3 file:py-1 file:mr-3"
          />
          {file && (
            <p className="text-sm text-slate-400 mt-1">
              {file.name} — {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>

        {/* ─── Phase 5 Hardening fields ─── */}
        <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            🔐 {t("সিকিউরিটি ও রোলআউট হার্ডেনিং (Phase 5)", "Security & Rollout Hardening (Phase 5)")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">
                {t("সাইনিং কী (Ed25519)", "Signing Key (Ed25519)")}
              </Label>
              <Select value={signingKeyId} onValueChange={setSigningKeyId}>
                <SelectTrigger className="bg-slate-800/80 border-amber-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("কোনোটি না (signed না)", "None (unsigned)")}</SelectItem>
                  {signingKeys?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.key_name} ({k.algorithm})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">
                {t("সিগনেচার (Base64)", "Signature (Base64)")}
              </Label>
              <Input
                value={signatureB64}
                onChange={(e) => setSignatureB64(e.target.value)}
                placeholder="ed25519 sig of SHA-256(firmware)"
                className="bg-slate-800/80 border-amber-500/20 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1">
              <Label className="text-slate-300 text-xs flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={windowEnabled}
                  onChange={(e) => setWindowEnabled(e.target.checked)}
                />
                {t("আপডেট উইন্ডো", "Update Window")}
              </Label>
              <p className="text-[10px] text-slate-500 mt-1">{t("Asia/Dhaka সময়", "Asia/Dhaka time")}</p>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">{t("শুরু (ঘণ্টা)", "Start (hour)")}</Label>
              <Input
                type="number" min="0" max="23"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                disabled={!windowEnabled}
                className="bg-slate-800/80 border-amber-500/20 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">{t("শেষ (ঘণ্টা)", "End (hour)")}</Label>
              <Input
                type="number" min="0" max="23"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                disabled={!windowEnabled}
                className="bg-slate-800/80 border-amber-500/20 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">{t("Health Gate %", "Health Gate %")}</Label>
              <Input
                type="number" min="50" max="100" step="0.5"
                value={healthMinPct}
                onChange={(e) => setHealthMinPct(e.target.value)}
                className="bg-slate-800/80 border-amber-500/20 text-white"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {t(
              "সিগনেচার দিলে ESP32 boot এর আগে verify করবে। উইন্ডোর বাইরে firmware push হবে না। Health gate fail হলে rollout auto-pause।",
              "Signed firmware is verified by ESP32 before flashing. Pushes are blocked outside the window. Health-gate failure auto-pauses the rollout.",
            )}
          </p>
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("আপলোড হচ্ছে...", "Uploading...")}</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> {t("আপলোড করুন", "Upload")}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
