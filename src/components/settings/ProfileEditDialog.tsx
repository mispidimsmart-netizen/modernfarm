import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Upload, User, BadgeCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContextSafe } from '@/context/FarmContext';
import { useProfile, useUpdateProfile } from '@/hooks/useFarmData';
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
 * One place for the farmer to edit everything that shows up on the public QR
 * trace page and in the admin user list: photo, owner name, brand (= farm)
 * name, mobile number and registration number.
 */
export function ProfileEditDialog() {
  const { language, user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const farmCtx = useFarmContextSafe();
  const farm = farmCtx?.currentFarm as
    | ({ id: string; name: string; brand_name?: string | null; reg_no?: string | null; reg_date?: string | null; location?: string | null })
    | null
    | undefined;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [phone, setPhone] = useState('');
  const [regNo, setRegNo] = useState('');
  const [regDate, setRegDate] = useState('');


  const bn = language === 'bn';

  useEffect(() => {
    if (!open) return;
    setAvatarUrl(profile?.avatar_url ?? null);
    setOwnerName(profile?.user_name || '');
    setBrandName(farm?.brand_name || profile?.farm_name || farm?.name || '');
    setPhone(profile?.phone || '');
    setRegNo(farm?.reg_no || '');
    setRegDate(farm?.reg_date ? String(farm.reg_date).slice(0, 10) : '');

  }, [open, profile, farm]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: bn ? 'ভুল ফাইল টাইপ' : 'Invalid file type', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: bn ? 'ফাইল খুব বড় (সর্বোচ্চ ৫MB)' : 'File too large (max 5MB)', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(urlData.publicUrl);
    } catch {
      toast({ title: bn ? 'আপলোড ব্যর্থ' : 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        avatar_url: avatarUrl,
        user_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        farm_name: brandName.trim() || null,
      } as never);

      if (farm?.id) {
        const { error } = await supabase
          .from('farms')
          .update({
            brand_name: brandName.trim() || null,
            name: brandName.trim() || farm.name,
            reg_no: regNo.trim() || null,
            reg_date: regDate || null,

          })
          .eq('id', farm.id);
        if (error) throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['user-farms'] }),
        queryClient.invalidateQueries({ queryKey: ['public-trace'] }),
        queryClient.invalidateQueries({ queryKey: ['batch-trace-pages'] }),
      ]);


      toast({
        title: bn ? 'সেভ হয়েছে!' : 'Saved!',
        description: bn ? 'QR পেজ ও অ্যাডমিন প্যানেলে আপডেট হবে' : 'Public QR page and admin panel updated',
      });
      setOpen(false);
    } catch {
      toast({ title: bn ? 'ত্রুটি, আবার চেষ্টা করুন' : 'Error, please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={bn ? 'প্রোফাইল এডিট' : 'Edit profile'}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 transition-colors"
        >
          <Pencil size={14} />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck size={18} />
            {bn ? 'প্রোফাইল তথ্য' : 'Profile details'}
          </DialogTitle>
          <DialogDescription>
            {bn
              ? 'এই তথ্যগুলোই QR স্ক্যানের পাবলিক পেজে দেখাবে।'
              : 'These details appear on the public QR trace page.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
              {avatarUrl ? (
                <img src={avatarUrl} alt={bn ? 'প্রোফাইল ছবি' : 'Profile photo'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={32} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {bn ? 'ছবি পরিবর্তন' : 'Change photo'}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">{bn ? 'সর্বোচ্চ ৫MB' : 'Max 5MB'}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner-name">{bn ? 'মালিকের নাম' : 'Owner name'}</Label>
            <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={60} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-name">{bn ? 'ব্র্যান্ড / ফার্মের নাম' : 'Brand / farm name'}</Label>
            <Input id="brand-name" value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={80} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">{bn ? 'মোবাইল নং' : 'Mobile number'}</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-no">{bn ? 'নিবন্ধন নং' : 'Registration no.'}</Label>
            <Input id="reg-no" value={regNo} onChange={(e) => setRegNo(e.target.value)} maxLength={40} />
            <p className="text-xs text-muted-foreground">
              {bn ? 'খালি রাখলে স্বয়ংক্রিয় নিবন্ধন নং দেখাবে।' : 'Leave empty for the auto-generated number.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-date">{bn ? 'নিবন্ধনের তারিখ' : 'Registration date'}</Label>
            <Input id="reg-date" type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {bn ? 'খালি রাখলে অ্যাকাউন্ট তৈরির তারিখ দেখাবে।' : 'Leave empty to show the account creation date.'}
            </p>
          </div>


          <Button onClick={handleSave} disabled={saving || uploading} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bn ? 'সেভ করুন' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
