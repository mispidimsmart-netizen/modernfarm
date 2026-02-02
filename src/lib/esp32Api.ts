// ESP32 API Service Layer
// This file provides a clean interface for ESP32 devices to communicate with the backend

const API_BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface SensorData {
  temperature: number;
  humidity: number;
  ammonia: number;
  water_usage: number;
}

interface DeviceStatus {
  power_on?: boolean;
  fan_on?: boolean;
  light_on?: boolean;
  alarm_on?: boolean;
}

interface FarmSettings {
  temperature_min: number;
  temperature_max: number;
  humidity_min: number;
  humidity_max: number;
  ammonia_max: number;
}

interface AutomationRule {
  condition_sensor: 'temperature' | 'humidity' | 'ammonia';
  condition_operator: '>' | '<' | '>=' | '<=';
  condition_value: number;
  action_device: 'fan' | 'light' | 'alarm';
  action_state: boolean;
  enabled: boolean;
}

interface LightingSchedule {
  start_time: string;
  end_time: string;
  total_hours: number;
  manual_override: boolean;
  gradual_enabled: boolean;
  fade_in_minutes: number;
  fade_out_minutes: number;
  min_brightness: number;
  max_brightness: number;
  current_brightness: number;  // 0-100 percentage
  current_phase: 'off' | 'fade-in' | 'on' | 'fade-out' | 'manual';
  pwm_value: number;           // 0-255 for ESP32 PWM
}

class ESP32ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ESP32ApiError';
    this.code = code;
    this.status = status;
  }
}

async function makeRequest<T>(
  endpoint: string,
  deviceToken: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}/functions/v1/esp32-api/${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': deviceToken,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ESP32ApiError(
        data.error || 'Request failed',
        data.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ESP32ApiError) {
      throw error;
    }
    
    // Network or parsing error
    throw new ESP32ApiError(
      error instanceof Error ? error.message : 'Network error',
      'NETWORK_ERROR',
      0
    );
  }
}

// API Methods for ESP32 devices
export const esp32Api = {
  /**
   * Send sensor readings to the backend
   * Call this periodically (e.g., every 30 seconds) from your ESP32
   */
  async sendSensorData(
    deviceToken: string,
    sensorData: SensorData
  ): Promise<ApiResponse<{ alerts_created: number }>> {
    return makeRequest('sensor-data', deviceToken, {
      method: 'POST',
      body: JSON.stringify(sensorData),
    });
  },

  /**
   * Update device status (fan, light, alarm, power)
   * Call this when device states change
   */
  async updateDeviceStatus(
    deviceToken: string,
    status: DeviceStatus
  ): Promise<ApiResponse> {
    return makeRequest('device-status', deviceToken, {
      method: 'POST',
      body: JSON.stringify(status),
    });
  },

  /**
   * Get farm settings (thresholds for automation)
   * Call this on device boot and periodically to sync settings
   */
  async getSettings(deviceToken: string): Promise<ApiResponse<FarmSettings>> {
    return makeRequest('settings', deviceToken, {
      method: 'GET',
    });
  },

  /**
   * Get active automation rules
   * Use these to decide when to turn on/off devices
   */
  async getAutomationRules(deviceToken: string): Promise<ApiResponse<AutomationRule[]>> {
    return makeRequest('automation-rules', deviceToken, {
      method: 'GET',
    });
  },

  /**
   * Get lighting schedule
   * Use this to control lights based on time
   */
  async getLightingSchedule(deviceToken: string): Promise<ApiResponse<LightingSchedule>> {
    return makeRequest('lighting-schedule', deviceToken, {
      method: 'GET',
    });
  },
};

// Utility for generating device tokens (for admin use)
export function generateDeviceToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'ESP32_';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Example ESP32 Arduino code (for documentation)
export const ESP32_EXAMPLE_CODE = `
/*
 * Smart Layer Farm - ESP32 Example Code
 * 
 * This example shows how to send sensor data and receive settings
 * from the Smart Layer Farm IoT backend.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiUrl = "${API_BASE_URL}/functions/v1/esp32-api";
const char* deviceToken = "YOUR_DEVICE_TOKEN"; // Get this from the app

void sendSensorData(float temp, float humidity, float ammonia, float water) {
  HTTPClient http;
  http.begin(String(apiUrl) + "/sensor-data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", deviceToken);
  
  StaticJsonDocument<200> doc;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["ammonia"] = ammonia;
  doc["water_usage"] = water;
  
  String json;
  serializeJson(doc, json);
  
  int responseCode = http.POST(json);
  if (responseCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
  }
  http.end();
}

void getAutomationRules() {
  HTTPClient http;
  http.begin(String(apiUrl) + "/automation-rules");
  http.addHeader("x-device-token", deviceToken);
  
  int responseCode = http.GET();
  if (responseCode > 0) {
    String response = http.getString();
    // Parse and apply automation rules
    Serial.println("Rules: " + response);
  }
  http.end();
}
`;
