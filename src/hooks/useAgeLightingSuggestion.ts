import { useMemo } from 'react';
import { useLightingSchedule } from '@/hooks/useLightingCurve';
import { useBirdAge } from '@/hooks/useBirdAge';

/**
 * Age-based lighting recommendations for layer chickens
 * Based on poultry science research for optimal egg production
 * 
 * Guidelines:
 * - 0-8 weeks: 20-22 hours (brooding period)
 * - 8-16 weeks: 8-10 hours (controlled light to prevent early maturity)
 * - 16-18 weeks: Gradually increase to 14-16 hours
 * - 18+ weeks: 16-17 hours (peak production)
 */

export interface LightingSuggestion {
  recommendedHours: number;
  recommendedStartTime: string;
  recommendedEndTime: string;
  phase: 'brooding' | 'growing' | 'pre-lay' | 'production' | 'unknown';
  phaseLabel: { bn: string; en: string };
  description: { bn: string; en: string };
  tips: { bn: string; en: string }[];
  isOptimal: boolean;
  deviation: number; // hours difference from current setting
}

interface AgeRecommendation {
  minAge: number;
  maxAge: number;
  hours: number;
  phase: LightingSuggestion['phase'];
  phaseLabel: { bn: string; en: string };
  description: { bn: string; en: string };
  tips: { bn: string; en: string }[];
}

const AGE_RECOMMENDATIONS: AgeRecommendation[] = [
  {
    minAge: 0,
    maxAge: 8,
    hours: 22,
    phase: 'brooding',
    phaseLabel: { bn: 'ব্রুডিং পর্যায়', en: 'Brooding Phase' },
    description: {
      bn: 'বাচ্চাদের জন্য প্রায় ২৪ ঘন্টা আলো প্রয়োজন। খাদ্য ও পানি খুঁজে পেতে সাহায্য করে।',
      en: 'Chicks need near-continuous light to find food and water easily.'
    },
    tips: [
      { bn: 'প্রথম ৩ দিন ২৪ ঘন্টা আলো দিন', en: 'Provide 24h light for first 3 days' },
      { bn: 'ধীরে ধীরে ২০ ঘন্টায় কমান', en: 'Gradually reduce to 20 hours' },
    ],
  },
  {
    minAge: 8,
    maxAge: 16,
    hours: 10,
    phase: 'growing',
    phaseLabel: { bn: 'বৃদ্ধি পর্যায়', en: 'Growing Phase' },
    description: {
      bn: 'এই সময় আলো কম রাখুন। তাড়াতাড়ি পরিপক্বতা ও ছোট ডিম প্রতিরোধ করতে।',
      en: 'Reduce light to prevent early maturity and small eggs.'
    },
    tips: [
      { bn: '৮-১০ ঘন্টা আলো যথেষ্ট', en: '8-10 hours of light is sufficient' },
      { bn: 'শরীরের বিকাশে ফোকাস করুন', en: 'Focus on body development' },
    ],
  },
  {
    minAge: 16,
    maxAge: 18,
    hours: 14,
    phase: 'pre-lay',
    phaseLabel: { bn: 'ডিম দেওয়ার প্রস্তুতি', en: 'Pre-Lay Phase' },
    description: {
      bn: 'ধীরে ধীরে আলোর সময় বাড়ান। প্রতি সপ্তাহে ১ ঘন্টা বাড়াতে থাকুন।',
      en: 'Gradually increase light. Add 1 hour per week to stimulate production.'
    },
    tips: [
      { bn: 'প্রতি সপ্তাহে ১ ঘন্টা করে বাড়ান', en: 'Increase 1 hour per week' },
      { bn: '১৬ ঘন্টায় পৌঁছানো পর্যন্ত চালিয়ে যান', en: 'Continue until reaching 16 hours' },
    ],
  },
  {
    minAge: 18,
    maxAge: 100,
    hours: 16,
    phase: 'production',
    phaseLabel: { bn: 'উৎপাদন পর্যায়', en: 'Production Phase' },
    description: {
      bn: 'সর্বোচ্চ ডিম উৎপাদনের জন্য ১৬-১৭ ঘন্টা আলো দিন। এটি স্থিতিশীল রাখুন।',
      en: 'Maintain 16-17 hours for peak egg production. Keep consistent.'
    },
    tips: [
      { bn: 'আলোর সময় কখনো কমাবেন না', en: 'Never decrease light duration' },
      { bn: 'সকাল ৫টায় শুরু, রাত ৯টায় শেষ', en: 'Start at 5 AM, end at 9 PM' },
      { bn: 'স্মার্ট কার্ভ ব্যবহার করুন', en: 'Use smart curve for transitions' },
    ],
  },
];

export function useAgeLightingSuggestion(): LightingSuggestion | null {
  const { ageWeeks, isLoading: ageLoading, hasValue } = useBirdAge();
  const { isLoading: scheduleLoading } = useLightingSchedule();

  return useMemo(() => {
    if (ageLoading || scheduleLoading || !hasValue || ageWeeks === null) {
      return null;
    }

    // Find matching recommendation
    const recommendation = AGE_RECOMMENDATIONS.find(
      r => ageWeeks >= r.minAge && ageWeeks < r.maxAge
    );

    if (!recommendation) {
      return {
        recommendedHours: 16,
        recommendedStartTime: '05:00',
        recommendedEndTime: '21:00',
        phase: 'unknown',
        phaseLabel: { bn: 'অজানা', en: 'Unknown' },
        description: { bn: 'মুরগির বয়স ইনপুট করুন', en: 'Enter flock age' },
        tips: [],
        isOptimal: false,
        deviation: 0,
      };
    }

    const recommendedHours = recommendation.hours;
    
    // Calculate optimal times (centered around midday for natural feel)
    // For 16 hours: 05:00 - 21:00
    // For 10 hours: 07:00 - 17:00
    // For 22 hours: 03:00 - 01:00 (next day)
    const startHour = Math.max(3, 12 - Math.floor(recommendedHours / 2));
    const endHour = startHour + recommendedHours;
    
    const recommendedStartTime = `${startHour.toString().padStart(2, '0')}:00`;
    const recommendedEndTime = `${(endHour % 24).toString().padStart(2, '0')}:00`;

    // Check current settings deviation
    let currentHours = 16; // default
    if (schedule) {
      const startTime = typeof schedule.start_time === 'string' ? schedule.start_time : '05:00';
      const endTime = typeof schedule.end_time === 'string' ? schedule.end_time : '21:00';
      
      const [startH] = startTime.split(':').map(Number);
      const [endH] = endTime.split(':').map(Number);
      currentHours = endH >= startH ? endH - startH : (24 - startH + endH);
    }

    const deviation = currentHours - recommendedHours;
    const isOptimal = Math.abs(deviation) <= 1; // within 1 hour tolerance

    return {
      recommendedHours,
      recommendedStartTime,
      recommendedEndTime,
      phase: recommendation.phase,
      phaseLabel: recommendation.phaseLabel,
      description: recommendation.description,
      tips: recommendation.tips,
      isOptimal,
      deviation,
    };
  }, [flockInfo, schedule, flockLoading, scheduleLoading]);
}
