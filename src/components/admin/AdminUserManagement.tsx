import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { AdminUser } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Ban, UserCheck, Pencil, Save, Loader2 } from 'lucide-react';

interface AdminUserManagementProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  language: 'bn' | 'en';
}

const t = {
  bn: {
    editUser: 'ইউজার এডিট করুন',
    editDescription: 'ইউজারের তথ্য পরিবর্তন করুন',
    userName: 'নাম',
    phone: 'মোবাইল নম্বর',
    email: 'ইমেইল',
    farmName: 'ফার্মের নাম',
    farmType: 'ফার্মের ধরণ',
    layer: 'লেয়ার',
    broiler: 'ব্রয়লার',
    save: 'সেভ করুন',
    cancel: 'বাতিল',
    saving: 'সেভ হচ্ছে...',
    saved: 'সেভ হয়েছে!',
    error: 'ত্রুটি হয়েছে',
    blockUser: 'ইউজার ব্লক করুন',
    unblockUser: 'আনব্লক করুন',
    blockConfirmTitle: 'ইউজার ব্লক করতে চান?',
    blockConfirmDesc: 'এই ইউজার ব্লক করলে তারা অ্যাপে লগইন করতে পারবে না।',
    unblockConfirmTitle: 'ইউজার আনব্লক করতে চান?',
    unblockConfirmDesc: 'এই ইউজার আনব্লক করলে তারা আবার অ্যাপে লগইন করতে পারবে।',
    confirm: 'নিশ্চিত করুন',
    blocked: 'ব্লকড',
    active: 'সক্রিয়',
    userBlocked: 'ইউজার ব্লক করা হয়েছে',
    userUnblocked: 'ইউজার আনব্লক করা হয়েছে',
  },
  en: {
    editUser: 'Edit User',
    editDescription: 'Update user information',
    userName: 'Name',
    phone: 'Phone Number',
    email: 'Email',
    farmName: 'Farm Name',
    farmType: 'Farm Type',
    layer: 'Layer',
    broiler: 'Broiler',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    saved: 'Saved!',
    error: 'Error occurred',
    blockUser: 'Block User',
    unblockUser: 'Unblock User',
    blockConfirmTitle: 'Block this user?',
    blockConfirmDesc: 'This user will not be able to login to the app.',
    unblockConfirmTitle: 'Unblock this user?',
    unblockConfirmDesc: 'This user will be able to login to the app again.',
    confirm: 'Confirm',
    blocked: 'Blocked',
    active: 'Active',
    userBlocked: 'User has been blocked',
    userUnblocked: 'User has been unblocked',
  },
};

export function AdminUserManagement({ user, isOpen, onClose, language }: AdminUserManagementProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const labels = t[language];

  const [formData, setFormData] = useState({
    user_name: user.user_name || '',
    phone: user.phone || '',
    email: user.email || '',
    farm_name: user.farm_name || '',
    farm_type: user.farm_type || 'layer',
  });

  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const isBlocked = (user as any).is_blocked || false;

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          user_name: data.user_name || null,
          phone: data.phone || null,
          email: data.email || null,
          farm_name: data.farm_name,
          farm_type: data.farm_type,
        } as any)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: labels.saved });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      onClose();
    },
    onError: (error) => {
      toast({ title: labels.error, description: String(error), variant: 'destructive' });
    },
  });

  // Block/Unblock mutation
  const blockMutation = useMutation({
    mutationFn: async (block: boolean) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_blocked: block,
          blocked_at: block ? new Date().toISOString() : null,
          blocked_by: block ? currentUser?.id : null,
        } as any)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, block) => {
      toast({ title: block ? labels.userBlocked : labels.userUnblocked });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setShowBlockConfirm(false);
      onClose();
    },
    onError: (error) => {
      toast({ title: labels.error, description: String(error), variant: 'destructive' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleBlock = () => {
    blockMutation.mutate(!isBlocked);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-800 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-purple-400" />
              {labels.editUser}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {labels.editDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status:</span>
              <Badge 
                variant="outline" 
                className={isBlocked 
                  ? 'border-red-500 text-red-400' 
                  : 'border-green-500 text-green-400'
                }
              >
                {isBlocked ? `🚫 ${labels.blocked}` : `✅ ${labels.active}`}
              </Badge>
            </div>

            {/* User Name */}
            <div className="space-y-2">
              <Label className="text-gray-300">{labels.userName}</Label>
              <Input
                value={formData.user_name}
                onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                className="bg-slate-700/50 border-white/10 text-white"
                placeholder={labels.userName}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-gray-300">{labels.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700/50 border-white/10 text-white"
                placeholder="01XXXXXXXXX"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-gray-300">{labels.email}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700/50 border-white/10 text-white"
                placeholder="example@email.com"
              />
            </div>

            {/* Farm Name */}
            <div className="space-y-2">
              <Label className="text-gray-300">{labels.farmName}</Label>
              <Input
                value={formData.farm_name}
                onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                className="bg-slate-700/50 border-white/10 text-white"
                placeholder={labels.farmName}
              />
            </div>

            {/* Farm Type */}
            <div className="space-y-2">
              <Label className="text-gray-300">{labels.farmType}</Label>
              <Select
                value={formData.farm_type}
                onValueChange={(value) => setFormData({ ...formData, farm_type: value })}
              >
                <SelectTrigger className="bg-slate-700/50 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="layer" className="text-white hover:bg-slate-700">
                    🥚 {labels.layer}
                  </SelectItem>
                  <SelectItem value="broiler" className="text-white hover:bg-slate-700">
                    🐔 {labels.broiler}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {/* Block/Unblock Button */}
            <Button
              type="button"
              variant={isBlocked ? 'outline' : 'destructive'}
              onClick={() => setShowBlockConfirm(true)}
              className={isBlocked 
                ? 'border-green-500 text-green-400 hover:bg-green-500/10' 
                : ''
              }
            >
              {isBlocked ? (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  {labels.unblockUser}
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  {labels.blockUser}
                </>
              )}
            </Button>

            <div className="flex-1" />

            <Button variant="ghost" onClick={onClose} className="text-gray-400">
              {labels.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {labels.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {labels.save}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock Confirmation Dialog */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent className="bg-slate-800 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? labels.unblockConfirmTitle : labels.blockConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {isBlocked ? labels.unblockConfirmDesc : labels.blockConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-white/10 text-white hover:bg-slate-600">
              {labels.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={blockMutation.isPending}
              className={isBlocked 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {blockMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                labels.confirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
