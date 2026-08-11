import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, X, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useFarmData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ProfileAvatarUpload({ readOnly = false }: { readOnly?: boolean } = {}) {
  const { language, user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const t = {
    changePhoto: { bn: 'ছবি পরিবর্তন', en: 'Change Photo' },
    uploadPhoto: { bn: 'ছবি আপলোড', en: 'Upload Photo' },
    selectPhoto: { bn: 'ছবি নির্বাচন করুন', en: 'Select Photo' },
    uploading: { bn: 'আপলোড হচ্ছে...', en: 'Uploading...' },
    success: { bn: 'ছবি আপলোড হয়েছে!', en: 'Photo uploaded!' },
    error: { bn: 'আপলোড ব্যর্থ', en: 'Upload failed' },
    removePhoto: { bn: 'ছবি সরান', en: 'Remove Photo' },
    tapToChange: { bn: 'ছবি পরিবর্তন করতে ক্লিক করুন', en: 'Tap to change photo' },
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: language === 'bn' ? 'ভুল ফাইল টাইপ' : 'Invalid file type',
        description: language === 'bn' ? 'শুধুমাত্র ছবি ফাইল গ্রহণযোগ্য' : 'Only image files are allowed',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: language === 'bn' ? 'ফাইল খুব বড়' : 'File too large',
        description: language === 'bn' ? 'সর্বোচ্চ ৫MB' : 'Maximum 5MB allowed',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await updateProfile.mutateAsync({ avatar_url: urlData.publicUrl });

      toast({
        title: t.success[language],
        description: language === 'bn' ? 'আপনার প্রোফাইল ছবি আপডেট হয়েছে' : 'Your profile photo has been updated',
      });

      setDialogOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t.error[language],
        description: language === 'bn' ? 'আবার চেষ্টা করুন' : 'Please try again',
        variant: 'destructive',
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || !profile?.avatar_url) return;

    setIsUploading(true);

    try {
      // Delete from storage
      const oldPath = profile.avatar_url.split('/avatars/')[1];
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Update profile
      await updateProfile.mutateAsync({ avatar_url: null });

      setPreviewUrl(null);

      toast({
        title: language === 'bn' ? 'ছবি সরানো হয়েছে' : 'Photo removed',
      });

      setDialogOpen(false);
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: t.error[language],
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || profile?.avatar_url;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative group"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm overflow-hidden">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={32} className="text-white" />
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={20} className="text-white" />
          </div>
        </motion.button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={20} />
            {t.uploadPhoto[language]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={48} className="text-muted-foreground" />
                </div>
              )}

              <AnimatePresence>
                {isUploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.uploading[language]}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t.selectPhoto[language]}
                </>
              )}
            </Button>

            {displayUrl && (
              <Button
                variant="outline"
                onClick={handleRemovePhoto}
                disabled={isUploading}
                className="w-full text-destructive hover:text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                {t.removePhoto[language]}
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {language === 'bn' 
              ? 'JPG, PNG, GIF ফাইল গ্রহণযোগ্য (সর্বোচ্চ ৫MB)'
              : 'JPG, PNG, GIF files accepted (max 5MB)'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
