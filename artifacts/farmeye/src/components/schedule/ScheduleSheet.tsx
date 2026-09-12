import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Clock, Calendar, Bell, Utensils, Sparkles, Syringe, Settings2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useSchedules,
  useAddSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  ScheduleType,
  RecurrenceType,
  getScheduleTypeLabel,
  getRecurrenceLabel,
} from '@/hooks/useSchedules';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { TestPushButton } from '@/components/notifications/TestPushButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const scheduleTypeIcons: Record<ScheduleType, any> = {
  feed: Utensils,
  cleaning: Sparkles,
  vaccination: Syringe,
  custom: Settings2,
};

// Custom interval options for cleaning (every X days)
const CLEANING_INTERVALS = [
  { value: 1, label_en: 'Every day', label_bn: 'প্রতিদিন' },
  { value: 2, label_en: 'Every 2 days', label_bn: '২ দিন পরপর' },
  { value: 3, label_en: 'Every 3 days', label_bn: '৩ দিন পরপর' },
  { value: 4, label_en: 'Every 4 days', label_bn: '৪ দিন পরপর' },
  { value: 5, label_en: 'Every 5 days', label_bn: '৫ দিন পরপর' },
  { value: 6, label_en: 'Every 6 days', label_bn: '৬ দিন পরপর' },
  { value: 7, label_en: 'Every 7 days (Weekly)', label_bn: '৭ দিন পরপর (সাপ্তাহিক)' },
];

