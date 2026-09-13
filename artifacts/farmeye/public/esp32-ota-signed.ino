/**
 * Phase 5 OTA Hardening — ESP32 reference sketch
 * 
 * Features:
 *  1. Signed firmware (Ed25519 signature verified before flash)
 *  2. SHA-256 integrity check (in addition to CRC32)
 *  3. Update window honored (server tells us if outside window)
 *  4. Boot success/failure reporting → exact V8 assignment is terminally updated
 *  5. esp_ota_mark_app_valid_cancel_rollback() AFTER 60s of healthy operation
 * 
 * Required libs:
 *   - ArduinoJson
 *   - HTTPClient
 *   - Update (built-in)
 *   - Ed25519  (rweather/Crypto)
 *   - SHA256   (rweather/Crypto)
 *   - mbedTLS Base64 (built-in via esp32 core)
 * 
 * Partition scheme: "Default 4MB with ffat" or any with 2x OTA partitions.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include <Ed25519.h>
#include <SHA256.h>
#include <esp_ota_ops.h>
#include <Preferences.h>
#include <mbedtls/base64.h>
#include <string.h>

// ─── CONFIG ───
static const char* SUPABASE_URL  = "https://hbwfuvqrfgtefozajyfu.supabase.co";
static const char* SUPABASE_ANON = "YOUR_ANON_KEY_HERE";
static const char* DEVICE_TOKEN  = "FARM-XXXX-XXXX-XXXX";
static const char* CURRENT_VERSION = "8.3.3-ota-safety";
static const uint32_t POST_BOOT_HEALTHY_MS = 60000UL; // 60s of stable operation → mark valid

// Provision the release public key at build time. It is never read from OTA
// metadata; an all-zero key fails closed until release provisioning is done.
// The Ed25519 private key never belongs in firmware.
static const uint8_t OTA_TRUSTED_PUBLIC_KEY[32] = {
  0x37, 0x0B, 0x58, 0xEF, 0xEB, 0x2E, 0x18, 0x90,
  0xBD, 0xB1, 0x0F, 0x91, 0x3A, 0x80, 0x2F, 0x29,
  0xE3, 0x18, 0x40, 0xC9, 0x92, 0x8B, 0xDF, 0x23,
  0x5A, 0x25, 0xF1, 0x3D, 0x0A, 0x8D, 0x62, 0x6F
};
static_assert(sizeof(OTA_TRUSTED_PUBLIC_KEY) == 32, "V8 OTA key must be 32 raw bytes");

static String  g_assignmentId = "";
static String  g_firmwareId  = "";
static String  g_targetVersion = "";
static bool    g_pendingMark = false;
static uint32_t g_bootTimeMs = 0;
static bool    g_terminalReportPending = false;
static bool    g_terminalReportSuccess = false;
static uint32_t g_lastReportAttempt = 0;
static const char* OTA_NVS_NAMESPACE = "ota_terminal";

// ─── Helper: base64 decode ───
static size_t b64Decode(const char* in, uint8_t* out, size_t outMax) {
  size_t outLen = 0;
  if (mbedtls_base64_decode(out, outMax, &outLen,
        (const unsigned char*)in, strlen(in)) != 0) return 0;
  return outLen;
}

static bool trustedKeyProvisioned() {
  for (size_t i = 0; i < sizeof(OTA_TRUSTED_PUBLIC_KEY); i++) {
    if (OTA_TRUSTED_PUBLIC_KEY[i] != 0) return true;
  }
  return false;
}

static bool metadataUsesTrustedKey(const char* publicKeyB64) {
  if (!publicKeyB64 || !trustedKeyProvisioned()) return false;
  uint8_t metadataKey[32];
  return b64Decode(publicKeyB64, metadataKey, sizeof(metadataKey)) == sizeof(metadataKey) &&
         memcmp(metadataKey, OTA_TRUSTED_PUBLIC_KEY, sizeof(metadataKey)) == 0;
}

// ─── Boot report to server ───
static void clearTerminalState() {
  Preferences prefs;
  if (!prefs.begin(OTA_NVS_NAMESPACE, false)) return;
  bool cleared = prefs.clear();
  prefs.end();
  if (cleared) {
    g_firmwareId = "";
    g_assignmentId = "";
    g_targetVersion = "";
    g_terminalReportPending = false;
  }
}

static bool persistTerminalPhase(const char* phase) {
  if (g_assignmentId.length() != 36 || g_firmwareId.isEmpty() || g_targetVersion.isEmpty()) return false;
  Preferences prefs;
  if (!prefs.begin(OTA_NVS_NAMESPACE, false)) return false;
  size_t phaseWritten = prefs.putString("phase", phase);
  prefs.end();
  return phaseWritten > 0;
}

static void loadTerminalState() {
  Preferences prefs;
  if (!prefs.begin(OTA_NVS_NAMESPACE, true)) return;
  String phase = prefs.getString("phase", "");
  g_assignmentId = prefs.getString("assignment_id", "");
  g_firmwareId = prefs.getString("firmware_id", "");
  g_targetVersion = prefs.getString("target_version", "");
  prefs.end();
  if (g_assignmentId.length() != 36 || g_firmwareId.isEmpty() || g_targetVersion.isEmpty()) return;

  const esp_partition_t* running = esp_ota_get_running_partition();
  esp_ota_img_states_t imageState;
  bool provisional = esp_ota_get_state_partition(running, &imageState) == ESP_OK &&
                     imageState == ESP_OTA_IMG_PENDING_VERIFY;
  if (phase == "validated") {
    g_terminalReportSuccess = true;
    g_terminalReportPending = true;
  } else if (phase == "pending" && g_targetVersion == CURRENT_VERSION && !provisional) {
    // The valid mark succeeded but the phase write was interrupted.
    g_terminalReportSuccess = true;
    g_terminalReportPending = true;
  } else if (phase == "pending" && g_targetVersion != CURRENT_VERSION) {
    // The old image is running after ESP-IDF rollback, so report failure for
    // this exact assignment rather than losing the identity on reboot.
    g_terminalReportSuccess = false;
    g_terminalReportPending = true;
  }
}

static bool reportBoot(bool success, bool sigValidated) {
  if (g_assignmentId.length() != 36 || g_firmwareId.isEmpty()) return false;
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/functions/v1/ota-firmware-v8?action=boot-report";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON);
  http.addHeader("x-device-token", DEVICE_TOKEN);

  StaticJsonDocument<256> body;
  body["assignment_id"]       = g_assignmentId;
  body["firmware_id"]         = g_firmwareId;
  body["boot_success"]        = success;
  body["signature_validated"] = sigValidated;
  body["version"]             = CURRENT_VERSION;
  body["from_version"]        = g_targetVersion;
  if (!success) body["error_message"] = "ota_image_rolled_back_or_boot_failed";
  String payload; serializeJson(body, payload);
  int code = http.POST(payload);
  String response = http.getString();
  http.end();
  StaticJsonDocument<256> acknowledgement;
  bool acknowledged = code >= 200 && code < 300 &&
    deserializeJson(acknowledgement, response) == DeserializationError::Ok &&
    acknowledgement["success"] == true;
  if (acknowledged) clearTerminalState();
  return acknowledged;
}

static void flushTerminalReport() {
  if (!g_terminalReportPending || WiFi.status() != WL_CONNECTED) return;
  uint32_t now = millis();
  if (g_lastReportAttempt != 0 && now - g_lastReportAttempt < 30000UL) return;
  g_lastReportAttempt = now;
  if (reportBoot(g_terminalReportSuccess, g_terminalReportSuccess)) {
    Serial.println("[OTA] Terminal boot report acknowledged");
  } else {
    Serial.println("[OTA] Terminal report failed; retaining NVS identity");
  }
}

// ─── Check for update ───
bool checkUpdate(JsonDocument& doc) {
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/functions/v1/ota-firmware-v8?action=check"
             + "&current_version=" + CURRENT_VERSION;
  http.begin(url);
  http.addHeader("apikey", SUPABASE_ANON);
  http.addHeader("x-device-token", DEVICE_TOKEN);
  int code = http.GET();
  if (code != 200) { http.end(); return false; }
  DeserializationError err = deserializeJson(doc, http.getString());
  http.end();
  if (err) return false;
  return doc["update_available"] == true;
}

// ─── Download + verify + flash ───
bool installFirmware(JsonDocument& meta) {
  const char* fwUrl     = meta["url"];
  size_t      fwSize    = meta["size"]   | 0;
  const char* sha256Hex = meta["sha256"] | "";
  const char* sigB64    = meta["signature"] | "";
  const char* pubKeyB64 = meta["signing_key"]["public_key"] | "";
  const char* assignmentId = meta["assignment_id"] | "";
  const char* firmwareId = meta["firmware_id"] | "";
  const char* targetVersion = meta["version"] | "";
  g_assignmentId = String(assignmentId);
  g_firmwareId = String(firmwareId);
  g_targetVersion = String(targetVersion);

  // V8 production metadata is always signed. Missing signature/digest is a
  // hard failure; there is no unsigned development fallback in this path.
  if (!fwUrl || strncmp(fwUrl, "https://", 8) != 0 || fwSize == 0 ||
      strlen(sha256Hex) != 64 || strlen(sigB64) == 0 ||
      strlen(pubKeyB64) == 0 || g_assignmentId.length() != 36 ||
      g_firmwareId.isEmpty() ||
      g_targetVersion.isEmpty() || !metadataUsesTrustedKey(pubKeyB64)) {
    Serial.println("[OTA] Missing mandatory digest/signature metadata");
    return false;
  }

  HTTPClient http;
  http.begin(fwUrl);
  if (http.GET() != 200) { http.end(); return false; }
  WiFiClient* stream = http.getStreamPtr();

  if (!Update.begin(fwSize)) { http.end(); return false; }

  SHA256 sha;
  uint8_t buf[1024];
  size_t total = 0;
  while (http.connected() && (total < fwSize)) {
    size_t avail = stream->available();
    if (avail) {
      int n = stream->readBytes(buf, min(avail, sizeof(buf)));
      sha.update(buf, n);
      Update.write(buf, n);
      total += n;
    } else delay(1);
  }
  http.end();

  if (total != fwSize) { Update.abort(); return false; }

  // ── SHA-256 check ──
  uint8_t digest[32];
  sha.finalize(digest, sizeof(digest));
  char calc[65]; for (int i=0;i<32;i++) sprintf(calc+i*2,"%02x",digest[i]); calc[64]=0;
  if (strcasecmp(calc, sha256Hex) != 0) {
    Serial.println("[OTA] SHA-256 mismatch!");
    Update.abort(); return false;
  }

  // ── Ed25519 signature verify (over SHA-256 digest) ──
  uint8_t sig[64];
  if (b64Decode(sigB64, sig, sizeof(sig)) != 64 ||
      !Ed25519::verify(sig, OTA_TRUSTED_PUBLIC_KEY, digest, 32)) {
    Serial.println("[OTA] SIGNATURE INVALID — aborting flash!");
    Update.abort(); return false;
  }
  Serial.println("[OTA] Signature verified ✓");

  if (!Update.end(true)) { Serial.println("[OTA] Update.end failed"); return false; }

  // Persist exact assignment identity before reboot. It is retained until the
  // V8 endpoint acknowledges the terminal report after the healthy gate.
  Preferences prefs;
  if (!prefs.begin(OTA_NVS_NAMESPACE, false) ||
      prefs.putString("assignment_id", g_assignmentId) == 0 ||
      prefs.putString("firmware_id", g_firmwareId) == 0 ||
      prefs.putString("target_version", g_targetVersion) == 0 ||
      prefs.putString("phase", "pending") == 0) {
    prefs.end();
    Serial.println("[OTA] Cannot persist assignment identity; refusing reboot");
    return false;
  }
  prefs.end();
  Serial.println("[OTA] Restarting...");
  delay(500);
  ESP.restart();
  return true;
}

void setup() {
  Serial.begin(115200);
  loadTerminalState();
  WiFi.begin("YOUR_SSID", "YOUR_PSK");
  // Bounded wait — never block the boot path forever on a missing AP.
  const unsigned long WIFI_WAIT_MS = 30000UL;
  unsigned long wifiWaitStart = millis();
  while (WiFi.status() != WL_CONNECTED &&
         (millis() - wifiWaitStart) < WIFI_WAIT_MS) {
    delay(250);
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[OTA] WiFi not connected within 30s — continuing offline");
  }

  // First check: if we just booted from a fresh OTA, mark provisional
  const esp_partition_t* running = esp_ota_get_running_partition();
  esp_ota_img_states_t st;
  if (esp_ota_get_state_partition(running, &st) == ESP_OK
      && st == ESP_OTA_IMG_PENDING_VERIFY) {
    g_pendingMark = true;
    g_bootTimeMs = millis();
    Serial.println("[OTA] Booted into PENDING_VERIFY image");
  }

  // Retry a report left over from a prior boot before checking for another
  // assignment. A rollback is detectable here by the version mismatch loaded
  // from NVS; a validated image may have lost only the network acknowledgement.
  flushTerminalReport();

  // Periodic update check
  StaticJsonDocument<2048> doc;
  if (WiFi.status() == WL_CONNECTED && !g_terminalReportPending &&
      !g_pendingMark && checkUpdate(doc)) {
    Serial.printf("[OTA] Update available: %s\n", (const char*)doc["version"]);
    installFirmware(doc);
  }
}

void loop() {
  // After 60s healthy → mark valid (cancel auto-rollback)
  if (g_pendingMark && (millis() - g_bootTimeMs > POST_BOOT_HEALTHY_MS)) {
    esp_ota_mark_app_valid_cancel_rollback();
    // Keep the report pending even if the phase write fails. The assignment
    // identity was persisted before reboot, so the network acknowledgement
    // remains the only operation allowed to clear it.
    persistTerminalPhase("validated");
    g_terminalReportSuccess = true;
    g_terminalReportPending = true;
    flushTerminalReport();
    g_pendingMark = false;
    Serial.println("[OTA] Marked valid, rollback cancelled");
  }
  flushTerminalReport();

  // Your normal app loop here
  delay(1000);
}

/*
 * BOOT FAILURE FLOW (handled by ESP-IDF rollback):
 *   - If app crashes / reboots before mark_valid → next boot ESP-IDF
 *     auto-switches to previous OTA partition.
 *   - On boot, if running partition == "old", call reportBoot(false, ...)
 *     so the V8 server marks the exact pending assignment as failed.
 */
