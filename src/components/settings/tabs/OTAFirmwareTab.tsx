import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HardDrive, Cloud, Cpu, ArrowRight, RefreshCw, CheckCircle2,
  AlertCircle, Shield, Globe, Home, Clock, Download, Flame,
  ShieldCheck, XCircle, Loader2, HelpCircle, ChevronDown,
  FileCode, Settings as SettingsIcon, Upload, Wrench,
} from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// OTA Progress Timeline — visualizes queued → downloading → flashing →
// verifying → done/failed using device_health.ota_status + ota_progress.
// ---------------------------------------------------------------------------

type OtaStage = 'queued' | 'downloading' | 'flashing' | 'verifying' | 'done' | 'failed';

const STAGE_ORDER: OtaStage[] = ['queued', 'downloading', 'flashing', 'verifying', 'done'];

// Map raw firmware status strings (from ESP32) to a normalized UI stage.
function mapOtaStatus(status: string | null | undefined): OtaStage | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (['idle', 'up_to_date', 'uptodate', 'none'].includes(s)) return null;
  if (['available', 'pending', 'queued', 'scheduled'].includes(s)) return 'queued';
  if (['downloading', 'fetching', 'download'].includes(s)) return 'downloading';
  if (['flashing', 'writing', 'installing', 'install'].includes(s)) return 'flashing';
  if (['verifying', 'verify', 'crc_check', 'validating'].includes(s)) return 'verifying';
  if (['complete', 'completed', 'done', 'success', 'finished', 'rebooted'].includes(s)) return 'done';
  if (['failed', 'error', 'rollback', 'aborted'].includes(s)) return 'failed';
  return null;
}

interface StageMeta {
  icon: typeof Cloud;
  label: string;
  labelBn: string;
}

const STAGE_META: Record<OtaStage, StageMeta> = {
  queued:      { icon: Clock,        label: 'Queued',      labelBn: 'অপেক্ষমাণ' },
  downloading: { icon: Download,     label: 'Downloading', labelBn: 'ডাউনলোড' },
  flashing:    { icon: Flame,        label: 'Flashing',    labelBn: 'ফ্ল্যাশিং' },
  verifying:   { icon: ShieldCheck,  label: 'Verifying',   labelBn: 'যাচাই' },
  done:        { icon: CheckCircle2, label: 'Done',        labelBn: 'সম্পন্ন' },
  failed:      { icon: XCircle,      label: 'Failed',      labelBn: 'ব্যর্থ' },
};

interface OtaProgressTimelineProps {
  stage: OtaStage;
  progress: number | null;
  language: 'bn' | 'en';
  targetVersion?: string | null;
}

