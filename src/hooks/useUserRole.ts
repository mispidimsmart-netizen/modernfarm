import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'owner' | 'worker';

interface UserRole {
  id: string;
  user_id: string;
  farm_owner_id: string;
  role: AppRole;
  created_at: string;
}

interface WorkerInfo {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email?: string;
  phone?: string;
}

interface WorkerInvitation {
  id: string;
  farm_owner_id: string;
  invite_code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: async (): Promise<{ role: AppRole; farmOwnerId: string }> => {
      if (!user) throw new Error('Not authenticated');

      // Check if user is a worker for someone
      const { data: workerRole, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'worker')
        .maybeSingle();

      if (error) throw error;

      if (workerRole) {
        return {
          role: 'worker' as AppRole,
          farmOwnerId: workerRole.farm_owner_id,
        };
      }

      // User is an owner
      return {
        role: 'owner' as AppRole,
        farmOwnerId: user.id,
      };
    },
    enabled: !!user,
  });
}

export function useIsOwner() {
  const { data } = useUserRole();
  return data?.role === 'owner';
}

export function useFarmOwnerId() {
  const { user } = useAuth();
  const { data } = useUserRole();
  return data?.farmOwnerId || user?.id;
}

export function useWorkers() {
  const { user } = useAuth();
  const isOwner = useIsOwner();

  return useQuery({
    queryKey: ['workers', user?.id],
    queryFn: async (): Promise<WorkerInfo[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('farm_owner_id', user.id)
        .eq('role', 'worker');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOwner,
  });
}

export function useWorkerInvitations() {
  const { user } = useAuth();
  const isOwner = useIsOwner();

  return useQuery({
    queryKey: ['worker_invitations', user?.id],
    queryFn: async (): Promise<WorkerInvitation[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('worker_invitations')
        .select('*')
        .eq('farm_owner_id', user.id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isOwner,
  });
}

export function useCreateInvitation() {
  const { user, language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Generate a random 8-character invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data, error } = await supabase
        .from('worker_invitations')
        .insert({
          farm_owner_id: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker_invitations'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'নতুন আমন্ত্রণ কোড তৈরি হয়েছে' : 'New invitation code created',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useJoinFarm() {
  const { user, language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error('Not authenticated');

      // Find the invitation
      const { data: invitation, error: findError } = await supabase
        .from('worker_invitations')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (findError) throw findError;
      if (!invitation) {
        throw new Error(language === 'bn' ? 'অবৈধ বা মেয়াদোত্তীর্ণ আমন্ত্রণ কোড' : 'Invalid or expired invitation code');
      }

      // Check if already a worker for this owner
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('farm_owner_id', invitation.farm_owner_id)
        .maybeSingle();

      if (existingRole) {
        throw new Error(language === 'bn' ? 'আপনি ইতিমধ্যে এই ফার্মে যুক্ত আছেন' : 'You are already part of this farm');
      }

      // Create the worker role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          farm_owner_id: invitation.farm_owner_id,
          role: 'worker',
        });

      if (roleError) throw roleError;

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from('worker_invitations')
        .update({
          used_at: new Date().toISOString(),
          used_by: user.id,
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_role'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'আপনি ফার্মে যুক্ত হয়েছেন' : 'You have joined the farm',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveWorker() {
  const { language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', workerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'কর্মী সরানো হয়েছে' : 'Worker removed',
      });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInvitation() {
  const { language } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('worker_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker_invitations'] });
      toast({
        title: language === 'bn' ? 'সফল!' : 'Success!',
        description: language === 'bn' ? 'আমন্ত্রণ বাতিল করা হয়েছে' : 'Invitation cancelled',
      });
    },
  });
}
