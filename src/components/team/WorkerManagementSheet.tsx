import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  useWorkers,
  useWorkerInvitations,
  useCreateInvitation,
  useRemoveWorker,
  useDeleteInvitation,
  useJoinFarm,
  useIsOwner,
  usePromoteToOwner,
} from '@/hooks/useUserRole';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserPlus,
  Copy,
  Trash2,
  Clock,
  CheckCircle2,
  Key,
  Crown,
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export function WorkerManagementSheet() {
  const { language } = useAuth();
  const isOwner = useIsOwner();
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { data: invitations, isLoading: invitationsLoading } = useWorkerInvitations();
  const createInvitation = useCreateInvitation();
  const removeWorker = useRemoveWorker();
  const deleteInvitation = useDeleteInvitation();
  const joinFarm = useJoinFarm();
  const promoteToOwner = usePromoteToOwner();
  const { toast } = useToast();
  
  const [inviteCode, setInviteCode] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: language === 'bn' ? 'কপি হয়েছে!' : 'Copied!',
      description: code,
    });
  };

  const handleJoinFarm = () => {
    if (inviteCode.trim()) {
      joinFarm.mutate(inviteCode.trim(), {
        onSuccess: () => {
          setInviteCode('');
          setIsOpen(false);
        },
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          {language === 'bn' ? 'দল ব্যবস্থাপনা' : 'Team Management'}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'bn' ? 'দল ব্যবস্থাপনা' : 'Team Management'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Join Farm Section (for non-owners) */}
          {!isOwner && (
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
                    ? 'মালিকের দেওয়া আমন্ত্রণ কোড দিয়ে ফার্মে যোগ দিন'
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
                    onClick={handleJoinFarm}
                    disabled={!inviteCode.trim() || joinFarm.isPending}
                  >
                    {language === 'bn' ? 'যোগ দিন' : 'Join'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Owner sections */}
          {isOwner && (
            <>
              {/* Active Workers */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-status-normal" />
                      {language === 'bn' ? 'সক্রিয় কর্মী' : 'Active Workers'}
                    </span>
                    <Badge variant="secondary">{workers?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workersLoading ? (
                    <div className="h-16 animate-pulse bg-muted rounded-lg" />
                  ) : workers && workers.length > 0 ? (
                    <div className="space-y-2">
                      {workers.map((worker) => (
                        <div
                          key={worker.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {language === 'bn' ? 'কর্মী' : 'Worker'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {language === 'bn' ? 'যোগদান: ' : 'Joined: '}
                              {format(new Date(worker.created_at), 'dd MMM yyyy', {
                                locale: language === 'bn' ? bn : undefined,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Promote to Owner Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-status-warning hover:text-status-warning"
                                  title={language === 'bn' ? 'মালিক বানান' : 'Promote to Owner'}
                                >
                                  <Crown className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {language === 'bn' ? 'মালিক বানাতে চান?' : 'Promote to Owner?'}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {language === 'bn'
                                      ? 'এই কর্মী মালিক হলে তাদের নিজস্ব ফার্ম থাকবে এবং আপনার ফার্ম থেকে আলাদা হয়ে যাবে। এই কাজ পুনরায় ফেরানো যাবে না।'
                                      : 'This worker will become an independent owner with their own farm. This action cannot be undone.'}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => promoteToOwner.mutate(worker.id)}
                                  >
                                    {language === 'bn' ? 'মালিক বানান' : 'Promote'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            
                            {/* Remove Worker Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeWorker.mutate(worker.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'bn'
                        ? 'কোনো কর্মী নেই। নিচে থেকে আমন্ত্রণ পাঠান।'
                        : 'No workers yet. Create an invitation below.'}
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
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {invitation.invite_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(invitation.invite_code)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'bn' ? 'মেয়াদ: ' : 'Expires: '}
                              {format(new Date(invitation.expires_at), 'dd MMM yyyy', {
                                locale: language === 'bn' ? bn : undefined,
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteInvitation.mutate(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {language === 'bn'
                        ? 'কোনো অপেক্ষমাণ আমন্ত্রণ নেই'
                        : 'No pending invitations'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <h4 className="font-medium text-sm mb-2">
                    {language === 'bn' ? 'কিভাবে কাজ করে?' : 'How it works?'}
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>
                      • {language === 'bn'
                        ? '"নতুন" বাটনে ক্লিক করে আমন্ত্রণ কোড তৈরি করুন'
                        : 'Click "New" to create an invitation code'}
                    </li>
                    <li>
                      • {language === 'bn'
                        ? 'কোডটি আপনার কর্মীকে শেয়ার করুন'
                        : 'Share the code with your worker'}
                    </li>
                    <li>
                      • {language === 'bn'
                        ? 'কর্মী তাদের অ্যাকাউন্ট দিয়ে লগইন করে কোড দিয়ে যোগ দিবে'
                        : 'Worker logs in and joins using the code'}
                    </li>
                    <li>
                      • {language === 'bn'
                        ? 'কর্মী শুধুমাত্র দেখতে পারবে, পরিবর্তন করতে পারবে না'
                        : 'Workers can only view, not modify data'}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
