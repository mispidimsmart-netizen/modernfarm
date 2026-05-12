import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, UserPlus, Copy, Trash2, Clock, CheckCircle2, Key, Crown, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import {
  useWorkers,
  useWorkerInvitations,
  useCreateInvitation,
  useRemoveWorker,
  useDeleteInvitation,
  useJoinFarm,
  useIsOwner,
  useLeaveFarm,
  useUpdateMemberRole,
  type AppRole,
} from '@/hooks/useUserRole';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';

const ASSIGNABLE_ROLES: AppRole[] = ['worker', 'farmer', 'manager', 'technician', 'viewer'];

const roleLabel = (role: AppRole, lang: 'bn' | 'en'): string => {
  const map: Record<AppRole, { bn: string; en: string }> = {
    owner: { bn: 'মালিক', en: 'Owner' },
    super_admin: { bn: 'সুপার অ্যাডমিন', en: 'Super Admin' },
    admin: { bn: 'অ্যাডমিন', en: 'Admin' },
    farmer: { bn: 'ফার্মার', en: 'Farmer' },
    manager: { bn: 'ম্যানেজার', en: 'Manager' },
    technician: { bn: 'টেকনিশিয়ান', en: 'Technician' },
    worker: { bn: 'কর্মী', en: 'Worker' },
    viewer: { bn: 'ভিউয়ার', en: 'Viewer' },
  };
  return map[role][lang];
};

export default function MembersPage() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isOwner = useIsOwner();

  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { data: invitations, isLoading: invitationsLoading } = useWorkerInvitations();
  const createInvitation = useCreateInvitation();
  const removeWorker = useRemoveWorker();
  const deleteInvitation = useDeleteInvitation();
  const joinFarm = useJoinFarm();
  const leaveFarm = useLeaveFarm();
  const updateRole = useUpdateMemberRole();

  const [inviteCode, setInviteCode] = useState('');

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: language === 'bn' ? 'কপি হয়েছে!' : 'Copied!',
      description: code,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <main className="page-container px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3 py-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {language === 'bn' ? 'সদস্যবৃন্দ' : 'Members'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'দল ও অনুমতি ব্যবস্থাপনা' : 'Manage team & permissions'}
              </p>
            </div>
          </div>

          {/* Worker view */}
          {!isOwner && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {language === 'bn' ? 'ফার্মে যোগ দিন' : 'Join a Farm'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn'
                      ? 'মালিকের দেওয়া আমন্ত্রণ কোড দিন'
                      : 'Enter the invitation code from the farm owner'}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder={language === 'bn' ? 'আমন্ত্রণ কোড' : 'Invitation code'}
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="uppercase"
                    />
                    <Button
                      onClick={() => inviteCode.trim() && joinFarm.mutate(inviteCode.trim(), { onSuccess: () => setInviteCode('') })}
                      disabled={!inviteCode.trim() || joinFarm.isPending}
                    >
                      {language === 'bn' ? 'যোগ দিন' : 'Join'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardContent className="pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 border-destructive/30">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {language === 'bn' ? 'ফার্ম থেকে বের হই' : 'Leave Farm'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {language === 'bn' ? 'ফার্ম থেকে বের হবেন?' : 'Leave Farm?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {language === 'bn'
                            ? 'আপনি এই ফার্মের ডেটা আর দেখতে পারবেন না।'
                            : "You'll lose access to this farm's data."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => leaveFarm.mutate()} className="bg-destructive hover:bg-destructive/90">
                          {language === 'bn' ? 'বের হই' : 'Leave'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </>
          )}

          {/* Owner view */}
          {isOwner && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-status-normal" />
                      {language === 'bn' ? 'সক্রিয় সদস্য' : 'Active Members'}
                    </span>
                    <Badge variant="secondary">{workers?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workersLoading ? (
                    <div className="h-16 animate-pulse bg-muted rounded-lg" />
                  ) : workers && workers.length > 0 ? (
                    <div className="space-y-2">
                      {workers.map((m) => (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-sm font-medium truncate">
                                {m.user_id.substring(0, 8)}…
                              </p>
                              <Badge variant="outline" className="text-[10px]">
                                {roleLabel(m.role, language)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {language === 'bn' ? 'যোগদান: ' : 'Joined: '}
                              {format(new Date(m.created_at), 'dd MMM yyyy', {
                                locale: language === 'bn' ? bn : undefined,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={m.role}
                              onValueChange={(v) => updateRole.mutate({ memberId: m.id, role: v as AppRole })}
                              disabled={updateRole.isPending}
                            >
                              <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSIGNABLE_ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {roleLabel(r, language)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {language === 'bn' ? 'সদস্য সরাবেন?' : 'Remove member?'}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {language === 'bn'
                                      ? 'এই সদস্য আর আপনার ফার্ম দেখতে পারবেন না।'
                                      : 'This member will lose access to your farm.'}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeWorker.mutate(m.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    {language === 'bn' ? 'সরান' : 'Remove'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'bn' ? 'কোনো সদস্য নেই। নিচে থেকে আমন্ত্রণ পাঠান।' : 'No members yet. Create an invitation below.'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Pending Invitations */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-status-warning" />
                      {language === 'bn' ? 'অপেক্ষমাণ আমন্ত্রণ' : 'Pending Invitations'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createInvitation.mutate()}
                      disabled={createInvitation.isPending}
                      className="gap-1"
                    >
                      <UserPlus className="h-4 w-4" />
                      {language === 'bn' ? 'নতুন' : 'New'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invitationsLoading ? (
                    <div className="h-16 animate-pulse bg-muted rounded-lg" />
                  ) : invitations && invitations.length > 0 ? (
                    <div className="space-y-2">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {inv.invite_code}
                              </code>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(inv.invite_code)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'bn' ? 'মেয়াদ: ' : 'Expires: '}
                              {format(new Date(inv.expires_at), 'dd MMM yyyy', {
                                locale: language === 'bn' ? bn : undefined,
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteInvitation.mutate(inv.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'bn' ? 'কোনো অপেক্ষমাণ আমন্ত্রণ নেই' : 'No pending invitations'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    {language === 'bn' ? 'রোল গাইড' : 'Role Guide'}
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <b>{roleLabel('farmer', language)}</b>: {language === 'bn' ? 'কন্ট্রোল ও সেটিংস পরিবর্তন' : 'Control + edit settings'}</li>
                    <li>• <b>{roleLabel('manager', language)}</b>: {language === 'bn' ? 'রিপোর্ট ও দল ম্যানেজমেন্ট' : 'Reports + team mgmt'}</li>
                    <li>• <b>{roleLabel('technician', language)}</b>: {language === 'bn' ? 'ডিভাইস ও ক্যালিব্রেশন' : 'Device + calibration'}</li>
                    <li>• <b>{roleLabel('worker', language)}</b>: {language === 'bn' ? 'সাময়িক কন্ট্রোল' : 'Temporary control'}</li>
                    <li>• <b>{roleLabel('viewer', language)}</b>: {language === 'bn' ? 'শুধু দেখা' : 'View only'}</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}
