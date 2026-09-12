import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  UserPlus, 
  Trash2, 
  Search, 
  Loader2,
  Phone,
  Mail,
  Calendar,
  Crown,
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

interface AdminManagementTabProps {
  language: 'bn' | 'en';
}

const t = {
  bn: {
    title: 'অ্যাডমিন ব্যবস্থাপনা',
    description: 'সুপার অ্যাডমিনদের যোগ বা মুছে ফেলুন',
    searchPlaceholder: 'ইউজার খুঁজুন...',
    addAdmin: 'অ্যাডমিন যোগ করুন',
    removeAdmin: 'অ্যাডমিন সরিয়ে দিন',
    noAdmins: 'কোনো সুপার অ্যাডমিন নেই',
    confirmRemoveTitle: 'অ্যাডমিন সরাতে চান?',
    confirmRemoveDesc: 'এই ইউজার আর সুপার অ্যাডমিন থাকবে না।',
    confirm: 'নিশ্চিত করুন',
    cancel: 'বাতিল',
    adminAdded: 'অ্যাডমিন যোগ হয়েছে',
    adminRemoved: 'অ্যাডমিন সরানো হয়েছে',
    error: 'ত্রুটি হয়েছে',
    addedOn: 'যোগ হয়েছে',
    selectUser: 'ইউজার সিলেক্ট করুন',
    selectUserDesc: 'নিচের তালিকা থেকে যাকে অ্যাডমিন করতে চান সিলেক্ট করুন',
    noUsers: 'কোনো ইউজার পাওয়া যায়নি',
    makeAdmin: 'অ্যাডমিন করুন',
    youAreAdmin: 'আপনি',
    superAdmin: 'সুপার অ্যাডমিন',
    totalAdmins: 'মোট অ্যাডমিন',
  },
  en: {
    title: 'Admin Management',
    description: 'Add or remove super admins',
    searchPlaceholder: 'Search users...',
    addAdmin: 'Add Admin',
    removeAdmin: 'Remove Admin',
    noAdmins: 'No super admins found',
    confirmRemoveTitle: 'Remove Admin?',
    confirmRemoveDesc: 'This user will no longer be a super admin.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    adminAdded: 'Admin added successfully',
    adminRemoved: 'Admin removed successfully',
    error: 'An error occurred',
    addedOn: 'Added on',
    selectUser: 'Select User',
    selectUserDesc: 'Choose a user from the list below to make them an admin',
    noUsers: 'No users found',
    makeAdmin: 'Make Admin',
    youAreAdmin: 'You',
    superAdmin: 'Super Admin',
    totalAdmins: 'Total Admins',
  },
};

interface AdminUser {
  user_id: string;
  created_at: string;
  profile?: {
    user_name: string | null;
    phone: string | null;
    email: string | null;
    farm_name: string;
    avatar_url: string | null;
  };
}

