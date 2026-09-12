// SSOT for the farm setup wizard's relay targets and automation profile options.

export interface RelayTarget {
  key: string;
  icon: string;
  /** Short label used by the simulation test */
  bn: string;
  en: string;
  /** Long label (with relay channel + GPIO) used by the manual relay test */
  testBn: string;
  testEn: string;
}

export const SETUP_RELAY_TARGETS: RelayTarget[] = [
  { key: 'fan', icon: '🌀', bn: 'এক্সহস্ট ফ্যান', en: 'Exhaust Fan', testBn: 'এক্সহস্ট ফ্যান (IN1 - GPIO 25)', testEn: 'Exhaust Fan (IN1 - GPIO 25)' },
  { key: 'ceiling_fan', icon: '🔄', bn: 'সিলিং ফ্যান', en: 'Ceiling Fan', testBn: 'সিলিং ফ্যান (IN2 - GPIO 26)', testEn: 'Ceiling Fan (IN2 - GPIO 26)' },
  { key: 'light', icon: '💡', bn: 'লাইট', en: 'Light', testBn: 'লাইট (IN3 - GPIO 27)', testEn: 'Light (IN3 - GPIO 27)' },
  { key: 'heater', icon: '🔥', bn: 'হিটার', en: 'Heater', testBn: 'হিটার (IN4 - GPIO 14)', testEn: 'Heater (IN4 - GPIO 14)' },
  { key: 'fogger', icon: '💧', bn: 'ফগার', en: 'Fogger', testBn: 'ফগার (IN5 - GPIO 12)', testEn: 'Fogger (IN5 - GPIO 12)' },
  { key: 'alarm', icon: '🔔', bn: 'বাজার', en: 'Buzzer', testBn: 'বাজার/অ্যালার্ম (IN6 - GPIO 13)', testEn: 'Buzzer/Alarm (IN6 - GPIO 13)' },
  { key: 'sprinkler', icon: '🚿', bn: 'স্প্রিংকলার', en: 'Sprinkler', testBn: 'স্প্রিংকলার (IN7 - GPIO 15)', testEn: 'Sprinkler (IN7 - GPIO 15)' },
  { key: 'circulation_fan', icon: '🌬️', bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan', testBn: 'সার্কুলেশন ফ্যান (IN8 - GPIO 33)', testEn: 'Circulation Fan (IN8 - GPIO 33)' },
];

export interface AutomationProfileOption {
  id: string;
  icon: string;
  en: string;
  bn: string;
  desc_en: string;
  desc_bn: string;
}

export const SETUP_AUTOMATION_PROFILES: AutomationProfileOption[] = [
  { id: 'conservative', icon: '🛡️', en: 'Conservative (Safety First)', bn: 'রক্ষণশীল (নিরাপত্তা প্রথম)', desc_en: 'Lower thresholds, more frequent checks', desc_bn: 'নিরাপদ সীমা, ঘন ঘন পরীক্ষা' },
  { id: 'balanced', icon: '⚖️', en: 'Balanced (Recommended)', bn: 'ভারসাম্যপূর্ণ (সুপারিশকৃত)', desc_en: 'Standard poultry industry defaults', desc_bn: 'স্ট্যান্ডার্ড পোল্ট্রি ইন্ডাস্ট্রি ডিফল্ট' },
  { id: 'aggressive', icon: '⚡', en: 'Aggressive (Max Production)', bn: 'আক্রমণাত্মক (সর্বোচ্চ উৎপাদন)', desc_en: 'Tighter ranges, faster responses', desc_bn: 'কঠোর সীমা, দ্রুত প্রতিক্রিয়া' },
];

/** Device token format: FARM-XXXX-XXXX-XXXX */
export function generateDeviceToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FARM-${segment(4)}-${segment(4)}-${segment(4)}`;
}
