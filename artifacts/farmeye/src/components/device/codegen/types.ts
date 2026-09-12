import { z } from 'zod';

/** Shared types + validation schemas for the ESP32 firmware generator. */

export type FarmType = 'layer' | 'broiler';
export type FirmwareMode = 'hardcoded' | 'ota';
export type FirmwareVersion = 'v8' | 'v10';
export type HardwareVersion = 'v8' | 'v10' | 'unknown';
export type Language = 'bn' | 'en';

export interface FarmOption {
  id: string;
  name: string;
  name_en: string;
  owner_id: string;
  owner_phone?: string;
}

export interface VerifyErrorState {
  expected: FirmwareVersion;
  detected: FirmwareVersion | 'unknown';
  url: string;
}

/** Hardcoded mode requires WiFi + token. */
export const configSchema = z.object({
  ssid: z.string().trim().min(1, 'WiFi নাম দিন').max(32, 'WiFi নাম ৩২ অক্ষরের বেশি হতে পারবে না'),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে').max(64, 'পাসওয়ার্ড ৬৪ অক্ষরের বেশি হতে পারবে না'),
  deviceToken: z.string().trim().min(10, 'সঠিক ডিভাইস টোকেন দিন').max(100, 'টোকেন সঠিক নয়'),
  shedId: z.string().optional(),
  shedName: z.string().optional(),
  farmId: z.string().optional(),
});

/** OTA mode doesn't require credentials. */
export const otaConfigSchema = z.object({
  shedId: z.string().optional(),
  shedName: z.string().optional(),
});
