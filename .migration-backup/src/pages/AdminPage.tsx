import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSuperAdmin, AdminUser } from '@/hooks/useSuperAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminDashboardTabs } from '@/components/admin/AdminDashboardTabs';
import { AdminUserDetailsDialog } from '@/components/admin/AdminUserDetailsDialog';
import { adminPageLabels } from '@/data/adminPageLabels';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    isSuperAdmin,
    checkingAdmin,
    refetchUsers,
    stats,
    loadingStats,
    userDetails,
    refetchStats,
    refetchUserDetails,
  } = useSuperAdmin();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const language = 'bn' as const;
  const labels = adminPageLabels[language];

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Fetch user's sheds when selected
  const { data: selectedUserSheds } = useQuery({
    queryKey: ['admin-user-sheds', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const { data, error } = await supabase
        .from('sheds')
        .select('*')
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser?.id && showUserDialog,
  });

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1e3a] flex items-center justify-center">
        <div className="text-white flex items-center gap-3 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
          <RefreshCw className="animate-spin text-indigo-400 w-6 h-6" />
          <span className="text-lg font-medium">{labels.loading}</span>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1e3a] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gradient-to-br from-rose-950/40 to-red-950/30 border-rose-500/30 shadow-2xl shadow-rose-500/10">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-rose-300">{labels.unauthorized}</h2>
            <p className="text-rose-400/80 mt-3">{labels.unauthorizedMsg}</p>
            <Button
              variant="outline"
              className="mt-6 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {labels.back}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1e3a]">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950/90 via-[#0b1e3a]/80 to-slate-950/90 backdrop-blur-xl border-b border-slate-700/40 sticky top-0 z-10 shadow-lg shadow-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="text-indigo-200 hover:bg-indigo-500/20 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
                  {labels.title}
                </h1>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => { refetchUsers(); refetchStats(); refetchUserDetails(); }}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {labels.refresh}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <AdminStatsGrid stats={stats} loadingStats={loadingStats} labels={labels} />
        <AdminDashboardTabs language={language} />
      </div>

      <AdminUserDetailsDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        selectedUser={selectedUser}
        sheds={selectedUserSheds}
        sensor={selectedUser ? userDetails?.[selectedUser.id] : null}
        labels={labels}
      />

      {/* Edit User Dialog */}
      {editingUser && (
        <AdminUserManagement
          user={editingUser}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingUser(null);
          }}
          language={language}
        />
      )}
    </div>
  );
}