interface ScheduleSheetProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ScheduleSheet({ trigger, open, onOpenChange }: ScheduleSheetProps) {
  const { language } = useAuth();
  const { data: schedules, isLoading } = useSchedules();
  const addSchedule = useAddSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cleaningInterval, setCleaningInterval] = useState(7); // Default 7 days
  const [newSchedule, setNewSchedule] = useState({
    schedule_type: 'feed' as ScheduleType,
    title: '',
    title_bn: '',
    description: '',
    recurrence: 'daily' as RecurrenceType,
    time_of_day: '08:00',
    day_of_week: null as number | null,
    day_of_month: null as number | null,
    is_active: true,
    notify_before_minutes: 30,
    shed_id: null as string | null,
    next_run_at: null as string | null,
    last_run_at: null as string | null,
    custom_interval_days: null as number | null, // For custom cleaning intervals
  });

  const handleAddSchedule = async () => {
    if (!newSchedule.title.trim()) {
      toast.error(language === 'bn' ? 'শিরোনাম দিন' : 'Enter title');
      return;
    }

    try {
      await addSchedule.mutateAsync(newSchedule);
      toast.success(language === 'bn' ? 'শিডিউল যোগ হয়েছে' : 'Schedule added');
      setNewSchedule({
        schedule_type: 'feed',
        title: '',
        title_bn: '',
        description: '',
        recurrence: 'daily',
        time_of_day: '08:00',
        day_of_week: null,
        day_of_month: null,
        is_active: true,
        notify_before_minutes: 30,
        shed_id: null,
        next_run_at: null,
        last_run_at: null,
        custom_interval_days: null,
      });
      setCleaningInterval(7);
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add schedule');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule.mutateAsync(id);
      toast.success(language === 'bn' ? 'শিডিউল মুছে ফেলা হয়েছে' : 'Schedule deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    try {
      await updateSchedule.mutateAsync({ id, is_active });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const dayNames = language === 'bn'
    ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'bn' ? 'শিডিউল ম্যানেজমেন্ট' : 'Schedule Management'}
          </SheetTitle>
          <SheetDescription>
            {language === 'bn' ? 'খাবার, পরিষ্কার ও ভ্যাক্সিনেশন শিডিউল সেট করুন' : 'Set feed, cleaning and vaccination schedules'}
          </SheetDescription>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs text-muted-foreground pr-2">
              {language === 'bn'
                ? 'নোটিফিকেশন কাজ করছে কিনা যাচাই করুন'
                : 'Verify notifications are working'}
            </div>
            <TestPushButton />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Add Schedule Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2">
                <Plus size={18} />
                {language === 'bn' ? 'নতুন শিডিউল যোগ করুন' : 'Add New Schedule'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90%] rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {language === 'bn' ? 'নতুন শিডিউল' : 'New Schedule'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                {/* Schedule Type */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {language === 'bn' ? 'ধরন' : 'Type'}
                  </label>
                  <Select
                    value={newSchedule.schedule_type}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, schedule_type: v as ScheduleType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feed">{getScheduleTypeLabel('feed', language)}</SelectItem>
                      <SelectItem value="cleaning">{getScheduleTypeLabel('cleaning', language)}</SelectItem>
                      <SelectItem value="vaccination">{getScheduleTypeLabel('vaccination', language)}</SelectItem>
                      <SelectItem value="custom">{getScheduleTypeLabel('custom', language)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {language === 'bn' ? 'শিরোনাম' : 'Title'}
                  </label>
                  <Input
                    placeholder={language === 'bn' ? 'যেমন: সকালের খাবার' : 'e.g. Morning Feed'}
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  />
                </div>

                {/* Recurrence - Show custom interval for cleaning */}
                {newSchedule.schedule_type === 'cleaning' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      {language === 'bn' ? 'কত দিন পরপর' : 'Cleaning Interval'}
                    </label>
                    <Select
                      value={String(cleaningInterval)}
                      onValueChange={(v) => {
                        const interval = parseInt(v);
                        setCleaningInterval(interval);
                        // Set recurrence based on interval
                        if (interval === 1) {
                          setNewSchedule({ ...newSchedule, recurrence: 'daily', custom_interval_days: 1 });
                        } else if (interval === 7) {
                          setNewSchedule({ ...newSchedule, recurrence: 'weekly', custom_interval_days: 7 });
                        } else {
                          // For custom intervals (2-6 days), we'll use 'daily' with custom_interval_days
                          setNewSchedule({ ...newSchedule, recurrence: 'daily', custom_interval_days: interval });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border shadow-lg z-50">
                        {CLEANING_INTERVALS.map((interval) => (
                          <SelectItem key={interval.value} value={String(interval.value)}>
                            {language === 'bn' ? interval.label_bn : interval.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      {language === 'bn' ? 'পুনরাবৃত্তি' : 'Recurrence'}
                    </label>
                    <Select
                      value={newSchedule.recurrence}
                      onValueChange={(v) => setNewSchedule({ ...newSchedule, recurrence: v as RecurrenceType })}
                    >
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border shadow-lg z-50">
                        <SelectItem value="once">{getRecurrenceLabel('once', language)}</SelectItem>
                        <SelectItem value="daily">{getRecurrenceLabel('daily', language)}</SelectItem>
                        <SelectItem value="weekly">{getRecurrenceLabel('weekly', language)}</SelectItem>
                        <SelectItem value="monthly">{getRecurrenceLabel('monthly', language)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Day of Week (for weekly) */}
                {newSchedule.recurrence === 'weekly' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      {language === 'bn' ? 'সপ্তাহের দিন' : 'Day of Week'}
                    </label>
                    <Select
                      value={String(newSchedule.day_of_week ?? 0)}
                      onValueChange={(v) => setNewSchedule({ ...newSchedule, day_of_week: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dayNames.map((day, i) => (
                          <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Day of Month (for monthly) */}
                {newSchedule.recurrence === 'monthly' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      {language === 'bn' ? 'মাসের তারিখ' : 'Day of Month'}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={newSchedule.day_of_month ?? 1}
                      onChange={(e) => setNewSchedule({ ...newSchedule, day_of_month: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                {/* Time */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {language === 'bn' ? 'সময়' : 'Time'}
                  </label>
                  <Input
                    type="time"
                    value={newSchedule.time_of_day}
                    onChange={(e) => setNewSchedule({ ...newSchedule, time_of_day: e.target.value })}
                  />
                </div>

                {/* Notify Before */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {language === 'bn' ? 'আগে নোটিফাই (মিনিট)' : 'Notify Before (min)'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={newSchedule.notify_before_minutes}
                    onChange={(e) => setNewSchedule({ ...newSchedule, notify_before_minutes: parseInt(e.target.value) })}
                    className="w-20"
                  />
                </div>

                <Button
                  onClick={handleAddSchedule}
                  disabled={addSchedule.isPending}
                  className="w-full"
                >
                  {addSchedule.isPending
                    ? (language === 'bn' ? 'যোগ হচ্ছে...' : 'Adding...')
                    : (language === 'bn' ? 'যোগ করুন' : 'Add Schedule')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Schedule List */}
          <div className="space-y-3">
            <AnimatePresence>
              {schedules?.map((schedule) => {
                const Icon = scheduleTypeIcons[schedule.schedule_type];
                return (
                  <motion.div
                    key={schedule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      schedule.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{schedule.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>{schedule.time_of_day}</span>
                        <span>•</span>
                        <span>{getRecurrenceLabel(schedule.recurrence, language)}</span>
                      </div>
                    </div>
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => handleToggle(schedule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(schedule.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {(!schedules || schedules.length === 0) && !isLoading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {language === 'bn' ? 'কোনো শিডিউল নেই' : 'No schedules yet'}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