export function AdminManagementTab({ language }: AdminManagementTabProps) {
  const labels = t[language];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addSearchQuery, setAddSearchQuery] = useState('');

  // Fetch all super admins with their profiles
  const { data: admins, isLoading: loadingAdmins } = useQuery({
    queryKey: ['super-admins-list'],
    queryFn: async () => {
      const { data: adminData, error } = await supabase
        .from('super_admins')
        .select('user_id, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for each admin
      const adminUserIds = adminData.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email, farm_name, avatar_url')
        .in('id', adminUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return adminData.map(admin => ({
        ...admin,
        profile: profileMap.get(admin.user_id) || null,
      })) as AdminUser[];
    },
  });

  // Fetch all users (non-admins) for adding
  const { data: allUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['all-users-for-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email, farm_name, avatar_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: showAddDialog,
  });

  // Get current user
  const { data: currentSession } = useQuery({
    queryKey: ['current-session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  // Filter out users who are already admins
  const nonAdminUsers = allUsers?.filter(
    user => !admins?.some(admin => admin.user_id === user.id)
  );

  const filteredNonAdminUsers = nonAdminUsers?.filter(user =>
    user.user_name?.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
    user.phone?.includes(addSearchQuery) ||
    user.email?.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
    user.farm_name?.toLowerCase().includes(addSearchQuery.toLowerCase())
  );

  const filteredAdmins = admins?.filter(admin =>
    admin.profile?.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.profile?.phone?.includes(searchQuery) ||
    admin.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.profile?.farm_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('super_admins')
        .insert({ 
          user_id: userId,
          created_by: currentSession?.user?.id 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: labels.adminAdded });
      queryClient.invalidateQueries({ queryKey: ['super-admins-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowAddDialog(false);
      setAddSearchQuery('');
    },
    onError: (error) => {
      toast({ title: labels.error, description: String(error), variant: 'destructive' });
    },
  });

  // Remove admin mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('super_admins')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: labels.adminRemoved });
      queryClient.invalidateQueries({ queryKey: ['super-admins-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowRemoveConfirm(false);
      setSelectedAdmin(null);
    },
    onError: (error) => {
      toast({ title: labels.error, description: String(error), variant: 'destructive' });
    },
  });

  const handleRemoveAdmin = () => {
    if (selectedAdmin) {
      removeAdminMutation.mutate(selectedAdmin.user_id);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-yellow-950/30 border-amber-500/20 shadow-xl shadow-amber-500/10 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-amber-500/10">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/40">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-amber-200 to-yellow-200 bg-clip-text text-transparent font-semibold">
                  {labels.title}
                </span>
              </CardTitle>
              <CardDescription className="text-amber-200/60 mt-2 ml-13">
                {labels.description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-amber-500/30">
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                {labels.totalAdmins}: {admins?.length || 0}
              </Badge>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white border-0 shadow-lg shadow-amber-500/30"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {labels.addAdmin}
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
            <Input
              placeholder={labels.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-amber-950/30 border-amber-500/20 text-white placeholder:text-amber-300/50 focus:border-amber-400/50"
            />
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[400px]">
            {loadingAdmins ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full bg-slate-700/50" />
                ))}
              </div>
            ) : filteredAdmins && filteredAdmins.length > 0 ? (
              <div className="space-y-3">
                {filteredAdmins.map(admin => {
                  const isCurrentUser = admin.user_id === currentSession?.user?.id;
                  return (
                    <div
                      key={admin.user_id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-500/20 hover:border-amber-400/40 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20">
                          <AvatarImage src={admin.profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-semibold">
                            {(admin.profile?.user_name || admin.profile?.farm_name || 'A').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {admin.profile?.user_name || admin.profile?.farm_name || 'Unknown'}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-xs border-0">
                                {labels.youAreAdmin}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-amber-200/60 mt-1">
                            {admin.profile?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {admin.profile.phone}
                              </span>
                            )}
                            {admin.profile?.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {admin.profile.email}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {labels.addedOn}: {format(new Date(admin.created_at), 'dd MMM yyyy', { locale: bn })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {!isCurrentUser && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowRemoveConfirm(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600/20 to-yellow-600/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-amber-400/50" />
                </div>
                <p className="text-amber-200/50">{labels.noAdmins}</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-yellow-400" />
              {labels.selectUser}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {labels.selectUserDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={labels.searchPlaceholder}
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700/50 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>

            <ScrollArea className="h-[300px]">
              {loadingUsers ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full bg-slate-700/50" />
                  ))}
                </div>
              ) : filteredNonAdminUsers && filteredNonAdminUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredNonAdminUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-purple-600 text-white">
                            {(user.user_name || user.farm_name).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white text-sm">
                            {user.user_name || user.farm_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {user.phone || user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addAdminMutation.mutate(user.id)}
                        disabled={addAdminMutation.isPending}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        {addAdminMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          labels.makeAdmin
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>{labels.noUsers}</p>
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)} className="text-gray-400">
              {labels.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent className="bg-slate-800 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.confirmRemoveTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {labels.confirmRemoveDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-white/10 text-white hover:bg-slate-600">
              {labels.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              disabled={removeAdminMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeAdminMutation.isPending ? (
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
