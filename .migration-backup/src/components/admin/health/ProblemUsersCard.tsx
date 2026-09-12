import { AlertTriangle, CheckCircle2, WifiOff, XCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { HealthLabels } from './labels';
import type { ProblemUserEntry } from './healthUtils';
import type { HealthProfile } from './useSystemHealthData';

type ProblemUser = ProblemUserEntry & { profile?: HealthProfile };

interface Props {
  labels: HealthLabels;
  problemUsers?: ProblemUser[];
  loading: boolean;
  onSelectUser: (userId: string) => void;
}

/** Summary card listing every farm currently reporting a problem signal. */
export function ProblemUsersCard({ labels, problemUsers, loading, onSelectUser }: Props) {
  const hasProblems = !!problemUsers && problemUsers.length > 0;

  return (
    <Card
      className={`border-2 shadow-xl ${
        hasProblems
          ? 'bg-gradient-to-br from-rose-950/40 to-red-950/30 border-rose-500/40 shadow-rose-500/10'
          : 'bg-gradient-to-br from-emerald-950/40 to-green-950/30 border-emerald-500/40 shadow-emerald-500/10'
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {hasProblems ? (
            <>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <span className="text-rose-200 font-semibold">{labels.attentionRequired}</span>
              <Badge className="bg-rose-500/30 text-rose-200 border-rose-400/30 ml-2 font-bold">
                {problemUsers!.length} {labels.problemUsers}
              </Badge>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-emerald-200 font-semibold">{labels.noProblem}</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      {hasProblems && (
        <CardContent>
          <ScrollArea className="max-h-[200px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading
                ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 bg-slate-700/50" />)
                : problemUsers!.map((problem) => (
                    <div
                      key={problem.userId}
                      className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-800/80 border border-rose-500/30 cursor-pointer hover:border-rose-400/50 hover:shadow-lg hover:shadow-rose-500/10 transition-all"
                      onClick={() => onSelectUser(problem.userId)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-rose-500/30">
                          <AvatarImage src={problem.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-500 to-red-600 text-white text-sm">
                            {problem.profile?.farm_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm text-white font-semibold">{problem.profile?.farm_name || 'Unknown'}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {problem.issues.map((issue, idx) => (
                              <Badge
                                key={idx}
                                className={`text-[10px] px-2 py-0.5 font-medium ${
                                  issue.type === 'device_offline'
                                    ? 'bg-slate-500/30 text-slate-200 border-slate-400/30'
                                    : issue.type === 'power_outage'
                                      ? 'bg-amber-500/30 text-amber-200 border-amber-400/30'
                                      : issue.type === 'critical_alert'
                                        ? 'bg-rose-500/30 text-rose-200 border-rose-400/30'
                                        : 'bg-orange-500/30 text-orange-200 border-orange-400/30'
                                }`}
                              >
                                {issue.type === 'device_offline' && (
                                  <>
                                    <WifiOff className="w-2.5 h-2.5 mr-0.5" />
                                    {labels.deviceOffline}
                                  </>
                                )}
                                {issue.type === 'power_outage' && (
                                  <>
                                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                                    {labels.powerOutage}
                                  </>
                                )}
                                {issue.type === 'critical_alert' && (
                                  <>
                                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                                    {labels.criticalAlert}
                                  </>
                                )}
                                {issue.type === 'no_sensor_data' && (
                                  <>
                                    <XCircle className="w-2.5 h-2.5 mr-0.5" />
                                    {labels.noSensorData}
                                  </>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 text-xs"
                      >
                        {labels.viewDetails}
                      </Button>
                    </div>
                  ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
