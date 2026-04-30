import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload, Cpu, CheckCircle2, XCircle, FileCode2, Loader2,
  HelpCircle, ChevronDown, FileCode, Wrench, Settings as SettingsIcon,
  Download, AlertCircle, Globe,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  language: "bn" | "en";
}

function parseVersionCode(v: string): number {
  const m = v.replace(/^v/i, "").match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return 0;
  return parseInt(m[1]) * 1_000_000 + parseInt(m[2]) * 1_000 + parseInt(m[3]);
}

async function crc32Hex(buffer: ArrayBuffer): Promise<string> {
  // Lightweight CRC32 (used as integrity check for OTA)
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export function FirmwareManagementTab({ language }: Props) {
  const qc = useQueryClient();
  const t = (bn: string, en: string) => (language === "bn" ? bn : en);

  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"stable" | "beta" | "canary">("stable");
  const [changelog, setChangelog] = useState("");
  const [changelogBn, setChangelogBn] = useState("");
  const [boardType, setBoardType] = useState("esp32_devkit_v1");
  const [minRelays, setMinRelays] = useState("8");
  const [uploading, setUploading] = useState(false);

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

  const handleUpload = async () => {
    if (!file) return toast.error(t("ফাইল নির্বাচন করুন", "Select a file"));
    if (!version.match(/^v?\d+\.\d+\.\d+$/)) {
      return toast.error(t("ভার্সন ফরম্যাট: v1.0.0", "Version format: v1.0.0"));
    }
    if (!file.name.endsWith(".bin")) {
      return toast.error(t("শুধু .bin ফাইল গ্রহণযোগ্য", "Only .bin files accepted"));
    }

    setUploading(true);
    try {
      const versionClean = version.startsWith("v") ? version : `v${version}`;
      const buffer = await file.arrayBuffer();
      const crc = await crc32Hex(buffer);
      const path = `${channel}/${versionClean}-${Date.now()}.bin`;

      // Upload to storage
      const { error: upErr } = await supabase.storage
        .from("firmware")
        .upload(path, file, {
          contentType: "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("firmware").getPublicUrl(path);

      // Insert into firmware_registry
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("firmware_registry").insert({
        version: versionClean,
        version_code: parseVersionCode(versionClean),
        release_channel: channel,
        file_url: pub.publicUrl,
        file_size_bytes: file.size,
        crc32_checksum: crc,
        changelog: changelog || null,
        changelog_bn: changelogBn || null,
        is_active: true,
        min_hardware: {
          board_types: [boardType],
          min_relay_count: parseInt(minRelays) || 8,
          required_features: [],
        },
        created_by: user?.id,
      });
      if (insErr) throw insErr;

      toast.success(t("ফার্মওয়্যার সফলভাবে আপলোড হয়েছে", "Firmware uploaded successfully"));
      setFile(null);
      setVersion("");
      setChangelog("");
      setChangelogBn("");
      qc.invalidateQueries({ queryKey: ["firmware-registry"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step-by-step help panel — how to build & upload firmware .bin */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-amber-500/30">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 list-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-white">
                  {t('কীভাবে নতুন ফার্মওয়্যার তৈরি ও আপলোড করবেন?', 'How to build & upload new firmware?')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {t('ধাপে ধাপে গাইড — .bin ফাইল, বোর্ড সেটিংস, পার্টিশন', 'Step-by-step guide — .bin file, board settings, partition')}
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-amber-500/20 p-4 space-y-4">
            {/* Downloadable PDF guide */}
            <a
              href="/ota-firmware-guide-bn.pdf"
              download="OTA-ফার্মওয়্যার-গাইড.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 p-3 hover:bg-emerald-500/20 transition-colors group/dl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-emerald-400">
                    {t('সম্পূর্ণ গাইড PDF ডাউনলোড করুন', 'Download full PDF guide')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t(
                      'বাংলায় ৩ পৃষ্ঠার নির্দেশিকা ও প্রথমবার আপলোডের চেকলিস্ট (PDF, ৪০KB)',
                      '3-page Bengali guide with first-time upload checklist (PDF, 40KB)',
                    )}
                  </div>
                </div>
              </div>
              <Download className="h-4 w-4 text-emerald-400 shrink-0 transition-transform group-hover/dl:translate-y-0.5" />
            </a>

            {/* Step 1 — Source file */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">১</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-amber-400" />
                  <h4 className="font-semibold text-sm text-white">{t('সোর্স ফাইল খুঁজুন', 'Find the source file')}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t(
                    "প্রজেক্টের public/ ফোল্ডারে ESP32 সোর্স কোড পাওয়া যাবে। প্রধান ফাইল:",
                    "ESP32 source code is in the project's public/ folder. Main file:",
                  )}
                </p>
                <div className="rounded-md bg-slate-950/60 border border-slate-700 p-2 font-mono text-xs space-y-1 text-slate-300">
                  <div>📄 <span className="text-emerald-400 font-semibold">public/esp32-unified.ino</span> {t('— প্রধান', '— main')}</div>
                  <div className="text-slate-500">📄 public/esp32-industrial.ino</div>
                  <div className="text-slate-500">📄 public/esp32-failsafe.ino</div>
                </div>
              </div>
            </div>

            {/* Step 2 — Compile */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">২</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-400" />
                  <h4 className="font-semibold text-sm text-white">{t('Arduino IDE-তে কম্পাইল করুন', 'Compile in Arduino IDE')}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t(
                    'Arduino IDE 2.x বা PlatformIO খুলে .ino ফাইল লোড করুন। তারপর নিচের মতো সেটিংস বাছাই করুন:',
                    'Open Arduino IDE 2.x or PlatformIO and load the .ino file. Then select these settings:',
                  )}
                </p>
                <div className="rounded-md bg-slate-950/60 border border-slate-700 p-3 text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between gap-2"><span className="text-slate-500">{t('বোর্ড', 'Board')}:</span><span className="font-mono font-semibold text-right">ESP32 Dev Module</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">{t('চিপ', 'Chip')}:</span><span className="font-mono font-semibold text-right">ESP32-WROOM-32</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">{t('ফ্ল্যাশ সাইজ', 'Flash Size')}:</span><span className="font-mono font-semibold text-right">4MB (32Mb)</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">{t('আপলোড স্পিড', 'Upload Speed')}:</span><span className="font-mono font-semibold text-right">115200</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-500">CPU Frequency:</span><span className="font-mono font-semibold text-right">240MHz</span></div>
                </div>
              </div>
            </div>

            {/* Step 3 — Partition Scheme */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৩</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4 text-amber-400" />
                  <h4 className="font-semibold text-sm text-white">
                    {t('পার্টিশন স্কিম (গুরুত্বপূর্ণ!)', 'Partition Scheme (Important!)')}
                  </h4>
                </div>
                <div className="rounded-md border-2 border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
                  <div className="font-mono font-bold text-emerald-400">
                    Minimal SPIFFS (1.9MB APP with OTA / 190KB SPIFFS)
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 p-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">
                    {t(
                      'OTA সাপোর্টের জন্য এই পার্টিশন স্কিম বাধ্যতামূলক। অন্য কিছু বাছাই করলে রিমোট আপডেট কাজ করবে না।',
                      'This partition scheme is mandatory for OTA support. Other choices will break remote updates.',
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 — Export Binary */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৪</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-amber-400" />
                  <h4 className="font-semibold text-sm text-white">{t('.bin ফাইল এক্সপোর্ট করুন', 'Export the .bin file')}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t(
                    'Arduino IDE মেনু থেকে: Sketch → Export Compiled Binary (Ctrl+Alt+S)। এটি .ino ফাইলের পাশে .bin ফাইল তৈরি করবে।',
                    'Arduino IDE menu: Sketch → Export Compiled Binary (Ctrl+Alt+S). This creates a .bin file next to your .ino file.',
                  )}
                </p>
                <div className="rounded-md bg-slate-950/60 border border-slate-700 p-2 font-mono text-xs text-slate-300">
                  ✅ esp32-unified.ino.esp32.<span className="text-emerald-400 font-semibold">bin</span>
                </div>
              </div>
            </div>

            {/* Step 5 — Upload (here in this tab) */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৫</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-amber-400" />
                  <h4 className="font-semibold text-sm text-white">{t('নিচের ফর্ম থেকে আপলোড করুন', 'Upload using the form below')}</h4>
                </div>
                <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
                  <li>{t('ভার্সন: সেমান্টিক ফরম্যাট, যেমন', 'Version: semantic format, e.g.')} <span className="font-mono text-slate-200">v1.2.3</span></li>
                  <li>{t('চ্যানেল: প্রথমে', 'Channel: first')} <span className="font-mono text-slate-200">beta</span> {t(', পরে', ', then')} <span className="font-mono text-slate-200">stable</span></li>
                  <li>{t('সিস্টেম স্বয়ংক্রিয়ভাবে CRC32 চেকসাম যাচাই করবে', 'System will auto-verify CRC32 checksum')}</li>
                  <li>{t('শুধু .bin ফাইল গ্রহণযোগ্য — .ino সরাসরি আপলোড হবে না', 'Only .bin accepted — .ino cannot be uploaded directly')}</li>
                </ul>
              </div>
            </div>

            {/* Reference link */}
            <div className="rounded-md bg-slate-950/60 border border-slate-700 p-3 text-xs flex items-start gap-2">
              <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-slate-400 leading-relaxed">
                {t('বিস্তারিত গাইড: ', 'Detailed guide: ')}
                <a
                  href="https://docs.espressif.com/projects/arduino-esp32/en/latest/ota_web_update.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 underline font-medium"
                >
                  Espressif OTA Documentation
                </a>
              </p>
            </div>
          </div>
        </details>
      </Card>

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

      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            {t("আপলোডকৃত ফার্মওয়্যার", "Uploaded Firmware")}
            {firmwares && firmwares.length > 0 && (() => {
              const activeStable = firmwares.find(f => f.is_active && f.release_channel === 'stable');
              return activeStable ? (
                <Badge className="ml-auto bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono">
                  {t('সক্রিয়:', 'Active:')} {activeStable.version}
                </Badge>
              ) : null;
            })()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-400 text-sm">{t("লোড হচ্ছে...", "Loading...")}</p>
          ) : !firmwares?.length ? (
            <div className="text-center py-8">
              <FileCode2 className="w-12 h-12 mx-auto text-slate-500 mb-2" />
              <p className="text-slate-400">{t("কোনো ফার্মওয়্যার আপলোড করা হয়নি", "No firmware uploaded yet")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {firmwares.map((fw) => (
                <div
                  key={fw.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    {fw.is_active ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white">{fw.version}</span>
                        <Badge variant="outline" className="text-xs border-cyan-500/40 text-cyan-300">
                          {fw.release_channel}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">
                        {fw.file_size_bytes ? `${(fw.file_size_bytes / 1024).toFixed(1)} KB` : "—"}
                        {" • "}CRC: <span className="font-mono">{fw.crc32_checksum?.slice(0, 8) ?? "—"}</span>
                        {" • "}{format(new Date(fw.created_at), "yyyy-MM-dd HH:mm")}
                      </p>
                      {fw.min_hardware && (
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {Array.isArray((fw.min_hardware as any)?.board_types) && (fw.min_hardware as any).board_types.join(', ')}
                          {(fw.min_hardware as any)?.min_relay_count ? ` • ${(fw.min_hardware as any).min_relay_count}-ch relay` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive.mutate({ id: fw.id, is_active: !fw.is_active })}
                    className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                  >
                    {fw.is_active ? t("নিষ্ক্রিয় করুন", "Disable") : t("সক্রিয় করুন", "Enable")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
