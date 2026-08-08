import { useState } from 'react';
import { UserHealthExtras } from './UserHealthExtras';
import { healthLabels, type HealthLanguage } from './health/labels';
import { useSystemHealthData } from './health/useSystemHealthData';
import { HealthUserSelector } from './health/HealthUserSelector';
import { ProblemUsersCard } from './health/ProblemUsersCard';
import { SystemStatusCard } from './health/SystemStatusCard';
import { DeviceActivityCard } from './health/DeviceActivityCard';

interface SystemHealthCardProps {
  language?: HealthLanguage;
}

/**
 * Admin System Health dashboard shell.
 * Owns only the selected-user state; data lives in `useSystemHealthData`
 * and presentation lives in `./health/*`.
 */
export function SystemHealthCard({ language = 'bn' }: SystemHealthCardProps) {
  const labels = healthLabels[language];
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const health = useSystemHealthData(selectedUserId);
  const selectedUser = health.profiles?.find((p) => p.id === selectedUserId);

  return (
    <div className="space-y-4">
      <HealthUserSelector
        labels={labels}
        profiles={health.profiles}
        selectedUserId={selectedUserId}
        onSelect={setSelectedUserId}
      />

      {selectedUserId === 'all' && (
        <ProblemUsersCard
          labels={labels}
          problemUsers={health.problemUsers}
          loading={health.loadingProblems}
          onSelectUser={setSelectedUserId}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemStatusCard
          labels={labels}
          selectedUserId={selectedUserId}
          selectedUser={selectedUser}
          dbStatus={health.dbStatus}
          loadingDb={health.loadingDb}
          activityStats={health.activityStats}
          loadingActivity={health.loadingActivity}
          sensorHealth={health.sensorHealth}
          loadingSensorHealth={health.loadingSensorHealth}
        />

        <DeviceActivityCard
          labels={labels}
          language={language}
          selectedUserId={selectedUserId}
          userDeviceHealth={health.userDeviceHealth}
          loadingUserDevice={health.loadingUserDevice}
          recentDevices={health.recentDevices}
          loadingDevices={health.loadingDevices}
          recentErrors={health.recentErrors}
          loadingErrors={health.loadingErrors}
        />
      </div>

      {/* Enhanced metrics: sparklines, automation activity, freshness, edge health */}
      <UserHealthExtras language={language} userId={selectedUserId} />
    </div>
  );
}