function OtaProgressTimeline({ stage, progress, language, targetVersion }: OtaProgressTimelineProps) {
  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);
  const isFailed = stage === 'failed';
  const currentIdx = isFailed ? -1 : STAGE_ORDER.indexOf(stage);

  // For the active stage, prefer real ota_progress (0-100); else infer from index.
  const showInlineProgress =
    stage === 'downloading' && progress !== null && progress >= 0 && progress <= 100;

  return (
    <div className="mt-3 space-y-3 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          {isFailed ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : stage === 'done' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
          )}
          <span>
            {isFailed
              ? t('আপডেট ব্যর্থ', 'Update failed')
              : stage === 'done'
                ? t('আপডেট সম্পন্ন', 'Update complete')
                : t('আপডেট চলছে', 'Update in progress')}
          </span>
        </div>
        {targetVersion && (
          <Badge variant="outline" className="font-mono text-[10px]">
            → {targetVersion}
          </Badge>
        )}
      </div>

      {/* Stage chips */}
      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((s, idx) => {
          const meta = STAGE_META[s];
          const Icon = meta.icon;
          const isActive = !isFailed && idx === currentIdx;
          const isCompleted = !isFailed && idx < currentIdx;
          const isPending = !isFailed && idx > currentIdx;

          return (
            <div key={s} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 transition-colors',
                  isActive && 'bg-cyan-500/15 text-cyan-600 ring-1 ring-cyan-500/40',
                  isCompleted && 'bg-emerald-500/10 text-emerald-600',
                  isPending && 'text-muted-foreground/50',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive && 'animate-pulse')} />
                <span className="text-[9px] font-medium leading-none text-center">
                  {language === 'bn' ? meta.labelBn : meta.label}
                </span>
              </div>
              {idx < STAGE_ORDER.length - 1 && (
                <div
                  className={cn(
                    'h-px flex-shrink-0 w-2 transition-colors',
                    idx < currentIdx ? 'bg-emerald-500/60' : 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Inline progress bar for the downloading stage */}
      {showInlineProgress && (
        <div className="space-y-1">
          <Progress value={progress!} className="h-1.5" />
          <p className="text-right text-[10px] text-muted-foreground">{progress}%</p>
        </div>
      )}

      {isFailed && (
        <p className="text-[11px] text-destructive">
          {t(
            'ডিভাইস স্বয়ংক্রিয়ভাবে আগের ভার্সনে ফিরে যাবে। পরে আবার চেষ্টা করুন।',
            'Device will roll back to the previous version. Try again later.',
          )}
        </p>
      )}
    </div>
  );
}


export function OTAFirmwareTab() {
  const { language, user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { data: permissions } = useUserPermissions();
  const { data: deviceHealthList } = useAllDeviceHealth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = permissions?.role === 'admin';
  const t = (bn: string, en: string) => (language === 'bn' ? bn : en);

  // Latest active firmware in registry (informational — same source admin uses)
  const { data: latestFirmware } = useQuery({
    queryKey: ['ota-tab-latest-firmware'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('firmware_registry')
        .select('version, version_code, release_channel, changelog, changelog_bn, created_at')
        .eq('is_active', true)
        .eq('release_channel', 'stable')
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const triggerUpdateCheck = async () => {
    if (!user || !selectedFarmId) {
      toast({
        title: t('ত্রুটি', 'Error'),
        description: t('ফার্ম নির্বাচিত নয়', 'No farm selected'),
        variant: 'destructive',
      });
      return;
    }
    const { error } = await supabase.from('device_commands').insert({
      user_id: user.id,
      farm_id: selectedFarmId,
      device_name: 'ESP32',
      command_type: 'ota_check',
      command_value: true,
      executed: false,
    });
    if (error) {
      toast({ title: t('ত্রুটি', 'Error'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: t('আপডেট চেক পাঠানো হয়েছে', 'Update check sent'),
      description: t('ডিভাইস পরবর্তী চেকইনে আপডেট খুঁজবে', 'Device will check at next sync'),
    });
  };

  const devicesWithFirmware = deviceHealthList?.filter((d) => d.firmware_version) ?? [];
  const latestVersion = latestFirmware?.version;

  return (
    <div className="space-y-4">
      {/* Header / context */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/30">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shrink-0">
              <Cloud className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{t('OTA ফার্মওয়্যার', 'OTA Firmware')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(
                  'ESP32 কন্ট্রোলারের সফটওয়্যার দূর থেকে পরিচালনা ও আপডেট করুন',
                  'Manage and update ESP32 controller firmware over the air',
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step help panel — how to build & upload firmware .bin */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 list-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 shrink-0">
                <HelpCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">
                  {t('কীভাবে নতুন ফার্মওয়্যার তৈরি ও আপলোড করবেন?', 'How to build & upload new firmware?')}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('ধাপে ধাপে গাইড — .bin ফাইল, বোর্ড সেটিংস, পার্টিশন', 'Step-by-step guide — .bin file, board settings, partition')}
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
          </summary>

          <div className="border-t border-amber-500/20 p-4 space-y-4">
            {/* Step 1 — Source file */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">১</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm">{t('সোর্স ফাইল খুঁজুন', 'Find the source file')}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    'প্রজেক্টের public/ ফোল্ডারে ESP32 সোর্স কোড পাওয়া যাবে। প্রধান ফাইল:',
                    'ESP32 source code is in the project\'s public/ folder. Main file:',
                  )}
                </p>
                <div className="rounded-md bg-background border p-2 font-mono text-xs space-y-1">
                  <div>📄 <span className="text-emerald-600 font-semibold">public/esp32-unified.ino</span> {t('— প্রধান', '— main')}</div>
                  <div className="text-muted-foreground">📄 public/esp32-industrial.ino</div>
                  <div className="text-muted-foreground">📄 public/esp32-failsafe.ino</div>
                </div>
              </div>
            </div>

            {/* Step 2 — Compile */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">২</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm">{t('Arduino IDE-তে কম্পাইল করুন', 'Compile in Arduino IDE')}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    'Arduino IDE 2.x বা PlatformIO খুলে .ino ফাইল লোড করুন। তারপর নিচের মতো সেটিংস বাছাই করুন:',
                    'Open Arduino IDE 2.x or PlatformIO and load the .ino file. Then select these settings:',
                  )}
                </p>
                <div className="rounded-md bg-background border p-3 text-xs space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t('বোর্ড', 'Board')}:</span>
                    <span className="font-mono font-semibold text-right">ESP32 Dev Module</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t('চিপ', 'Chip')}:</span>
                    <span className="font-mono font-semibold text-right">ESP32-WROOM-32</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t('ফ্ল্যাশ সাইজ', 'Flash Size')}:</span>
                    <span className="font-mono font-semibold text-right">4MB (32Mb)</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t('আপলোড স্পিড', 'Upload Speed')}:</span>
                    <span className="font-mono font-semibold text-right">115200</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">CPU Frequency:</span>
                    <span className="font-mono font-semibold text-right">240MHz</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 — Partition Scheme */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৩</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm">
                    {t('পার্টিশন স্কিম (গুরুত্বপূর্ণ!)', 'Partition Scheme (Important!)')}
                  </h4>
                </div>
                <div className="rounded-md border-2 border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    Minimal SPIFFS (1.9MB APP with OTA / 190KB SPIFFS)
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive leading-relaxed">
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
                  <Download className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm">{t('.bin ফাইল এক্সপোর্ট করুন', 'Export the .bin file')}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(
                    'Arduino IDE মেনু থেকে: Sketch → Export Compiled Binary (Ctrl+Alt+S)। এটি .ino ফাইলের পাশে .bin ফাইল তৈরি করবে।',
                    'Arduino IDE menu: Sketch → Export Compiled Binary (Ctrl+Alt+S). This creates a .bin file next to your .ino file.',
                  )}
                </p>
                <div className="rounded-md bg-background border p-2 font-mono text-xs">
                  ✅ esp32-unified.ino.esp32.<span className="text-emerald-600 font-semibold">bin</span>
                </div>
              </div>
            </div>

            {/* Step 5 — Upload */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold">৫</div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-sm">{t('Admin → Firmware-এ আপলোড করুন', 'Upload via Admin → Firmware')}</h4>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 leading-relaxed">
                  <li>{t('ভার্সন: সেমান্টিক ফরম্যাট, যেমন', 'Version: semantic format, e.g.')} <span className="font-mono text-foreground">v1.2.3</span></li>
                  <li>{t('চ্যানেল: প্রথমে', 'Channel: first')} <span className="font-mono text-foreground">beta</span> {t(', পরে', ', then')} <span className="font-mono text-foreground">stable</span></li>
                  <li>{t('সিস্টেম স্বয়ংক্রিয়ভাবে CRC32 চেকসাম যাচাই করবে', 'System will auto-verify CRC32 checksum')}</li>
                  <li>{t('শুধু .bin ফাইল গ্রহণযোগ্য — .ino সরাসরি আপলোড হবে না', 'Only .bin accepted — .ino cannot be uploaded directly')}</li>
                </ul>
              </div>
            </div>

            {/* Quick reference link */}
            <div className="rounded-md bg-muted/50 border p-3 text-xs flex items-start gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground leading-relaxed">
                {t(
                  'বিস্তারিত গাইড: ',
                  'Detailed guide: ',
                )}
                <a
                  href="https://docs.espressif.com/projects/arduino-esp32/en/latest/ota_web_update.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  Espressif OTA Documentation
                </a>
              </p>
            </div>
          </div>
        </details>
      </Card>

      {/* Latest available release (informational) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-500" />
            {t('সর্বশেষ উপলব্ধ রিলিজ', 'Latest Available Release')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestFirmware ? (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{latestFirmware.version}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {latestFirmware.release_channel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('প্রকাশিত', 'Released')}: {format(new Date(latestFirmware.created_at), 'yyyy-MM-dd')}
                  </p>
                  {(language === 'bn' ? latestFirmware.changelog_bn : latestFirmware.changelog) && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {language === 'bn' ? latestFirmware.changelog_bn : latestFirmware.changelog}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              {t('কোনো স্থিতিশীল রিলিজ এখনো প্রকাশিত হয়নি', 'No stable release published yet')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your devices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            {t('আপনার ডিভাইসসমূহ', 'Your Devices')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devicesWithFirmware.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('কোনো ডিভাইসের ফার্মওয়্যার তথ্য পাওয়া যায়নি', 'No device firmware info available')}
            </p>
          ) : (
            <div className="space-y-2">
              {devicesWithFirmware.map((d) => {
                const isUpToDate = latestVersion && d.firmware_version === latestVersion;
                const otaStage = mapOtaStatus(d.ota_status);
                return (
                  <div
                    key={d.id}
                    className="rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-sm truncate">{d.firmware_version}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.is_online
                              ? t('🟢 অনলাইন', '🟢 Online')
                              : t('⚫ অফলাইন', '⚫ Offline')}
                          </p>
                        </div>
                      </div>
                      {otaStage && otaStage !== 'done' && otaStage !== 'failed' ? (
                        <Badge className="bg-cyan-500/15 text-cyan-600 border-cyan-500/30">
                          {t('আপডেট চলছে', 'Updating')}
                        </Badge>
                      ) : isUpToDate ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                          {t('হালনাগাদ', 'Up to date')}
                        </Badge>
                      ) : latestVersion ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                          {t('আপডেট আছে', 'Update available')}
                        </Badge>
                      ) : null}
                    </div>

                    {otaStage && (
                      <OtaProgressTimeline
                        stage={otaStage}
                        progress={d.ota_progress}
                        language={language as 'bn' | 'en'}
                        targetVersion={d.ota_version_available}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          <Button
            onClick={triggerUpdateCheck}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('সব ডিভাইসকে আপডেট চেক করতে বলুন', 'Ask all devices to check for updates')}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {t(
              'ডিভাইস পরবর্তী cloud sync-এ স্বয়ংক্রিয়ভাবে নতুন ভার্সন ডাউনলোড করবে',
              'Devices will auto-download new versions at next cloud sync',
            )}
          </p>
        </CardContent>
      </Card>

      {/* Role router — clearly directs each role to the correct workflow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('কোন আপডেট ফ্লো আপনার দরকার?', 'Which update flow do you need?')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          {/* Per-farm device update — for everyone */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={triggerUpdateCheck}
            className="cursor-pointer rounded-xl border bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/30 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 shrink-0">
                <Home className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm">
                    {t('প্রতি-ফার্ম ডিভাইস আপডেট', 'Per-farm device update')}
                  </h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {t('সকলের জন্য', 'All users')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    'আপনার ফার্মের ESP32 ডিভাইসকে সর্বশেষ অনুমোদিত ফার্মওয়্যার ডাউনলোড ও ইনস্টল করার নির্দেশ পাঠান।',
                    'Tell your farm’s ESP32 to download and install the latest approved firmware.',
                  )}
                </p>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-2">
                  {t('আপডেট চেক ট্রিগার করুন', 'Trigger update check')}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Global admin firmware release — admin only */}
          {isAdmin ? (
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate('/admin?tab=firmware')}
              className="cursor-pointer rounded-xl border bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border-purple-500/30 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm">
                      {t('গ্লোবাল ফার্মওয়্যার রিলিজ', 'Global firmware release')}
                    </h4>
                    <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px]">
                      {t('শুধু অ্যাডমিন', 'Admin only')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      'নতুন .bin ফাইল আপলোড করুন (CRC32 ও হার্ডওয়্যার ভ্যালিডেশনসহ), রিলিজ চ্যানেল নির্বাচন করুন এবং সমস্ত ফার্মে প্রকাশ করুন।',
                      'Upload new .bin files (with CRC32 + hardware validation), pick a release channel, and publish to all farms.',
                    )}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-medium text-purple-600 mt-2">
                    {t('অ্যাডমিন → ফার্মওয়্যারে যান', 'Open Admin → Firmware')}
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      {t('গ্লোবাল ফার্মওয়্যার রিলিজ', 'Global firmware release')}
                    </h4>
                    <Badge variant="outline" className="text-[10px]">
                      {t('শুধু অ্যাডমিন', 'Admin only')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      'নতুন .bin ফাইল প্রকাশের অনুমতি শুধুমাত্র সুপার অ্যাডমিনের। আপনি আপনার ডিভাইসগুলোতে অনুমোদিত সর্বশেষ ভার্সন স্বয়ংক্রিয়ভাবে পাবেন।',
                      'Only super admins can publish new .bin files. Your devices automatically receive the latest approved version.',
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
