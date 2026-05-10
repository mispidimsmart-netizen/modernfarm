import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export function WeeklyReportCard() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("farm_settings")
        .select("weekly_report_enabled, weekly_report_email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setEnabled(!!(data as any).weekly_report_enabled);
        setEmail((data as any).weekly_report_email ?? user.email ?? "");
      } else {
        setEmail(user.email ?? "");
      }
      const { data: log } = await supabase
        .from("weekly_report_log")
        .select("signed_url")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (log?.signed_url) setLastUrl(log.signed_url);
    })();
  }, [user]);

  const save = async (nextEnabled: boolean, nextEmail: string) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("farm_settings")
      .update({ weekly_report_enabled: nextEnabled, weekly_report_email: nextEmail || null })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "সেভ করা যায়নি", description: error.message, variant: "destructive" });
    else toast({ title: "সেটিংস সংরক্ষিত হয়েছে" });
  };

  const generateNow = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-farm-report", {
        body: {},
      });
      if (error) throw error;
      const first = (data as any)?.results?.[0];
      if (first?.url) {
        setLastUrl(first.url);
        toast({ title: "রিপোর্ট তৈরি হয়েছে", description: "ডাউনলোড লিংক প্রস্তুত।" });
      } else {
        toast({ title: "রিপোর্ট তৈরি হয়েছে" });
      }
    } catch (e: any) {
      toast({ title: "তৈরি করা যায়নি", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          সাপ্তাহিক ইমেইল রিপোর্ট
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          প্রতি সোমবার সকাল ৮টায় (এশিয়া/ঢাকা) আপনার খামারের গত ৭ দিনের সারাংশ
          CSV হিসেবে তৈরি হবে। ইমেইল ডোমেইন সেটআপ সম্পন্ন হলে স্বয়ংক্রিয়ভাবে ইমেইলে পাঠানো হবে; এর আগ পর্যন্ত
          আপনি এখান থেকেই সর্বশেষ রিপোর্ট ডাউনলোড করতে পারবেন।
        </p>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">সাপ্তাহিক রিপোর্ট চালু</Label>
            <p className="text-xs text-muted-foreground">প্রতি সপ্তাহে স্বয়ংক্রিয় তৈরি</p>
          </div>
          <Switch
            checked={enabled}
            disabled={saving}
            onCheckedChange={(v) => {
              setEnabled(v);
              save(v, email);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weekly-email" className="text-sm">প্রাপক ইমেইল</Label>
          <div className="flex gap-2">
            <Input
              id="weekly-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => save(enabled, email)}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={generateNow} disabled={generating} variant="outline" className="flex-1">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            এখনই তৈরি করুন
          </Button>
          {lastUrl && (
            <Button asChild variant="secondary" className="flex-1">
              <a href={lastUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                সর্বশেষ রিপোর্ট
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
