import { createContext, useContext, ReactNode } from 'react';
import { useDashboardSnapshot, type DashboardSnapshot } from '@/hooks/useDashboardSnapshot';

interface SnapshotCtx {
  snapshot: DashboardSnapshot | null | undefined;
  isLoading: boolean;
}

const Ctx = createContext<SnapshotCtx>({ snapshot: undefined, isLoading: false });

/**
 * Phase 6: Fires the `get_farm_dashboard_snapshot` RPC ONCE per Dashboard mount
 * and shares its data with every child card. Replaces what would otherwise be
 * 5+ separate initial queries (sensor + device + alerts + flock + counters).
 *
 * Realtime subscriptions still drive live updates — this only powers FAST
 * initial paint while the per-card hooks finish hydrating.
 */
export function DashboardSnapshotProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useDashboardSnapshot();
  return (
    <Ctx.Provider value={{ snapshot: data, isLoading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSnapshotContext() {
  return useContext(Ctx);
}

/** Convenience: latest sensor from snapshot, for instant first-paint fallback. */
export function useSnapshotSensorFallback() {
  const { snapshot } = useSnapshotContext();
  const s = snapshot?.latest_sensor;
  if (!s) return null;
  return {
    temperature: Number(s.temperature ?? 0),
    humidity: Number(s.humidity ?? 0),
    ammonia: Number(s.ammonia ?? 0),
    waterUsage: Number(s.water_usage ?? 0),
    timestamp: new Date(s.recorded_at),
  };
}
