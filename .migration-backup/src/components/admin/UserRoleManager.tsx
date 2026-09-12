import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUserPermissions, AccessRole } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, UserCog, Crown, Eye, Tractor, AlertTriangle } from 'lucide-react';

interface UserRoleManagerProps {
  userId: string;
  currentRole?: AccessRole;
  userName?: string;
  onRoleChanged?: () => void;
}

const roleConfig: Record<AccessRole, { 
  icon: typeof Shield; 
  label: { bn: string; en: string }; 
  color: string;
  description: { bn: string; en: string };
}> = {
  viewer: {
    icon: Eye,
    label: { bn: 'ভিউয়ার', en: 'Viewer' },
    color: 'bg-slate-500',
    description: { 
      bn: 'শুধুমাত্র ড্যাশবোর্ড ও অ্যালার্ট দেখতে পারবে', 
      en: 'Can only view dashboard and alerts' 
    },
  },
  farmer: {
    icon: Tractor,
    label: { bn: 'ফার্মার', en: 'Farmer' },
    color: 'bg-green-500',
    description: { 
      bn: 'সাময়িক কন্ট্রোল ও ফার্ম সেটিংস পরিবর্তন করতে পারবে', 
      en: 'Can make temporary control and change farm settings' 
    },
  },
  admin: {
    icon: Crown,
    label: { bn: 'অ্যাডমিন', en: 'Admin' },
    color: 'bg-purple-500',
    description: { 
      bn: 'সম্পূর্ণ কন্ট্রোল, ডিভাইস সেটিংস, ফার্মওয়্যার আপডেট', 
      en: 'Full control, device settings, firmware updates' 
    },
  },
};

export function UserRoleManager({ 
  userId, 
  currentRole = 'farmer',
  userName,
  onRoleChanged,
}: UserRoleManagerProps) {
  const { user, language } = useAuth();
  const { data: permissions } = useUserPermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedRole, setSelectedRole] = useState<AccessRole>(currentRole);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const canManageUsers = permissions?.canManageUsers ?? false;
  const isOwnUser = user?.id === userId;

  const assignRole = useMutation({
    mutationFn: async (newRole: AccessRole) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('assign_user_role', {
        _target_user_id: userId,
        _role: newRole,
        _assigner_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user_role'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' 
          ? 'ইউজারের রোল আপডেট হয়েছে' 
          : 'User role updated successfully',
      });
      onRoleChanged?.();
      setShowConfirmDialog(false);
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRoleChange = (role: AccessRole) => {
    setSelectedRole(role);
    if (role !== currentRole) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirm = () => {
    assignRole.mutate(selectedRole);
  };

  if (!canManageUsers) {
    return null;
  }

  const RoleIcon = roleConfig[currentRole].icon;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {language === 'bn' ? 'রোল ম্যানেজমেন্ট' : 'Role Management'}
              </CardTitle>
            </div>
            <Badge className={`${roleConfig[currentRole].color} text-white`}>
              <RoleIcon className="h-3 w-3 mr-1" />
              {roleConfig[currentRole].label[language]}
            </Badge>
          </div>
          {userName && (
            <CardDescription>{userName}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={selectedRole}
            onValueChange={(value) => handleRoleChange(value as AccessRole)}
            disabled={isOwnUser || assignRole.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(roleConfig) as AccessRole[]).map((role) => {
                const config = roleConfig[role];
                const Icon = config.icon;
                return (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{config.label[language]}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {isOwnUser && (
            <p className="text-xs text-muted-foreground">
              {language === 'bn' 
                ? '⚠️ আপনি নিজের রোল পরিবর্তন করতে পারবেন না'
                : '⚠️ You cannot change your own role'}
            </p>
          )}

          <div className="text-sm text-muted-foreground">
            {roleConfig[selectedRole].description[language]}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {language === 'bn' ? 'রোল পরিবর্তন নিশ্চিত করুন' : 'Confirm Role Change'}
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                {language === 'bn' 
                  ? `আপনি কি এই ইউজারের রোল "${roleConfig[currentRole].label[language]}" থেকে "${roleConfig[selectedRole].label[language]}" এ পরিবর্তন করতে চান?`
                  : `Are you sure you want to change this user's role from "${roleConfig[currentRole].label.en}" to "${roleConfig[selectedRole].label.en}"?`}
              </p>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-medium">
                  {roleConfig[selectedRole].label[language]}:
                </p>
                <p className="text-sm text-muted-foreground">
                  {roleConfig[selectedRole].description[language]}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRole(currentRole);
                setShowConfirmDialog(false);
              }}
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={assignRole.isPending}
            >
              {assignRole.isPending 
                ? (language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...')
                : (language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
