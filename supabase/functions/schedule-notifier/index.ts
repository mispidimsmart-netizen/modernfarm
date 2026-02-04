import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Schedule {
  id: string;
  user_id: string;
  title: string;
  title_bn: string | null;
  schedule_type: string;
  recurrence: string;
  time_of_day: string;
  day_of_week: number | null;
  day_of_month: number | null;
  next_run_at: string | null;
  notify_before_minutes: number;
  is_active: boolean;
}

// Calculate next run time based on recurrence
function calculateNextRun(schedule: Schedule): Date {
  const now = new Date();
  const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
  const nextRun = new Date(now);
  nextRun.setSeconds(0, 0);
  nextRun.setHours(hours, minutes);

  switch (schedule.recurrence) {
    case 'once':
      // Once: don't reschedule
      return nextRun;
      
    case 'daily':
      // Daily: next day at same time
      nextRun.setDate(nextRun.getDate() + 1);
      break;
      
    case 'weekly':
      // Weekly: next week on same day
      nextRun.setDate(nextRun.getDate() + 7);
      break;
      
    case 'monthly':
      // Monthly: same day next month
      nextRun.setMonth(nextRun.getMonth() + 1);
      if (schedule.day_of_month) {
        nextRun.setDate(schedule.day_of_month);
      }
      break;
  }
  
  return nextRun;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`⏰ Schedule Notifier running at: ${now.toISOString()}`);

    // Find schedules that are due for notification
    // Check both: due now OR due for reminder (notify_before_minutes)
    const { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('is_active', true)
      .not('next_run_at', 'is', null);

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedules' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!schedules || schedules.length === 0) {
      console.log('📭 No active schedules found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No active schedules' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${schedules.length} active schedules`);

    let notificationsSent = 0;
    let remindersProcessed = 0;
    let dueProcessed = 0;

    for (const schedule of schedules as Schedule[]) {
      const nextRunAt = new Date(schedule.next_run_at!);
      const reminderTime = new Date(nextRunAt.getTime() - schedule.notify_before_minutes * 60 * 1000);
      
      const timeDiffToReminder = (reminderTime.getTime() - now.getTime()) / 60000; // minutes
      const timeDiffToDue = (nextRunAt.getTime() - now.getTime()) / 60000; // minutes
      
      console.log(`📅 Schedule "${schedule.title}": next_run=${nextRunAt.toISOString()}, reminder_diff=${timeDiffToReminder.toFixed(1)}min, due_diff=${timeDiffToDue.toFixed(1)}min`);

      // Check if it's reminder time (within 1 minute window)
      if (timeDiffToReminder >= -1 && timeDiffToReminder <= 1 && schedule.notify_before_minutes > 0) {
        console.log(`🔔 Sending REMINDER for: ${schedule.title}`);
        
        // Check if we already sent a reminder for this schedule recently
        const { data: existingReminder } = await supabase
          .from('schedule_notifications')
          .select('id')
          .eq('schedule_id', schedule.id)
          .eq('notification_type', 'reminder')
          .gte('created_at', new Date(now.getTime() - 60000).toISOString()) // Last 1 minute
          .single();
        
        if (!existingReminder) {
          // Send push notification
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: schedule.user_id,
              title: `🔔 ${schedule.notify_before_minutes} মিনিট পরে: ${schedule.title}`,
              body: schedule.title_bn || schedule.title,
              severity: 'info',
              url: '/farm',
            },
          });
          
          // Record the notification
          await supabase.from('schedule_notifications').insert({
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            notification_type: 'reminder',
            message: `Reminder: ${schedule.title} in ${schedule.notify_before_minutes} minutes`,
            message_bn: `রিমাইন্ডার: ${schedule.title_bn || schedule.title} - ${schedule.notify_before_minutes} মিনিট পরে`,
          });
          
          remindersProcessed++;
          notificationsSent++;
        }
      }
      
      // Check if it's due time (within 1 minute window)
      if (timeDiffToDue >= -1 && timeDiffToDue <= 1) {
        console.log(`✅ Schedule DUE: ${schedule.title}`);
        
        // Check if we already processed this schedule
        const { data: existingDue } = await supabase
          .from('schedule_notifications')
          .select('id')
          .eq('schedule_id', schedule.id)
          .eq('notification_type', 'due')
          .gte('created_at', new Date(now.getTime() - 60000).toISOString())
          .single();
        
        if (!existingDue) {
          // Send push notification
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: schedule.user_id,
              title: `⏰ এখন সময়: ${schedule.title}`,
              body: schedule.title_bn || schedule.title,
              severity: 'warning',
              url: '/farm',
            },
          });
          
          // Record the notification
          await supabase.from('schedule_notifications').insert({
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            notification_type: 'due',
            message: `Due now: ${schedule.title}`,
            message_bn: `এখন সময়: ${schedule.title_bn || schedule.title}`,
          });
          
          dueProcessed++;
          notificationsSent++;
          
          // Update schedule: set last_run_at and calculate next_run_at
          if (schedule.recurrence !== 'once') {
            const newNextRun = calculateNextRun(schedule);
            await supabase
              .from('schedules')
              .update({
                last_run_at: now.toISOString(),
                next_run_at: newNextRun.toISOString(),
              })
              .eq('id', schedule.id);
            console.log(`📆 Updated next_run_at to: ${newNextRun.toISOString()}`);
          } else {
            // For one-time schedules, deactivate
            await supabase
              .from('schedules')
              .update({
                last_run_at: now.toISOString(),
                is_active: false,
              })
              .eq('id', schedule.id);
            console.log(`✔️ One-time schedule completed and deactivated`);
          }
        }
      }
    }

    console.log(`📊 Results: ${notificationsSent} notifications sent (${remindersProcessed} reminders, ${dueProcessed} due)`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: schedules.length,
        notifications_sent: notificationsSent,
        reminders: remindersProcessed,
        due: dueProcessed,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Schedule notifier error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
