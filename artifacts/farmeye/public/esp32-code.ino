/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⛔⛔⛔ THIS FIRMWARE IS DISABLED FOR SAFETY – DO NOT DEPLOY ⛔⛔⛔     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                        ║
 * ║  This file is a LEGACY STUB. All hardware control has been removed.    ║
 * ║  It cannot control relays, fans, heaters, alarms, or any GPIO.        ║
 * ║                                                                        ║
 * ║  The ONLY authorized firmware is:                                      ║
 * ║    👉 esp32-industrial.ino (v7.0+)                                     ║
 * ║                                                                        ║
 * ║  If this firmware is accidentally uploaded:                            ║
 * ║    - No relay will activate                                            ║
 * ║    - No automation will run                                            ║
 * ║    - Serial monitor will show diagnostic warnings                     ║
 * ║    - Birds remain safe (no unintended hardware movement)              ║
 * ║                                                                        ║
 * ║  ORIGINAL: esp32-code.ino (Fail-Safe Automation v3.0)                 ║
 * ║  STATUS:   PERMANENTLY DISABLED                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("╔══════════════════════════════════════════════════════════════╗");
  Serial.println("║  FIRMWARE_TYPE=LEGACY_DISABLED                              ║");
  Serial.println("║  SOURCE: esp32-code.ino                                     ║");
  Serial.println("║  STATUS: ALL HARDWARE CONTROL REMOVED                       ║");
  Serial.println("╠══════════════════════════════════════════════════════════════╣");
  Serial.println("║  ⛔ LEGACY FIRMWARE DISABLED – USE esp32-industrial.ino     ║");
  Serial.println("║  No relays, no automation, no GPIO access.                  ║");
  Serial.println("║  This is a SAFE STUB only.                                  ║");
  Serial.println("╚══════════════════════════════════════════════════════════════╝");
  Serial.println();
  Serial.println("ACTION REQUIRED: Flash esp32-industrial.ino immediately.");
  Serial.println();
}

void loop() {
  Serial.println("[LEGACY_DISABLED] esp32-code.ino – No hardware authority. Upload esp32-industrial.ino.");
  delay(30000);  // Log every 30 seconds
}
