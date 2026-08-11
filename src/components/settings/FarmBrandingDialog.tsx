import { useEffect, useState } from 'react';
import { Pencil, Loader2, BadgeCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContextSafe } from '@/context/FarmContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Lets a farm owner set the brand name + registration number that appear
 * on the public QR trace page (get_public_batch_trace falls back to the
 * organization/farm name when these are empty).
 */
export function FarmBrandingDialog() {
  const { language } = useAuth();
  const farmCtx = useFarmContextSafe();
  const farm = farmCtx?.currentFarm ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && farm) {
      setBrandName((farm as { brand_name?: string | null }).brand_name || '');
      setRegNo((farm as { reg_no?: string | null }).reg_no || '');
    }
  }, [open, farm]);

  const bn = language === 'bn';

  const handleSave = async () => {
    if (!farm?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('farms')
        .update({ brand_name: brandName.trim() || null, reg_no: regNo.trim() || null })
        .eq('id', farm.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['user-farms'] });
      toast({ title: bn ? 'সেভ হয়েছে!' : 'Saved!', description: bn ? 'QR পেজে আপডেট হবে' : 'Public QR page updated' });
      setOpen(false);
    } catch (e) {
      toast({
        title: bn ? 'ত্রুটি' : 'Error',
        description: bn ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!farm) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={bn ? 'ব্র্যান্ড ও নিবন্ধন সম্পাদনা' : 'Edit brand & registration'}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary-foreground/90 bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors"
        >
          <Pencil size={12} />
          {bn ? 'প্রোফাইল এডিট' : 'Edit profile'}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck size={18} />
            {bn ? 'ব্র্যান্ড ও নিবন্ধন তথ্য' : 'Brand & registration'}
          </DialogTitle>
          <DialogDescription>
            {bn
              ? 'এই তথ্য QR স্ক্যান করলে পাবলিক ট্রেস পেজে দেখাবে।'
              : 'These details appear on the public QR trace page.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">{bn ? 'ব্র্যান্ডের নাম' : 'Brand name'}</Label>
            <Input
              id="brand-name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={bn ? 'যেমন: সবুজ পোল্ট্রি ফার্ম' : 'e.g. Green Poultry Farm'}
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-no">{bn ? 'নিবন্ধন নং' : 'Registration no.'}</Label>
            <Input
              id="reg-no"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder={bn ? 'যেমন: DLS-2026-01234' : 'e.g. DLS-2026-01234'}
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              {bn
                ? 'খালি রাখলে সিস্টেমের স্বয়ংক্রিয় নিবন্ধন নং দেখাবে।'
                : 'Leave empty to use the auto-generated registration number.'}
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            {bn ? 'ফার্ম: ' : 'Farm: '}
            <span className="font-medium text-foreground">{farm.name}</span>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bn ? 'সেভ করুন' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
