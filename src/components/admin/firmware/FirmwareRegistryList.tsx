import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cpu, CheckCircle2, XCircle, FileCode2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  t: (bn: string, en: string) => string;
  firmwares?: any[] | null;
  isLoading: boolean;
  onToggleActive: (args: { id: string; is_active: boolean }) => void;
}

export function FirmwareRegistryList({ t, firmwares, isLoading, onToggleActive }: Props) {
  const activeStable = firmwares?.find((f) => f.is_active && f.release_channel === 'stable');

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          {t("আপলোডকৃত ফার্মওয়্যার", "Uploaded Firmware")}
          {activeStable && (
            <Badge className="ml-auto bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono">
              {t('সক্রিয়:', 'Active:')} {activeStable.version}
            </Badge>
          )}
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
                        {Array.isArray(fw.min_hardware?.board_types) && fw.min_hardware.board_types.join(', ')}
                        {fw.min_hardware?.min_relay_count ? ` • ${fw.min_hardware.min_relay_count}-ch relay` : ''}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {fw.signature_b64 ? (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/40">
                          🔐 {t("সাইনড", "Signed")}
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                          ⚠️ {t("সাইন করা হয়নি", "Unsigned")}
                        </Badge>
                      )}
                      {fw.update_window_enabled && (
                        <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/40">
                          ⏰ {fw.update_window_start_hour}:00–{fw.update_window_end_hour}:00
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleActive({ id: fw.id, is_active: !fw.is_active })}
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
  );
}
