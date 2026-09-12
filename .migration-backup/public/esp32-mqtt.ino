/*
 * ════════════════════════════════════════════════════════════════════════════
 * FarmEye ESP32 — esp32-mqtt.ino  (LEGACY / DISABLED STUB)
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  ⚠️  DO NOT FLASH THIS FILE TO PRODUCTION HARDWARE.
 *
 *  This file is intentionally a no-op stub. The previous MQTT bridge used
 *  GPIO 16 and 17 for relay outputs — but in the v10 hardware specification
 *  those pins are the I²C Bus 2 SDA/SCL lines wired to SHT31, BH1750 and
 *  SCD41 sensors. Flashing the legacy code therefore:
 *
 *    • drives I²C lines as outputs and damages sensors,
 *    • leaves heater / fan relays uncommanded, and
 *    • silently disagrees with the cloud "desired_*" contract.
 *
 *  The supported production firmware is `esp32-industrial-v10.ino`, which
 *  already includes telemetry, OTA, safety invariants and GSM failover in a
 *  single image. MQTT support, if needed, will be re-introduced inside that
 *  unified firmware with the correct v10 pin map.
 *
 *  This stub is shipped only so that anyone with a cached link to the file
 *  receives a clearly-marked deactivation notice instead of dangerous code.
 * ════════════════════════════════════════════════════════════════════════════
 */

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("================================================================");
  Serial.println("  FarmEye esp32-mqtt.ino  —  DISABLED LEGACY STUB");
  Serial.println("  Use esp32-industrial-v10.ino as the production firmware.");
  Serial.println("  GPIO 16 and 17 are I2C SDA/SCL on v10 hardware, NOT relays.");
  Serial.println("================================================================");
}

void loop() {
  delay(60000);
  Serial.println("[stub] esp32-mqtt.ino is disabled. Flash esp32-industrial-v10.ino.");
}
