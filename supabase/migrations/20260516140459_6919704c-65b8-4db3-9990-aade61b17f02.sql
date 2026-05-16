INSERT INTO public.firmware_registry (
  version, version_code, release_channel,
  min_hardware, max_hardware, compatibility_matrix,
  changelog, changelog_bn, file_url, is_active
) VALUES
(
  '8.0.0', 800, 'stable',
  '{"board_types": ["ESP32-WROOM-32-38pin"], "min_relay_count": 8, "required_features": []}'::jsonb,
  '{}'::jsonb, '[]'::jsonb,
  'Legacy industrial firmware (DHT22 + MQ-135 + LDR).',
  'পুরাতন industrial firmware (DHT22 + MQ-135 + LDR)।',
  '/esp32-industrial.ino', true
),
(
  '10.0.0-beta.1', 1000, 'beta',
  '{"board_types": ["ESP32-WROOM-32-38pin"], "min_relay_count": 8, "required_features": ["i2c_bus2", "uart1", "uart2"]}'::jsonb,
  '{}'::jsonb, '[]'::jsonb,
  'v10 Beta: locked relay map (Heater=GPIO21), Phase 9 sensor auto-detect (SHT31/BH1750/ZE03/SCD41/PMS5003) with DHT22/MQ-135/LDR fallback, 8 hardcoded safety invariants, 20-min manual override, GSM SMS failover (GPIO 27/14), Emergency Survival Mode.',
  'v10 Beta: locked relay map (হিটার=GPIO 21), Phase 9 সেন্সর auto-detect (SHT31/BH1750/ZE03/SCD41/PMS5003) সাথে DHT22/MQ-135/LDR fallback, ৮টি hardcoded safety invariants, ২০-মিনিট manual override, GSM SMS failover (GPIO 27/14), Emergency Survival Mode।',
  '/esp32-industrial-v10.ino', true
)
ON CONFLICT DO NOTHING;