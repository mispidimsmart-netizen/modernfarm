import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export type AuditCategory = 
  | 'settings' 
  | 'automation' 
  | 'control' 
  | 'safety' 
  | 'firmware' 
  | 'auth' 
  | 'farm' 
  | 'general';

export type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditLogEntry {
  action_type: string;
  action_category: AuditCategory;
  target_entity?: string;
  target_id?: string;
  shed_id?: string;
  device_name?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  source?: string;
  severity?: AuditSeverity;
}

export function useAuditLog() {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  const logAction = useCallback(async (entry: AuditLogEntry) => {
    if (!user) return;

    try {
      await (supabase.from('farm_audit_logs') as any).insert({
        user_id: user.id,
        user_email: user.email || '',
        farm_id: selectedFarmId || null,
        action_type: entry.action_type,
        action_category: entry.action_category,
        target_entity: entry.target_entity || null,
        target_id: entry.target_id || null,
        shed_id: entry.shed_id || null,
        device_name: entry.device_name || null,
        old_value: entry.old_value || null,
        new_value: entry.new_value || null,
        metadata: entry.metadata || {},
        source: entry.source || 'app',
        severity: entry.severity || 'info',
      });
    } catch (err) {
      console.error('[AuditLog] Failed to write:', err);
    }
  }, [user, selectedFarmId]);

  // Convenience methods
  const logSettingsChange = useCallback((
    setting: string,
    oldVal: unknown,
    newVal: unknown,
    shedId?: string
  ) => logAction({
    action_type: 'settings_changed',
    action_category: 'settings',
    target_entity: setting,
    old_value: { value: oldVal },
    new_value: { value: newVal },
    shed_id: shedId,
  }), [logAction]);

  const logAutomationToggle = useCallback((
    enabled: boolean,
    shedId?: string
  ) => logAction({
    action_type: enabled ? 'automation_enabled' : 'automation_disabled',
    action_category: 'automation',
    severity: 'warning',
    shed_id: shedId,
    new_value: { enabled },
  }), [logAction]);

  const logManualControl = useCallback((
    device: string,
    state: boolean,
    shedId?: string
  ) => logAction({
    action_type: 'manual_control',
    action_category: 'control',
    device_name: device,
    severity: 'warning',
    shed_id: shedId,
    new_value: { state },
  }), [logAction]);

  const logSafetyOverride = useCallback((
    reason: string,
    device?: string,
    shedId?: string
  ) => logAction({
    action_type: 'safety_override',
    action_category: 'safety',
    severity: 'critical',
    device_name: device,
    shed_id: shedId,
    metadata: { reason },
    source: 'device',
  }), [logAction]);

  const logFirmwareUpdate = useCallback((
    deviceId: string,
    fromVersion: string,
    toVersion: string,
    status: string
  ) => logAction({
    action_type: 'firmware_update',
    action_category: 'firmware',
    target_id: deviceId,
    old_value: { version: fromVersion },
    new_value: { version: toVersion },
    metadata: { status },
  }), [logAction]);

  const logAccessDenied = useCallback((
    attemptedPath: string,
    userRole: string,
    requiredRole?: string,
    requiredPermission?: string,
  ) => logAction({
    action_type: 'access_denied',
    action_category: 'auth',
    severity: 'warning',
    target_entity: attemptedPath,
    metadata: {
      attempted_url: attemptedPath,
      user_role: userRole,
      required_role: requiredRole || null,
      required_permission: requiredPermission || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    source: 'route_guard',
  }), [logAction]);

  const logMemberAction = useCallback((
    action: 'invite_created' | 'invite_deleted' | 'role_changed' | 'member_removed' | 'member_left' | 'farm_joined',
    opts: {
      targetUserId?: string;
      targetMemberRowId?: string;
      oldRole?: string;
      newRole?: string;
      inviteCode?: string;
      actorRole?: string;
    } = {},
  ) => logAction({
    action_type: `member_${action}`,
    action_category: 'auth',
    severity: action === 'member_removed' || action === 'member_left' ? 'warning' : 'info',
    target_entity: opts.targetUserId || opts.targetMemberRowId || opts.inviteCode || null,
    target_id: opts.targetMemberRowId || null,
    old_value: opts.oldRole ? { role: opts.oldRole } : undefined,
    new_value: opts.newRole ? { role: opts.newRole } : undefined,
    metadata: {
      url: typeof window !== 'undefined' ? window.location.pathname + window.location.search : null,
      actor_role: opts.actorRole || null,
      target_user_id: opts.targetUserId || null,
      invite_code: opts.inviteCode || null,
    },
    source: 'members_page',
  }), [logAction]);

  return {
    logAction,
    logSettingsChange,
    logAutomationToggle,
    logManualControl,
    logSafetyOverride,
    logFirmwareUpdate,
    logAccessDenied,
    logMemberAction,
  };
}

// Query hook for reading audit logs with filters
export interface AuditLogFilters {
  category?: AuditCategory;
  severity?: AuditSeverity;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  actionType?: string;        // exact match (e.g. 'safety_engine_sensor_fail')
  actionTypes?: string[];     // OR-match across multiple types
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['audit-logs', user?.id, selectedFarmId, filters],
    queryFn: async () => {
      if (!user) return [];

      let query = (supabase.from('farm_audit_logs') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedFarmId) {
        query = query.eq('farm_id', selectedFarmId);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (filters.category) {
        query = query.eq('action_category', filters.category);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters.actionTypes && filters.actionTypes.length > 0) {
        query = query.in('action_type', filters.actionTypes);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }
      if (filters.searchQuery) {
        query = query.or(
          `action_type.ilike.%${filters.searchQuery}%,device_name.ilike.%${filters.searchQuery}%,target_entity.ilike.%${filters.searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}
