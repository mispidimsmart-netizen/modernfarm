-- V8-only safety/OTA hardening. This migration is additive and intentionally
-- follows 20260912181000; previously applied migrations remain untouched.
BEGIN;

ALTER TABLE public.ota_firmware
  ADD COLUMN IF NOT EXISTS sha256_hex text,
  ADD COLUMN IF NOT EXISTS signature_b64 text,
  ADD COLUMN IF NOT EXISTS signing_public_key_b64 text,
  ADD COLUMN IF NOT EXISTS signature_alg text,
  ADD COLUMN IF NOT EXISTS require_signature boolean NOT NULL DEFAULT false;

-- Existing records remain readable for rollback/forensics. Every newly
-- inserted V8 record must carry a digest, Ed25519 signature and public key.
ALTER TABLE public.ota_firmware
  DROP CONSTRAINT IF EXISTS ota_firmware_v8_signed_metadata_check;
ALTER TABLE public.ota_firmware
  ADD CONSTRAINT ota_firmware_v8_signed_metadata_check
  CHECK (
    (version IS NOT NULL AND version !~* '^v?8\.') OR (
      require_signature = true
      AND sha256_hex IS NOT NULL
      AND sha256_hex ~ '^[0-9a-f]{64}$'
      AND signature_alg IS NOT NULL
      AND signature_alg = 'ed25519'
      AND signature_b64 IS NOT NULL
      AND signature_b64 ~ '^[A-Za-z0-9+/]+={0,2}$'
      AND signing_public_key_b64 IS NOT NULL
      AND signing_public_key_b64 ~ '^[A-Za-z0-9+/]+={0,2}$'
      AND length(signature_b64) % 4 = 0
      AND length(signing_public_key_b64) % 4 = 0
      AND length(decode(signature_b64, 'base64')) = 64
      AND length(decode(signing_public_key_b64, 'base64')) = 32
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_v8_actuator_config()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v jsonb := to_jsonb(NEW);
  heater_on numeric := NULLIF(v->>'heater_on_temp', '')::numeric;
  heater_off numeric := NULLIF(v->>'heater_off_temp', '')::numeric;
  heater_tol numeric := NULLIF(v->>'heater_tolerance', '')::numeric;
  fog_start numeric := NULLIF(v->>'fogger_start_temp', '')::numeric;
  fog_stop numeric := NULLIF(v->>'fogger_stop_temp', '')::numeric;
  fog_on numeric := NULLIF(v->>'fogger_on_seconds', '')::numeric;
  fog_pause numeric := NULLIF(v->>'fogger_pause_seconds', '')::numeric;
  vent_cycle numeric := NULLIF(v->>'min_vent_cycle_seconds', '')::numeric;
  vent_interval numeric := NULLIF(v->>'min_vent_interval_minutes', '')::numeric;
  vent_temp numeric := NULLIF(v->>'min_vent_temp_threshold', '')::numeric;
  airflow_early numeric := NULLIF(v->>'airflow_early_age_days', '')::numeric;
  airflow_mid numeric := NULLIF(v->>'airflow_mid_age_days', '')::numeric;
  airflow_mid_on numeric := NULLIF(v->>'airflow_mid_on_seconds', '')::numeric;
  airflow_mid_interval numeric := NULLIF(v->>'airflow_mid_interval_minutes', '')::numeric;
  airflow_night_on numeric := NULLIF(v->>'airflow_night_on_seconds', '')::numeric;
  airflow_night_interval numeric := NULLIF(v->>'airflow_night_interval_minutes', '')::numeric;
  humidity_min numeric := NULLIF(v->>'humidity_min', '')::numeric;
  humidity_max numeric := NULLIF(v->>'humidity_max', '')::numeric;
  temperature_min numeric := NULLIF(v->>'temperature_min', '')::numeric;
  temperature_max numeric := NULLIF(v->>'temperature_max', '')::numeric;
  fan_low_min numeric := NULLIF(v->>'fan_low_temp_min', '')::numeric;
  fan_low_max numeric := NULLIF(v->>'fan_low_temp_max', '')::numeric;
  fan_medium_min numeric := NULLIF(v->>'fan_medium_temp_min', '')::numeric;
  fan_medium_max numeric := NULLIF(v->>'fan_medium_temp_max', '')::numeric;
  fan_high_min numeric := NULLIF(v->>'fan_high_temp_min', '')::numeric;
  ammonia_max numeric := NULLIF(v->>'ammonia_max', '')::numeric;
  hsi_mild numeric := NULLIF(v->>'hsi_mild_threshold', '')::numeric;
  hsi_moderate numeric := NULLIF(v->>'hsi_moderate_threshold', '')::numeric;
  hsi_severe numeric := NULLIF(v->>'hsi_severe_threshold', '')::numeric;
  hsi_emergency numeric := NULLIF(v->>'hsi_emergency_threshold', '')::numeric;
BEGIN
  IF TG_TABLE_NAME = 'advanced_automation_settings' THEN
    IF heater_on IS NOT NULL AND (heater_on < 0 OR heater_on > 35) THEN
      RAISE EXCEPTION 'unsafe heater_on_temp' USING ERRCODE = '22023';
    END IF;
    IF heater_off IS NOT NULL AND (heater_off < 0 OR heater_off > 40) THEN
      RAISE EXCEPTION 'unsafe heater_off_temp' USING ERRCODE = '22023';
    END IF;
    IF heater_on IS NOT NULL AND heater_off IS NOT NULL AND heater_off < heater_on + 0.5 THEN
      RAISE EXCEPTION 'heater off temperature must exceed on temperature' USING ERRCODE = '22023';
    END IF;
    IF heater_tol IS NOT NULL AND (heater_tol < 0.1 OR heater_tol > 5) THEN
      RAISE EXCEPTION 'unsafe heater tolerance' USING ERRCODE = '22023';
    END IF;
    IF fog_start IS NOT NULL AND (fog_start < 0 OR fog_start > 60) THEN
      RAISE EXCEPTION 'unsafe fogger start temperature' USING ERRCODE = '22023';
    END IF;
    IF fog_stop IS NOT NULL AND (fog_stop < 0 OR fog_stop > 60) THEN
      RAISE EXCEPTION 'unsafe fogger stop temperature' USING ERRCODE = '22023';
    END IF;
    IF fog_start IS NOT NULL AND fog_stop IS NOT NULL AND fog_start < fog_stop + 0.5 THEN
      RAISE EXCEPTION 'fogger start temperature must exceed stop temperature' USING ERRCODE = '22023';
    END IF;
    IF fog_on IS NOT NULL AND (fog_on < 1 OR fog_on > 900) THEN
      RAISE EXCEPTION 'unsafe fogger on timer' USING ERRCODE = '22023';
    END IF;
    IF fog_pause IS NOT NULL AND (fog_pause < 1 OR fog_pause > 3600) THEN
      RAISE EXCEPTION 'unsafe fogger pause timer' USING ERRCODE = '22023';
    END IF;
    IF vent_cycle IS NOT NULL AND (vent_cycle < 1 OR vent_cycle > 900) THEN
      RAISE EXCEPTION 'unsafe minimum ventilation cycle' USING ERRCODE = '22023';
    END IF;
    IF vent_interval IS NOT NULL AND (vent_interval < 1 OR vent_interval > 1440) THEN
      RAISE EXCEPTION 'unsafe minimum ventilation interval' USING ERRCODE = '22023';
    END IF;
    IF vent_temp IS NOT NULL AND (vent_temp < 0 OR vent_temp > 60) THEN
      RAISE EXCEPTION 'unsafe minimum ventilation temperature' USING ERRCODE = '22023';
    END IF;
    IF airflow_early IS NOT NULL AND (airflow_early < 0 OR airflow_early > 999) THEN
      RAISE EXCEPTION 'unsafe airflow early age' USING ERRCODE = '22023';
    END IF;
    IF airflow_mid IS NOT NULL AND (airflow_mid < 0 OR airflow_mid > 999) THEN
      RAISE EXCEPTION 'unsafe airflow mid age' USING ERRCODE = '22023';
    END IF;
    IF airflow_early IS NOT NULL AND airflow_mid IS NOT NULL AND airflow_mid < airflow_early + 1 THEN
      RAISE EXCEPTION 'airflow mid age must exceed early age' USING ERRCODE = '22023';
    END IF;
    IF airflow_mid_on IS NOT NULL AND (airflow_mid_on < 1 OR airflow_mid_on > 900) THEN
      RAISE EXCEPTION 'unsafe airflow mid timer' USING ERRCODE = '22023';
    END IF;
    IF airflow_mid_interval IS NOT NULL AND (airflow_mid_interval < 1 OR airflow_mid_interval > 1440) THEN
      RAISE EXCEPTION 'unsafe airflow mid interval' USING ERRCODE = '22023';
    END IF;
    IF airflow_night_on IS NOT NULL AND (airflow_night_on < 1 OR airflow_night_on > 900) THEN
      RAISE EXCEPTION 'unsafe airflow night timer' USING ERRCODE = '22023';
    END IF;
    IF airflow_night_interval IS NOT NULL AND (airflow_night_interval < 1 OR airflow_night_interval > 1440) THEN
      RAISE EXCEPTION 'unsafe airflow night interval' USING ERRCODE = '22023';
    END IF;
  ELSIF TG_TABLE_NAME = 'farm_settings' THEN
    IF temperature_min IS NOT NULL AND (temperature_min < 0 OR temperature_min > 60) THEN
      RAISE EXCEPTION 'unsafe temperature_min' USING ERRCODE = '22023';
    END IF;
    IF temperature_max IS NOT NULL AND (temperature_max < 0 OR temperature_max > 60) THEN
      RAISE EXCEPTION 'unsafe temperature_max' USING ERRCODE = '22023';
    END IF;
    IF temperature_min IS NOT NULL AND temperature_max IS NOT NULL AND temperature_max < temperature_min + 0.5 THEN
      RAISE EXCEPTION 'temperature_max must exceed temperature_min' USING ERRCODE = '22023';
    END IF;
    IF fan_low_min IS NOT NULL AND (fan_low_min < 0 OR fan_low_min > 60) THEN
      RAISE EXCEPTION 'unsafe fan low minimum temperature' USING ERRCODE = '22023';
    END IF;
    IF fan_low_max IS NOT NULL AND (fan_low_max < 0 OR fan_low_max > 60) THEN
      RAISE EXCEPTION 'unsafe fan low maximum temperature' USING ERRCODE = '22023';
    END IF;
    IF fan_medium_min IS NOT NULL AND (fan_medium_min < 0 OR fan_medium_min > 60) THEN
      RAISE EXCEPTION 'unsafe fan medium minimum temperature' USING ERRCODE = '22023';
    END IF;
    IF fan_medium_max IS NOT NULL AND (fan_medium_max < 0 OR fan_medium_max > 60) THEN
      RAISE EXCEPTION 'unsafe fan medium maximum temperature' USING ERRCODE = '22023';
    END IF;
    IF fan_high_min IS NOT NULL AND (fan_high_min < 0 OR fan_high_min > 60) THEN
      RAISE EXCEPTION 'unsafe fan high minimum temperature' USING ERRCODE = '22023';
    END IF;
    IF fan_low_min IS NOT NULL AND fan_low_max IS NOT NULL AND fan_low_max < fan_low_min + 0.1 THEN
      RAISE EXCEPTION 'fan low maximum must exceed minimum' USING ERRCODE = '22023';
    END IF;
    IF fan_medium_min IS NOT NULL AND fan_medium_max IS NOT NULL AND fan_medium_max < fan_medium_min + 0.1 THEN
      RAISE EXCEPTION 'fan medium maximum must exceed minimum' USING ERRCODE = '22023';
    END IF;
    IF humidity_min IS NOT NULL AND (humidity_min < 10 OR humidity_min > 100) THEN
      RAISE EXCEPTION 'unsafe humidity_min' USING ERRCODE = '22023';
    END IF;
    IF humidity_max IS NOT NULL AND (humidity_max < 10 OR humidity_max > 100) THEN
      RAISE EXCEPTION 'unsafe humidity_max' USING ERRCODE = '22023';
    END IF;
    IF humidity_min IS NOT NULL AND humidity_max IS NOT NULL AND humidity_max < humidity_min + 1 THEN
      RAISE EXCEPTION 'humidity_max must exceed humidity_min' USING ERRCODE = '22023';
    END IF;
    IF ammonia_max IS NOT NULL AND (ammonia_max < 0 OR ammonia_max > 200) THEN
      RAISE EXCEPTION 'unsafe ammonia_max' USING ERRCODE = '22023';
    END IF;
    IF hsi_mild IS NOT NULL AND (hsi_mild < 50 OR hsi_mild > 100) THEN
      RAISE EXCEPTION 'unsafe hsi_mild_threshold' USING ERRCODE = '22023';
    END IF;
    IF hsi_moderate IS NOT NULL AND (hsi_moderate < 50 OR hsi_moderate > 100) THEN
      RAISE EXCEPTION 'unsafe hsi_moderate_threshold' USING ERRCODE = '22023';
    END IF;
    IF hsi_severe IS NOT NULL AND (hsi_severe < 50 OR hsi_severe > 120) THEN
      RAISE EXCEPTION 'unsafe hsi_severe_threshold' USING ERRCODE = '22023';
    END IF;
    IF hsi_emergency IS NOT NULL AND (hsi_emergency < 50 OR hsi_emergency > 120) THEN
      RAISE EXCEPTION 'unsafe hsi_emergency_threshold' USING ERRCODE = '22023';
    END IF;
    IF hsi_mild IS NOT NULL AND hsi_moderate IS NOT NULL AND hsi_moderate < hsi_mild + 0.1 THEN
      RAISE EXCEPTION 'hsi moderate threshold must exceed mild' USING ERRCODE = '22023';
    END IF;
    IF hsi_moderate IS NOT NULL AND hsi_severe IS NOT NULL AND hsi_severe < hsi_moderate + 0.1 THEN
      RAISE EXCEPTION 'hsi severe threshold must exceed moderate' USING ERRCODE = '22023';
    END IF;
    IF hsi_severe IS NOT NULL AND hsi_emergency IS NOT NULL AND hsi_emergency < hsi_severe + 0.1 THEN
      RAISE EXCEPTION 'hsi emergency threshold must exceed severe' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_v8_actuator_config_trigger
  ON public.advanced_automation_settings;
CREATE TRIGGER validate_v8_actuator_config_trigger
  BEFORE INSERT OR UPDATE ON public.advanced_automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_v8_actuator_config();

DROP TRIGGER IF EXISTS validate_v8_farm_thresholds_trigger
  ON public.farm_settings;
CREATE TRIGGER validate_v8_farm_thresholds_trigger
  BEFORE INSERT OR UPDATE ON public.farm_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_v8_actuator_config();

COMMIT;