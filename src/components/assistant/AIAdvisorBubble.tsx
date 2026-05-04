import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Sparkles, ChevronDown, ChevronUp, ThermometerSun, Wind, Droplets, Bird } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch, useBatchStats } from '@/hooks/useBroilerData';
import { useWeatherCache } from '@/hooks/useWeather';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  text: { bn: string; en: string };
  type: 'advice' | 'warning' | 'tip' | 'celebration';
  icon?: React.ElementType;
}

export function AIAdvisorBubble() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const batchStats = useBatchStats(activeBatch?.id);
  const { data: weather } = useWeatherCache();
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate contextual messages based on current conditions
  const messages = useMemo((): Message[] => {
    const result: Message[] = [];
    const temp = sensorData.temperature;
    const humidity = sensorData.humidity;
    const ammonia = sensorData.ammonia;
    const currentHour = new Date().getHours();
    const outsideTemp = weather?.temperature;

    // Time-based greetings
    if (currentHour >= 5 && currentHour < 12) {
      result.push({
        id: 'morning',
        text: { 
          bn: 'সুপ্রভাত! 🌅 আজকের খামারের কাজ শুরু করুন।', 
          en: "Good morning! 🌅 Let's start today's farm tasks." 
        },
        type: 'tip',
      });
    } else if (currentHour >= 12 && currentHour < 17) {
      result.push({
        id: 'afternoon',
        text: { 
          bn: 'দুপুরে মুরগির পানি পান বাড়ে। 💧 পানির লাইন চেক করুন।', 
          en: "Afternoon peak hours. 💧 Ensure water supply is adequate." 
        },
        type: 'tip',
      });
    }

    // Sensor-based advice — only when real device data exists
    if (hasRealData) {
      // Temperature-based advice
      if (temp > 32 && outsideTemp && outsideTemp < temp) {
        result.push({
          id: 'hot-open-curtain',
          text: { 
            bn: `ভেতরে ${temp.toFixed(0)}°, বাইরে ${outsideTemp.toFixed(0)}° - পর্দা খুলে বাতাস আসতে দিন! 🪟`, 
            en: `Inside ${temp.toFixed(0)}°, outside ${outsideTemp.toFixed(0)}° - Open curtains for ventilation! 🪟` 
          },
          type: 'advice',
          icon: Wind,
        });
      } else if (temp > 32 && outsideTemp && outsideTemp >= temp) {
        result.push({
          id: 'hot-use-fogger',
          text: { 
            bn: `বাইরে আরও গরম! 🥵 ফগার চালু রাখুন, পর্দা বন্ধ।`, 
            en: `It's hotter outside! 🥵 Use fogger, keep curtains closed.` 
          },
          type: 'warning',
          icon: Droplets,
        });
      } else if (temp > 30) {
        result.push({
          id: 'warm',
          text: { 
            bn: 'তাপমাত্রা বাড়ছে। 🌡️ ঠান্ডা পানি নিশ্চিত করুন।', 
            en: "Temperature rising. 🌡️ Ensure cool water is available." 
          },
          type: 'advice',
          icon: ThermometerSun,
        });
      }

      // Low temperature for broiler chicks
      if (isBroiler && batchStats && temp < 28 && batchStats.ageDays <= 14) {
        result.push({
          id: 'cold-chicks',
          text: { 
            bn: `বাচ্চাদের জন্য ${28 - batchStats.ageDays}°C দরকার! 🐣 হিটার চেক করুন।`, 
            en: `Chicks need ${28 - batchStats.ageDays}°C! 🐣 Check heater.` 
          },
          type: 'warning',
          icon: ThermometerSun,
        });
      }

      // Ammonia advice
      if (ammonia > 15) {
        result.push({
          id: 'ammonia',
          text: { 
            bn: 'অ্যামোনিয়া বেশি! 💨 লিটার শুকনো রাখুন ও বায়ু চলাচল বাড়ান।', 
            en: 'Ammonia is high! 💨 Keep litter dry and improve ventilation.' 
          },
          type: 'warning',
          icon: Wind,
        });
      }

      // Humidity advice
      if (humidity > 80) {
        result.push({
          id: 'humid',
          text: { 
            bn: 'আর্দ্রতা অনেক বেশি! 💦 ফ্যান বাড়ান, ফগার বন্ধ রাখুন।', 
            en: 'Humidity too high! 💦 Increase fans, stop fogger.' 
          },
          type: 'warning',
          icon: Droplets,
        });
      }
    } else {
      // No real sensor data yet (new account / device offline)
      result.push({
        id: 'no-sensor-data',
        text: {
          bn: 'এখনো সেন্সর ডেটা পাইনি। 📡 ESP32 ডিভাইস কানেক্ট করুন।',
          en: 'No sensor data yet. 📡 Connect your ESP32 device to get live advice.',
        },
        type: 'tip',
      });
    }

    // All good — only when real sensor data confirms ideal range
    if (hasRealData && temp >= 22 && temp <= 28 && humidity >= 50 && humidity <= 70 && ammonia < 10) {
      result.unshift({
        id: 'all-good',
        text: { 
          bn: 'সব ঠিক আছে! ✨ খামার চমৎকার অবস্থায় আছে।', 
          en: "All systems go! ✨ Farm is in excellent condition." 
        },
        type: 'celebration',
      });
    }

    // Broiler weight check reminder
    if (isBroiler && batchStats && batchStats.ageDays % 7 === 0 && batchStats.ageDays > 0) {
      result.push({
        id: 'weight-check',
        text: { 
          bn: `আজ সপ্তাহ ${batchStats.ageWeeks}! 📊 ওজন রেকর্ড করুন।`, 
          en: `Week ${batchStats.ageWeeks} today! 📊 Time to record weights.` 
        },
        type: 'tip',
        icon: Bird,
      });
    }

    return result.slice(0, 3); // Max 3 messages
  }, [sensorData, weather, isBroiler, batchStats, language]);

  const primaryMessage = messages[0];
  const secondaryMessages = messages.slice(1);

  const getTypeStyles = (type: Message['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300';
      case 'advice':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300';
      case 'celebration':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
      default:
        return 'bg-primary/5 border-primary/20 text-foreground';
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 shadow-lg">
      <CardContent className="p-0">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {language === 'bn' ? 'ফার্ম এসিস্ট্যান্ট' : 'Farm Assistant'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {language === 'bn' ? 'AI পরামর্শ' : 'AI-powered advice'}
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 space-y-2">
                {/* Primary bubble */}
                {primaryMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative p-3 rounded-2xl rounded-tl-sm border ${getTypeStyles(primaryMessage.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      {primaryMessage.icon && (
                        <primaryMessage.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-sm leading-relaxed">{primaryMessage.text[language]}</p>
                    </div>
                    {/* Chat bubble tail */}
                    <div className={`absolute top-0 -left-2 w-4 h-4 ${
                      primaryMessage.type === 'warning' ? 'bg-amber-500/10' 
                      : primaryMessage.type === 'celebration' ? 'bg-emerald-500/10'
                      : primaryMessage.type === 'advice' ? 'bg-blue-500/10'
                      : 'bg-primary/5'
                    } rounded-br-xl`} />
                  </motion.div>
                )}

                {/* Secondary messages */}
                {secondaryMessages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index + 1) * 0.1 }}
                    className={`p-2.5 rounded-xl border text-xs ${getTypeStyles(msg.type)}`}
                  >
                    <div className="flex items-center gap-2">
                      {msg.icon && <msg.icon className="h-4 w-4 flex-shrink-0" />}
                      <span>{msg.text[language]}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
