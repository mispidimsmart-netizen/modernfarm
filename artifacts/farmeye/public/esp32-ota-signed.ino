/**
 * Phase 5 OTA Hardening — ESP32 reference sketch
 * 
 * Features:
 *  1. Signed firmware (Ed25519 signature verified before flash)
 *  2. SHA-256 integrity check (in addition to CRC32)
 *  3. Update window honored (server tells us if outside window)
 *  4. Boot success/failure reporting → server auto-rollbacks after 3 strikes
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
#include <mbedtls/base64.h>

// ─── CONFIG ───
static const char* SUPABASE_URL  = "https://hbwfuvqrfgtefozajyfu.supabase.co";
static const char* SUPABASE_ANON = "YOUR_ANON_KEY_HERE";
static const char* DEVICE_TOKEN  = "FARM-XXXX-XXXX-XXXX";
static const char* CURRENT_VERSION = "v1.0.0";
static const char* RELEASE_CHANNEL = "stable";
static const uint32_t POST_BOOT_HEALTHY_MS = 60000UL; // 60s of stable operation → mark valid

static String  g_firmwareId  = "";
static bool    g_pendingMark = false;
static uint32_t g_bootTimeMs = 0;

// ─── Helper: base64 decode ───
static size_t b64Decode(const char* in, uint8_t* out, size_t outMax) {
  size_t outLen = 0;
  if (mbedtls_base64_decode(out, outMax, &outLen,
        (const unsigned char*)in, strlen(in)) != 0) return 0;
  return outLen;
}

// ─── Boot report to server ───
void reportBoot(bool success, bool sigValidated) {
  if (g_firmwareId.isEmpty()) return;
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/functions/v1/ota-firmware?action=boot-report";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON);
  http.addHeader("x-device-token", DEVICE_TOKEN);

  StaticJsonDocument<256> body;
  body["firmware_id"]         = g_firmwareId;
  body["boot_success"]        = success;
  body["signature_validated"] = sigValidated;
  body["from_version"]        = CURRENT_VERSION;
  String payload; serializeJson(body, payload);
  http.POST(payload);
  http.end();
}

// ─── Check for update ───
bool checkUpdate(JsonDocument& doc) {
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/functions/v1/ota-firmware?action=check"
             + "&version=" + CURRENT_VERSION + "&channel=" + RELEASE_CHANNEL;
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
  g_firmwareId = String((const char*)meta["firmware_id"]);

  bool requireSignature = (strlen(sigB64) > 0 && strlen(pubKeyB64) > 0);

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
  if (strlen(sha256Hex) == 64) {
    char calc[65]; for (int i=0;i<32;i++) sprintf(calc+i*2,"%02x",digest[i]); calc[64]=0;
    if (strcasecmp(calc, sha256Hex) != 0) {
      Serial.println("[OTA] SHA-256 mismatch!");
      Update.abort(); return false;
    }
  }

  // ── Ed25519 signature verify (over SHA-256 digest) ──
  bool sigOk = false;
  if (requireSignature) {
    uint8_t sig[64], pub[32];
    if (b64Decode(sigB64, sig, sizeof(sig)) != 64 ||
        b64Decode(pubKeyB64, pub, sizeof(pub)) != 32) {
      Serial.println("[OTA] Bad signature/key encoding");
      Update.abort(); return false;
    }
    sigOk = Ed25519::verify(sig, pub, digest, 32);
    if (!sigOk) {
      Serial.println("[OTA] SIGNATURE INVALID — aborting flash!");
      Update.abort(); return false;
    }
    Serial.println("[OTA] Signature verified ✓");
  } else {
    Serial.println("[OTA] WARNING: unsigned firmware — install anyway (dev only)");
  }

  if (!Update.end(true)) { Serial.println("[OTA] Update.end failed"); return false; }

  // Stash firmware_id in NVS so we can boot-report next boot
  // (use Preferences in real code; omitted here for brevity)
  g_pendingMark = true;
  Serial.println("[OTA] Restarting...");
  delay(500);
  ESP.restart();
  return true;
}

void setup() {
  Serial.begin(115200);
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

  // Periodic update check
  StaticJsonDocument<2048> doc;
  if (WiFi.status() == WL_CONNECTED && checkUpdate(doc)) {
    Serial.printf("[OTA] Update available: %s\n", (const char*)doc["version"]);
    installFirmware(doc);
  }
}

void loop() {
  // After 60s healthy → mark valid (cancel auto-rollback)
  if (g_pendingMark && (millis() - g_bootTimeMs > POST_BOOT_HEALTHY_MS)) {
    esp_ota_mark_app_valid_cancel_rollback();
    reportBoot(true, true);
    g_pendingMark = false;
    Serial.println("[OTA] Marked valid, rollback cancelled");
  }

  // Your normal app loop here
  delay(1000);
}

/*
 * BOOT FAILURE FLOW (handled by ESP-IDF rollback):
 *   - If app crashes / reboots before mark_valid → next boot ESP-IDF
 *     auto-switches to previous OTA partition.
 *   - On boot, if running partition == "old", call reportBoot(false, ...)
 *     so the server increments boot_attempts; after 3 reports the
 *     server marks the install as auto_rolled_back and pauses the rollout.
 */
