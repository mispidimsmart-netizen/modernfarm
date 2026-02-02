import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Fan, Lightbulb, Bell, AlertTriangle, X, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUpdateDeviceStatus, useDeviceStatus } from '@/hooks/useFarmData';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function QuickActionWidget() {
  const { language } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { data: deviceStatus } = useDeviceStatus();
  const updateStatus = useUpdateDeviceStatus();

  // Device control functions
  const toggleFan = () => {
    updateStatus.mutate({ fan_on: !deviceStatus?.fan_on });
    toast.success(language === 'bn' 
      ? `ফ্যান ${deviceStatus?.fan_on ? 'বন্ধ' : 'চালু'} হয়েছে` 
      : `Fan turned ${deviceStatus?.fan_on ? 'off' : 'on'}`);
  };

  const toggleLight = () => {
    updateStatus.mutate({ light_on: !deviceStatus?.light_on });
    toast.success(language === 'bn' 
      ? `লাইট ${deviceStatus?.light_on ? 'বন্ধ' : 'চালু'} হয়েছে` 
      : `Light turned ${deviceStatus?.light_on ? 'off' : 'on'}`);
  };

  const toggleAlarm = () => {
    updateStatus.mutate({ alarm_on: !deviceStatus?.alarm_on });
    toast.success(language === 'bn' 
      ? `অ্যালার্ম ${deviceStatus?.alarm_on ? 'বন্ধ' : 'চালু'} হয়েছে` 
      : `Alarm turned ${deviceStatus?.alarm_on ? 'off' : 'on'}`);
  };

  const emergencyMode = () => {
    // Turn on fan and alarm, turn off light
    updateStatus.mutate({ fan_on: true, alarm_on: true, light_on: false });
    toast.error(language === 'bn' 
      ? '🚨 ইমার্জেন্সি মোড সক্রিয়!' 
      : '🚨 Emergency mode activated!');
  };

  // Voice commands configuration
  const voiceCommands = [
    {
      command: 'Toggle Fan',
      commandBn: 'ফ্যান',
      action: toggleFan,
      keywords: ['fan', 'fan on', 'fan off', 'toggle fan'],
      keywordsBn: ['ফ্যান', 'ফ্যান চালু', 'ফ্যান বন্ধ'],
    },
    {
      command: 'Toggle Light',
      commandBn: 'লাইট',
      action: toggleLight,
      keywords: ['light', 'light on', 'light off', 'toggle light'],
      keywordsBn: ['লাইট', 'লাইট চালু', 'লাইট বন্ধ', 'বাতি'],
    },
    {
      command: 'Toggle Alarm',
      commandBn: 'অ্যালার্ম',
      action: toggleAlarm,
      keywords: ['alarm', 'alarm on', 'alarm off', 'toggle alarm'],
      keywordsBn: ['অ্যালার্ম', 'অ্যালার্ম চালু', 'অ্যালার্ম বন্ধ'],
    },
    {
      command: 'Emergency',
      commandBn: 'ইমার্জেন্সি',
      action: emergencyMode,
      keywords: ['emergency', 'danger', 'alert', 'help'],
      keywordsBn: ['ইমার্জেন্সি', 'বিপদ', 'সাহায্য', 'জরুরি'],
    },
  ];

  const { isListening, isSupported, toggleListening, transcript } = useVoiceCommands({
    commands: voiceCommands,
    onResult: (text) => {
      toast.info(`🎤 ${text}`);
    },
    onError: (error) => {
      toast.error(language === 'bn' ? 'ভয়েস রিকগনিশন এরর' : `Voice error: ${error}`);
    },
  });

  const actions = [
    {
      id: 'fan',
      icon: Fan,
      label: language === 'bn' ? 'ফ্যান' : 'Fan',
      isActive: deviceStatus?.fan_on,
      onClick: toggleFan,
      color: 'bg-cyan-500',
    },
    {
      id: 'light',
      icon: Lightbulb,
      label: language === 'bn' ? 'লাইট' : 'Light',
      isActive: deviceStatus?.light_on,
      onClick: toggleLight,
      color: 'bg-yellow-500',
    },
    {
      id: 'alarm',
      icon: Bell,
      label: language === 'bn' ? 'অ্যালার্ম' : 'Alarm',
      isActive: deviceStatus?.alarm_on,
      onClick: toggleAlarm,
      color: 'bg-purple-500',
    },
    {
      id: 'emergency',
      icon: AlertTriangle,
      label: language === 'bn' ? 'জরুরি' : 'Emergency',
      isActive: false,
      onClick: emergencyMode,
      color: 'bg-red-500',
    },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors ${
          isOpen ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {isOpen ? <X size={24} /> : <Zap size={24} />}
      </motion.button>

      {/* Action Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-36 right-4 z-50 flex flex-col gap-3"
          >
            {/* Voice Command Button */}
            {isSupported && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: 0.05 }}
                onClick={toggleListening}
                className={`flex items-center gap-2 rounded-full px-4 py-3 shadow-lg transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-card text-foreground'
                }`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                <span className="text-sm font-medium">
                  {isListening 
                    ? (language === 'bn' ? 'শুনছি...' : 'Listening...') 
                    : (language === 'bn' ? 'ভয়েস' : 'Voice')}
                </span>
              </motion.button>
            )}

            {/* Action Buttons */}
            {actions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: 0.05 * (index + 1) }}
                onClick={() => {
                  action.onClick();
                  if (action.id !== 'emergency') {
                    // Don't close on emergency
                  }
                }}
                className={`flex items-center gap-2 rounded-full px-4 py-3 shadow-lg transition-all ${
                  action.isActive
                    ? `${action.color} text-white`
                    : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                <action.icon size={20} />
                <span className="text-sm font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Transcript Overlay */}
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-36 left-4 right-20 z-50 rounded-lg bg-card p-3 shadow-lg"
          >
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'শুনছি:' : 'Heard:'}
            </p>
            <p className="font-medium">{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
