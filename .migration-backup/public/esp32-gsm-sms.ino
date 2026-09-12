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
 * ║  GSM/SMS functionality is now integrated into esp32-industrial.ino    ║
 * ║  as an asynchronous non-blocking service.                              ║
 * ║                                                                        ║
 * ║  If this firmware is accidentally uploaded:                            ║
 * ║    - No relay will activate                                            ║
 * ║    - No SMS will be sent                                               ║
 * ║    - No automation will run                                            ║
 * ║    - Serial monitor will show diagnostic warnings                     ║
 * ║    - Birds remain safe (no unintended hardware movement)              ║
 * ║                                                                        ║
 * ║  ORIGINAL: esp32-gsm-sms.ino (GSM SMS Alert System)                  ║
 * ║  STATUS:   PERMANENTLY DISABLED                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("╔══════════════════════════════════════════════════════════════╗");
  Serial.println("║  FIRMWARE_TYPE=LEGACY_DISABLED                              ║");
  Serial.println("║  SOURCE: esp32-gsm-sms.ino                                 ║");
  Serial.println("║  STATUS: ALL HARDWARE CONTROL REMOVED                       ║");
  Serial.println("╠══════════════════════════════════════════════════════════════╣");
  Serial.println("║  ⛔ LEGACY FIRMWARE DISABLED – USE esp32-industrial.ino     ║");
  Serial.println("║  No relays, no GSM, no automation, no GPIO access.         ║");
  Serial.println("║  This is a SAFE STUB only.                                  ║");
  Serial.println("╚══════════════════════════════════════════════════════════════╝");
  Serial.println();
  Serial.println("ACTION REQUIRED: Flash esp32-industrial.ino immediately.");
  Serial.println();
}

void loop() {
  Serial.println("[LEGACY_DISABLED] esp32-gsm-sms.ino – No hardware authority. Upload esp32-industrial.ino.");
  delay(30000);
}
