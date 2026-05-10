import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, Power } from "lucide-react";
import { format } from "date-fns";

interface Props {
  language: "bn" | "en";
}

export function SigningKeysCard({ language }: Props) {
  const t = (bn: string, en: string) => (language === "bn" ? bn : en);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [notes, setNotes] = useState("");

  const { data: keys, isLoading } = useQuery({
    queryKey: ["firmware-signing-keys-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("firmware_signing_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createKey = useMutation({
    mutationFn: async () => {
      if (!keyName.trim()) throw new Error(t("নাম দিন", "Name required"));
      // Validate base64 + length (Ed25519 public key = 32 bytes → 44 base64 chars)
      try {
        const decoded = atob(publicKey.trim());
        if (decoded.length !== 32) {
          throw new Error(
            t("Ed25519 পাবলিক কী ৩২ বাইট হতে হবে (৪৪ Base64 অক্ষর)",
              "Ed25519 public key must be 32 bytes (44 Base64 chars)"),
          );
        }
      } catch (e) {
        throw new Error(
          t("অবৈধ Base64 পাবলিক কী", "Invalid Base64 public key"),
        );
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("firmware_signing_keys").insert({
        key_name: keyName.trim(),
        algorithm: "ed25519",
        public_key: publicKey.trim(),
        notes: notes.trim() || null,
        is_active: true,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("সাইনিং কী যোগ হয়েছে", "Signing key added"));
      setKeyName(""); setPublicKey(""); setNotes(""); setShowForm(false);
      qc.invalidateQueries({ queryKey: ["firmware-signing-keys-all"] });
      qc.invalidateQueries({ queryKey: ["firmware-signing-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("firmware_signing_keys")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firmware-signing-keys-all"] });
      qc.invalidateQueries({ queryKey: ["firmware-signing-keys"] });
    },
  });

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          {t("ফার্মওয়্যার সাইনিং কী", "Firmware Signing Keys")}
          <Badge variant="outline" className="ml-auto text-xs">{keys?.length ?? 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <details className="rounded-lg bg-slate-950/40 border border-slate-700 p-3">
          <summary className="cursor-pointer text-xs text-slate-300 font-semibold">
            {t("কীভাবে Ed25519 কী জোড়া তৈরি করবেন?", "How to generate an Ed25519 key pair?")}
          </summary>
          <pre className="mt-2 text-[11px] text-emerald-300 bg-black/40 p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`# OpenSSL দিয়ে কী জোড়া তৈরি করুন:
openssl genpkey -algorithm ed25519 -out signing.key
openssl pkey -in signing.key -pubout -out signing.pub

# পাবলিক কী Base64 (raw 32 bytes):
openssl pkey -in signing.key -pubout -outform DER \\
  | tail -c 32 | base64

# .bin ফাইল sign করতে (হ্যাশের উপর সিগনেচার):
openssl dgst -sha256 -binary firmware.bin | \\
  openssl pkeyutl -sign -inkey signing.key -rawin | base64`}
          </pre>
          <p className="text-[11px] text-amber-300 mt-2">
            ⚠️ {t(
              "প্রাইভেট কী (signing.key) কখনো আপলোড করবেন না — শুধু এই সার্ভারে রাখুন।",
              "Never upload the private key (signing.key) — keep it on this server only.",
            )}
          </p>
        </details>

        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            className="w-full border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("নতুন সাইনিং কী যোগ করুন", "Add Signing Key")}
          </Button>
        ) : (
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-3">
            <div>
              <Label className="text-slate-300 text-xs">{t("কীর নাম", "Key Name")}</Label>
              <Input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="prod-2026"
                className="bg-slate-800/80 border-purple-500/20 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">
                {t("পাবলিক কী (Base64, ৪৪ অক্ষর)", "Public Key (Base64, 44 chars)")}
              </Label>
              <Input
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="MCowBQYDK2VwAyEA..."
                className="bg-slate-800/80 border-purple-500/20 text-white font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">{t("নোট (ঐচ্ছিক)", "Notes (optional)")}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("যেমন: প্রোডাকশন কী, ২০২৬ rotation", "e.g., Production key, 2026 rotation")}
                className="bg-slate-800/80 border-purple-500/20 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createKey.mutate()}
                disabled={createKey.isPending || !keyName || !publicKey}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white"
              >
                {t("সংরক্ষণ করুন", "Save Key")}
              </Button>
              <Button
                onClick={() => { setShowForm(false); setKeyName(""); setPublicKey(""); setNotes(""); }}
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                {t("বাতিল", "Cancel")}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-slate-400 text-sm">{t("লোড হচ্ছে...", "Loading...")}</p>
        ) : !keys?.length ? (
          <p className="text-slate-400 text-sm text-center py-4">
            {t("কোনো সাইনিং কী যোগ করা হয়নি", "No signing keys yet")}
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <KeyRound className={k.is_active ? "w-4 h-4 text-emerald-400" : "w-4 h-4 text-slate-500"} />
                    <span className="font-mono text-sm text-white truncate">{k.key_name}</span>
                    <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300">
                      {k.algorithm}
                    </Badge>
                    {k.is_active && (
                      <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                        {t("সক্রিয়", "Active")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                    {k.public_key.slice(0, 40)}...
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {format(new Date(k.created_at), "yyyy-MM-dd HH:mm")}
                    {k.notes && ` • ${k.notes}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActive.mutate({ id: k.id, is_active: !k.is_active })}
                  className="text-slate-300 hover:bg-slate-700"
                  title={k.is_active ? t("নিষ্ক্রিয় করুন", "Disable") : t("সক্রিয় করুন", "Enable")}
                >
                  <Power className={k.is_active ? "w-4 h-4 text-emerald-400" : "w-4 h-4 text-slate-500"} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
