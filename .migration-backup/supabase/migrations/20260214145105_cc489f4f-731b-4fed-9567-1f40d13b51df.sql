
-- Notification priority and escalation system

-- 1. Notification escalation config per user
CREATE TABLE public.notification_escalation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID REFERENCES public.farms(id),
  
  -- Secondary contact for escalation
  secondary_phone TEXT,
  secondary_phone_label TEXT DEFAULT 'Emergency Contact',
  
  -- Escalation rules
  escalation_enabled BOOLEAN DEFAULT true,
  ignored_critical_threshold INTEGER DEFAULT 3,  -- escalate after N ignored critical alerts
  escalation_cooldown_minutes INTEGER DEFAULT 10,
  
  -- Per-level notification channels
  normal_push BOOLEAN DEFAULT true,
  normal_sms BOOLEAN DEFAULT false,
  normal_sound BOOLEAN DEFAULT false,
  
  important_push BOOLEAN DEFAULT true,
  important_sms BOOLEAN DEFAULT false,
  important_sound BOOLEAN DEFAULT true,
  
  urgent_push BOOLEAN DEFAULT true,
  urgent_sms BOOLEAN DEFAULT true,
  urgent_sound BOOLEAN DEFAULT true,
  urgent_repeat_minutes INTEGER DEFAULT 5,
  
  critical_push BOOLEAN DEFAULT true,
  critical_sms BOOLEAN DEFAULT true,
  critical_sound BOOLEAN DEFAULT true,
  critical_webhook BOOLEAN DEFAULT true,
  critical_repeat_minutes INTEGER DEFAULT 2,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, farm_id)
);

ALTER TABLE public.notification_escalation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant access" ON public.notification_escalation_config
  FOR ALL USING (user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (user_can_access_farm(auth.uid(), farm_id));

CREATE TRIGGER update_notification_escalation_config_updated_at
  BEFORE UPDATE ON public.notification_escalation_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Notification delivery log (tracks each delivery attempt per channel)
CREATE TABLE public.notification_delivery_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID REFERENCES public.farms(id),
  
  -- Link to source alert/emergency
  alert_id UUID,  -- from alerts table
  emergency_event_id UUID REFERENCES public.emergency_events(id),
  
  -- Priority level
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent', 'critical')),
  
  -- Channel used
  channel TEXT NOT NULL CHECK (channel IN ('push', 'sms', 'webhook', 'sound', 'in_app')),
  
  -- Delivery status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'ignored')),
  error_message TEXT,
  
  -- Content
  title TEXT NOT NULL,
  body TEXT,
  
  -- Repeat tracking
  repeat_count INTEGER DEFAULT 0,
  next_repeat_at TIMESTAMPTZ,
  max_repeats INTEGER DEFAULT 0,
  
  -- Escalation
  is_escalated BOOLEAN DEFAULT false,
  escalated_to TEXT,  -- secondary phone number
  
  -- Acknowledgement
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant select" ON public.notification_delivery_log
  FOR SELECT USING (user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant insert" ON public.notification_delivery_log
  FOR INSERT WITH CHECK (user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant update" ON public.notification_delivery_log
  FOR UPDATE USING (user_can_access_farm(auth.uid(), farm_id));

CREATE INDEX idx_notification_delivery_pending ON public.notification_delivery_log(user_id, status, next_repeat_at) 
  WHERE status = 'pending' OR status = 'sent';

CREATE INDEX idx_notification_delivery_priority ON public.notification_delivery_log(user_id, priority, created_at DESC);

-- 3. Escalation tracker (tracks ignored critical alerts per user)
CREATE TABLE public.notification_escalation_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID REFERENCES public.farms(id),
  
  -- Consecutive ignored critical count
  ignored_critical_count INTEGER DEFAULT 0,
  last_ignored_at TIMESTAMPTZ,
  
  -- Escalation state
  is_escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  escalation_resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, farm_id)
);

ALTER TABLE public.notification_escalation_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant access" ON public.notification_escalation_tracker
  FOR ALL USING (user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (user_can_access_farm(auth.uid(), farm_id));

CREATE TRIGGER update_notification_escalation_tracker_updated_at
  BEFORE UPDATE ON public.notification_escalation_tracker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for delivery log
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_delivery_log;
