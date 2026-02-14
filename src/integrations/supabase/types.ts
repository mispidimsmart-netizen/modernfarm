export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      advanced_automation_settings: {
        Row: {
          airflow_early_age_days: number | null
          airflow_enabled: boolean | null
          airflow_mid_age_days: number | null
          airflow_mid_interval_minutes: number | null
          airflow_mid_on_seconds: number | null
          airflow_night_interval_minutes: number | null
          airflow_night_on_seconds: number | null
          automation_priority: string | null
          created_at: string
          curtain_advisory_enabled: boolean | null
          curtain_close_on_cold: boolean | null
          curtain_open_temp_diff: number | null
          fogger_enabled: boolean | null
          fogger_on_seconds: number | null
          fogger_pause_seconds: number | null
          fogger_start_humidity_max: number | null
          fogger_start_temp: number | null
          fogger_stop_humidity: number | null
          fogger_stop_temp: number | null
          heater_enabled: boolean | null
          heater_off_temp: number | null
          heater_on_temp: number | null
          heater_tolerance: number | null
          id: string
          lighting_fade_duration_minutes: number | null
          min_vent_ceiling_fan_always_on: boolean | null
          min_vent_cycle_seconds: number | null
          min_vent_enabled: boolean | null
          min_vent_interval_minutes: number | null
          min_vent_temp_threshold: number | null
          shed_id: string | null
          updated_at: string
          user_id: string
          water_baseline_hours: number | null
          water_drop_threshold_percent: number | null
          water_night_spike_enabled: boolean | null
          water_zero_flow_alert: boolean | null
        }
        Insert: {
          airflow_early_age_days?: number | null
          airflow_enabled?: boolean | null
          airflow_mid_age_days?: number | null
          airflow_mid_interval_minutes?: number | null
          airflow_mid_on_seconds?: number | null
          airflow_night_interval_minutes?: number | null
          airflow_night_on_seconds?: number | null
          automation_priority?: string | null
          created_at?: string
          curtain_advisory_enabled?: boolean | null
          curtain_close_on_cold?: boolean | null
          curtain_open_temp_diff?: number | null
          fogger_enabled?: boolean | null
          fogger_on_seconds?: number | null
          fogger_pause_seconds?: number | null
          fogger_start_humidity_max?: number | null
          fogger_start_temp?: number | null
          fogger_stop_humidity?: number | null
          fogger_stop_temp?: number | null
          heater_enabled?: boolean | null
          heater_off_temp?: number | null
          heater_on_temp?: number | null
          heater_tolerance?: number | null
          id?: string
          lighting_fade_duration_minutes?: number | null
          min_vent_ceiling_fan_always_on?: boolean | null
          min_vent_cycle_seconds?: number | null
          min_vent_enabled?: boolean | null
          min_vent_interval_minutes?: number | null
          min_vent_temp_threshold?: number | null
          shed_id?: string | null
          updated_at?: string
          user_id: string
          water_baseline_hours?: number | null
          water_drop_threshold_percent?: number | null
          water_night_spike_enabled?: boolean | null
          water_zero_flow_alert?: boolean | null
        }
        Update: {
          airflow_early_age_days?: number | null
          airflow_enabled?: boolean | null
          airflow_mid_age_days?: number | null
          airflow_mid_interval_minutes?: number | null
          airflow_mid_on_seconds?: number | null
          airflow_night_interval_minutes?: number | null
          airflow_night_on_seconds?: number | null
          automation_priority?: string | null
          created_at?: string
          curtain_advisory_enabled?: boolean | null
          curtain_close_on_cold?: boolean | null
          curtain_open_temp_diff?: number | null
          fogger_enabled?: boolean | null
          fogger_on_seconds?: number | null
          fogger_pause_seconds?: number | null
          fogger_start_humidity_max?: number | null
          fogger_start_temp?: number | null
          fogger_stop_humidity?: number | null
          fogger_stop_temp?: number | null
          heater_enabled?: boolean | null
          heater_off_temp?: number | null
          heater_on_temp?: number | null
          heater_tolerance?: number | null
          id?: string
          lighting_fade_duration_minutes?: number | null
          min_vent_ceiling_fan_always_on?: boolean | null
          min_vent_cycle_seconds?: number | null
          min_vent_enabled?: boolean | null
          min_vent_interval_minutes?: number | null
          min_vent_temp_threshold?: number | null
          shed_id?: string | null
          updated_at?: string
          user_id?: string
          water_baseline_hours?: number | null
          water_drop_threshold_percent?: number | null
          water_night_spike_enabled?: boolean | null
          water_zero_flow_alert?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "advanced_automation_settings_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged: boolean
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          id: string
          message: string
          message_bn: string
          severity: Database["public"]["Enums"]["alert_severity"]
          shed_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          message: string
          message_bn: string
          severity: Database["public"]["Enums"]["alert_severity"]
          shed_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          message?: string
          message_bn?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          shed_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_device: Database["public"]["Enums"]["device_type"]
          action_state: boolean
          condition_operator: Database["public"]["Enums"]["operator_type"]
          condition_sensor: Database["public"]["Enums"]["sensor_type"]
          condition_value: number
          created_at: string
          enabled: boolean
          id: string
          name: string
          user_id: string
        }
        Insert: {
          action_device: Database["public"]["Enums"]["device_type"]
          action_state: boolean
          condition_operator: Database["public"]["Enums"]["operator_type"]
          condition_sensor: Database["public"]["Enums"]["sensor_type"]
          condition_value: number
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          user_id: string
        }
        Update: {
          action_device?: Database["public"]["Enums"]["device_type"]
          action_state?: boolean
          condition_operator?: Database["public"]["Enums"]["operator_type"]
          condition_sensor?: Database["public"]["Enums"]["sensor_type"]
          condition_value?: number
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_rules_new: {
        Row: {
          action: string
          condition: string
          created_at: string
          enabled: boolean
          id: string
          parameter: string
          user_id: string
          value: number
        }
        Insert: {
          action: string
          condition: string
          created_at?: string
          enabled?: boolean
          id?: string
          parameter: string
          user_id: string
          value: number
        }
        Update: {
          action?: string
          condition?: string
          created_at?: string
          enabled?: boolean
          id?: string
          parameter?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      broiler_batches: {
        Row: {
          actual_end_date: string | null
          batch_name: string
          batch_name_bn: string | null
          breed: string | null
          chick_cost_per_bird: number | null
          created_at: string
          current_bird_count: number
          expected_end_date: string | null
          id: string
          initial_bird_count: number
          notes: string | null
          shed_id: string | null
          start_date: string
          status: string
          target_weight_grams: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_end_date?: string | null
          batch_name?: string
          batch_name_bn?: string | null
          breed?: string | null
          chick_cost_per_bird?: number | null
          created_at?: string
          current_bird_count?: number
          expected_end_date?: string | null
          id?: string
          initial_bird_count?: number
          notes?: string | null
          shed_id?: string | null
          start_date?: string
          status?: string
          target_weight_grams?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_end_date?: string | null
          batch_name?: string
          batch_name_bn?: string | null
          breed?: string | null
          chick_cost_per_bird?: number | null
          created_at?: string
          current_bird_count?: number
          expected_end_date?: string | null
          id?: string
          initial_bird_count?: number
          notes?: string | null
          shed_id?: string | null
          start_date?: string
          status?: string
          target_weight_grams?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broiler_batches_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      broiler_feed: {
        Row: {
          batch_id: string
          cost_per_kg: number | null
          created_at: string
          feed_date: string
          feed_type: string | null
          id: string
          notes: string | null
          quantity_kg: number
          user_id: string
        }
        Insert: {
          batch_id: string
          cost_per_kg?: number | null
          created_at?: string
          feed_date?: string
          feed_type?: string | null
          id?: string
          notes?: string | null
          quantity_kg?: number
          user_id: string
        }
        Update: {
          batch_id?: string
          cost_per_kg?: number | null
          created_at?: string
          feed_date?: string
          feed_type?: string | null
          id?: string
          notes?: string | null
          quantity_kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broiler_feed_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "broiler_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      broiler_mortality: {
        Row: {
          batch_id: string
          cause: string | null
          count: number
          created_at: string
          id: string
          notes: string | null
          record_date: string
          user_id: string
        }
        Insert: {
          batch_id: string
          cause?: string | null
          count?: number
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          user_id: string
        }
        Update: {
          batch_id?: string
          cause?: string | null
          count?: number
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broiler_mortality_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "broiler_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      broiler_sales: {
        Row: {
          batch_id: string
          bird_count: number
          buyer_name: string | null
          created_at: string
          id: string
          notes: string | null
          price_per_kg: number
          sale_date: string
          total_amount: number
          total_weight_kg: number
          user_id: string
        }
        Insert: {
          batch_id: string
          bird_count: number
          buyer_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_per_kg: number
          sale_date?: string
          total_amount: number
          total_weight_kg: number
          user_id: string
        }
        Update: {
          batch_id?: string
          bird_count?: number
          buyer_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          price_per_kg?: number
          sale_date?: string
          total_amount?: number
          total_weight_kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broiler_sales_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "broiler_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      broiler_weights: {
        Row: {
          average_weight_grams: number
          batch_id: string
          created_at: string
          id: string
          max_weight_grams: number | null
          min_weight_grams: number | null
          notes: string | null
          record_date: string
          sample_count: number | null
          uniformity_percent: number | null
          user_id: string
        }
        Insert: {
          average_weight_grams: number
          batch_id: string
          created_at?: string
          id?: string
          max_weight_grams?: number | null
          min_weight_grams?: number | null
          notes?: string | null
          record_date?: string
          sample_count?: number | null
          uniformity_percent?: number | null
          user_id: string
        }
        Update: {
          average_weight_grams?: number
          batch_id?: string
          created_at?: string
          id?: string
          max_weight_grams?: number | null
          min_weight_grams?: number | null
          notes?: string | null
          record_date?: string
          sample_count?: number | null
          uniformity_percent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broiler_weights_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "broiler_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          avg_humidity: number | null
          avg_temperature: number | null
          created_at: string
          egg_production: number | null
          id: string
          report_date: string
          total_water_usage: number | null
          user_id: string
        }
        Insert: {
          avg_humidity?: number | null
          avg_temperature?: number | null
          created_at?: string
          egg_production?: number | null
          id?: string
          report_date?: string
          total_water_usage?: number | null
          user_id: string
        }
        Update: {
          avg_humidity?: number | null
          avg_temperature?: number | null
          created_at?: string
          egg_production?: number | null
          id?: string
          report_date?: string
          total_water_usage?: number | null
          user_id?: string
        }
        Relationships: []
      }
      daily_summary: {
        Row: {
          alerts_count: number | null
          avg_ammonia: number | null
          avg_humidity: number | null
          avg_temperature: number | null
          created_at: string
          health_score: number
          id: string
          mortality_count: number | null
          notes: string | null
          power_outage_minutes: number | null
          summary_date: string
          total_eggs: number | null
          total_water_usage: number | null
          user_id: string
        }
        Insert: {
          alerts_count?: number | null
          avg_ammonia?: number | null
          avg_humidity?: number | null
          avg_temperature?: number | null
          created_at?: string
          health_score?: number
          id?: string
          mortality_count?: number | null
          notes?: string | null
          power_outage_minutes?: number | null
          summary_date?: string
          total_eggs?: number | null
          total_water_usage?: number | null
          user_id: string
        }
        Update: {
          alerts_count?: number | null
          avg_ammonia?: number | null
          avg_humidity?: number | null
          avg_temperature?: number | null
          created_at?: string
          health_score?: number
          id?: string
          mortality_count?: number | null
          notes?: string | null
          power_outage_minutes?: number | null
          summary_date?: string
          total_eggs?: number | null
          total_water_usage?: number | null
          user_id?: string
        }
        Relationships: []
      }
      device_calibration: {
        Row: {
          air_volume_cubic_meters: number | null
          calibration_score: number | null
          clean_air_nh3_ppm: number | null
          created_at: string
          device_token_id: string | null
          fan_direction_test_passed: boolean | null
          fan_direction_tested_at: string | null
          farm_height_meters: number | null
          farm_length_meters: number | null
          farm_width_meters: number | null
          heater_temp_rise: number | null
          heater_test_passed: boolean | null
          heater_tested_at: string | null
          id: string
          nh3_baseline_calibrated_at: string | null
          overall_status: string | null
          shed_id: string | null
          temp_drop_rate: number | null
          temp_sensor_placement_status: string | null
          temp_sensor_test_passed: boolean | null
          temp_sensor_tested_at: string | null
          updated_at: string
          user_id: string
          ventilation_baseline: number | null
          water_flow_test_passed: boolean | null
          water_flow_tested_at: string | null
          water_normal_pulse_pattern: number | null
          wizard_completed: boolean | null
          wizard_completed_at: string | null
        }
        Insert: {
          air_volume_cubic_meters?: number | null
          calibration_score?: number | null
          clean_air_nh3_ppm?: number | null
          created_at?: string
          device_token_id?: string | null
          fan_direction_test_passed?: boolean | null
          fan_direction_tested_at?: string | null
          farm_height_meters?: number | null
          farm_length_meters?: number | null
          farm_width_meters?: number | null
          heater_temp_rise?: number | null
          heater_test_passed?: boolean | null
          heater_tested_at?: string | null
          id?: string
          nh3_baseline_calibrated_at?: string | null
          overall_status?: string | null
          shed_id?: string | null
          temp_drop_rate?: number | null
          temp_sensor_placement_status?: string | null
          temp_sensor_test_passed?: boolean | null
          temp_sensor_tested_at?: string | null
          updated_at?: string
          user_id: string
          ventilation_baseline?: number | null
          water_flow_test_passed?: boolean | null
          water_flow_tested_at?: string | null
          water_normal_pulse_pattern?: number | null
          wizard_completed?: boolean | null
          wizard_completed_at?: string | null
        }
        Update: {
          air_volume_cubic_meters?: number | null
          calibration_score?: number | null
          clean_air_nh3_ppm?: number | null
          created_at?: string
          device_token_id?: string | null
          fan_direction_test_passed?: boolean | null
          fan_direction_tested_at?: string | null
          farm_height_meters?: number | null
          farm_length_meters?: number | null
          farm_width_meters?: number | null
          heater_temp_rise?: number | null
          heater_test_passed?: boolean | null
          heater_tested_at?: string | null
          id?: string
          nh3_baseline_calibrated_at?: string | null
          overall_status?: string | null
          shed_id?: string | null
          temp_drop_rate?: number | null
          temp_sensor_placement_status?: string | null
          temp_sensor_test_passed?: boolean | null
          temp_sensor_tested_at?: string | null
          updated_at?: string
          user_id?: string
          ventilation_baseline?: number | null
          water_flow_test_passed?: boolean | null
          water_flow_tested_at?: string | null
          water_normal_pulse_pattern?: number | null
          wizard_completed?: boolean | null
          wizard_completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_calibration_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_calibration_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      device_command_log: {
        Row: {
          acked_at: string | null
          command_id: string
          command_type: string
          command_value: boolean
          created_at: string
          device_name: string
          error_message: string | null
          expired_at: string | null
          id: string
          max_retries: number
          retry_count: number
          sent_at: string | null
          shed_id: string | null
          source: string | null
          status: string
          user_id: string
        }
        Insert: {
          acked_at?: string | null
          command_id: string
          command_type: string
          command_value?: boolean
          created_at?: string
          device_name?: string
          error_message?: string | null
          expired_at?: string | null
          id?: string
          max_retries?: number
          retry_count?: number
          sent_at?: string | null
          shed_id?: string | null
          source?: string | null
          status?: string
          user_id: string
        }
        Update: {
          acked_at?: string | null
          command_id?: string
          command_type?: string
          command_value?: boolean
          created_at?: string
          device_name?: string
          error_message?: string | null
          expired_at?: string | null
          id?: string
          max_retries?: number
          retry_count?: number
          sent_at?: string | null
          shed_id?: string | null
          source?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_command_log_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      device_commands: {
        Row: {
          command_type: string
          command_value: boolean
          created_at: string
          device_name: string
          executed: boolean
          executed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          command_type: string
          command_value?: boolean
          created_at?: string
          device_name?: string
          executed?: boolean
          executed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          command_type?: string
          command_value?: boolean
          created_at?: string
          device_name?: string
          executed?: boolean
          executed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      device_control: {
        Row: {
          alarm: boolean
          device_id: string
          fan: boolean
          id: string
          light: boolean
          mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alarm?: boolean
          device_id?: string
          fan?: boolean
          id?: string
          light?: boolean
          mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alarm?: boolean
          device_id?: string
          fan?: boolean
          id?: string
          light?: boolean
          mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_health: {
        Row: {
          ammonia_avg_10: number | null
          battery_capacity_wh: number | null
          battery_percentage: number | null
          broiler_age_source: string | null
          cached_settings_version: number | null
          circulation_fan_last_cycle_at: string | null
          consecutive_high_ammonia: number | null
          cpu_temperature: number | null
          created_at: string
          curtain_advisory_last_sent: string | null
          device_token_id: string
          error_count: number | null
          failsafe_activated_at: string | null
          failsafe_mode: boolean | null
          farm_id: string | null
          firmware_version: string | null
          fogger_last_cycle_at: string | null
          free_memory_bytes: number | null
          gas_sensor_warmup_done: boolean | null
          gas_sensor_warmup_start: string | null
          hsi: number | null
          id: string
          is_online: boolean | null
          last_age_sync_at: string | null
          last_cloud_sync_at: string | null
          last_error_message: string | null
          last_power_event_at: string | null
          last_power_outage_id: string | null
          last_restart_at: string | null
          last_seen_at: string | null
          last_server_age_sync_at: string | null
          min_vent_last_cycle_at: string | null
          mode: string | null
          offline_buffer_count: number | null
          offline_duration_seconds: number | null
          online_duration_seconds: number | null
          ota_last_check_at: string | null
          ota_progress: number | null
          ota_status: string | null
          ota_version_available: string | null
          power_consumption_w: number | null
          power_event_type: string | null
          power_source: string | null
          power_voltage_rms: number | null
          restart_count: number | null
          restart_reason: string | null
          safe_mode_until: string | null
          shed_id: string | null
          total_restarts: number | null
          updated_at: string
          uptime_seconds: number | null
          user_id: string
          water_24h_rolling_avg: number | null
          water_anomaly_consecutive_count: number | null
          water_hourly_baseline: number | null
          water_last_2h_avg: number | null
          water_night_spike_detected: boolean | null
          water_zero_flow_minutes: number | null
          wifi_signal_strength: number | null
        }
        Insert: {
          ammonia_avg_10?: number | null
          battery_capacity_wh?: number | null
          battery_percentage?: number | null
          broiler_age_source?: string | null
          cached_settings_version?: number | null
          circulation_fan_last_cycle_at?: string | null
          consecutive_high_ammonia?: number | null
          cpu_temperature?: number | null
          created_at?: string
          curtain_advisory_last_sent?: string | null
          device_token_id: string
          error_count?: number | null
          failsafe_activated_at?: string | null
          failsafe_mode?: boolean | null
          farm_id?: string | null
          firmware_version?: string | null
          fogger_last_cycle_at?: string | null
          free_memory_bytes?: number | null
          gas_sensor_warmup_done?: boolean | null
          gas_sensor_warmup_start?: string | null
          hsi?: number | null
          id?: string
          is_online?: boolean | null
          last_age_sync_at?: string | null
          last_cloud_sync_at?: string | null
          last_error_message?: string | null
          last_power_event_at?: string | null
          last_power_outage_id?: string | null
          last_restart_at?: string | null
          last_seen_at?: string | null
          last_server_age_sync_at?: string | null
          min_vent_last_cycle_at?: string | null
          mode?: string | null
          offline_buffer_count?: number | null
          offline_duration_seconds?: number | null
          online_duration_seconds?: number | null
          ota_last_check_at?: string | null
          ota_progress?: number | null
          ota_status?: string | null
          ota_version_available?: string | null
          power_consumption_w?: number | null
          power_event_type?: string | null
          power_source?: string | null
          power_voltage_rms?: number | null
          restart_count?: number | null
          restart_reason?: string | null
          safe_mode_until?: string | null
          shed_id?: string | null
          total_restarts?: number | null
          updated_at?: string
          uptime_seconds?: number | null
          user_id: string
          water_24h_rolling_avg?: number | null
          water_anomaly_consecutive_count?: number | null
          water_hourly_baseline?: number | null
          water_last_2h_avg?: number | null
          water_night_spike_detected?: boolean | null
          water_zero_flow_minutes?: number | null
          wifi_signal_strength?: number | null
        }
        Update: {
          ammonia_avg_10?: number | null
          battery_capacity_wh?: number | null
          battery_percentage?: number | null
          broiler_age_source?: string | null
          cached_settings_version?: number | null
          circulation_fan_last_cycle_at?: string | null
          consecutive_high_ammonia?: number | null
          cpu_temperature?: number | null
          created_at?: string
          curtain_advisory_last_sent?: string | null
          device_token_id?: string
          error_count?: number | null
          failsafe_activated_at?: string | null
          failsafe_mode?: boolean | null
          farm_id?: string | null
          firmware_version?: string | null
          fogger_last_cycle_at?: string | null
          free_memory_bytes?: number | null
          gas_sensor_warmup_done?: boolean | null
          gas_sensor_warmup_start?: string | null
          hsi?: number | null
          id?: string
          is_online?: boolean | null
          last_age_sync_at?: string | null
          last_cloud_sync_at?: string | null
          last_error_message?: string | null
          last_power_event_at?: string | null
          last_power_outage_id?: string | null
          last_restart_at?: string | null
          last_seen_at?: string | null
          last_server_age_sync_at?: string | null
          min_vent_last_cycle_at?: string | null
          mode?: string | null
          offline_buffer_count?: number | null
          offline_duration_seconds?: number | null
          online_duration_seconds?: number | null
          ota_last_check_at?: string | null
          ota_progress?: number | null
          ota_status?: string | null
          ota_version_available?: string | null
          power_consumption_w?: number | null
          power_event_type?: string | null
          power_source?: string | null
          power_voltage_rms?: number | null
          restart_count?: number | null
          restart_reason?: string | null
          safe_mode_until?: string | null
          shed_id?: string | null
          total_restarts?: number | null
          updated_at?: string
          uptime_seconds?: number | null
          user_id?: string
          water_24h_rolling_avg?: number | null
          water_anomaly_consecutive_count?: number | null
          water_hourly_baseline?: number | null
          water_last_2h_avg?: number | null
          water_night_spike_detected?: boolean | null
          water_zero_flow_minutes?: number | null
          wifi_signal_strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "device_health_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_last_power_outage_id_fkey"
            columns: ["last_power_outage_id"]
            isOneToOne: false
            referencedRelation: "power_outages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_health_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      device_status: {
        Row: {
          alarm_on: boolean
          circulation_fan_on: boolean | null
          curtain_position: string | null
          device_id: string | null
          fan_on: boolean
          fan_speed: string
          farm_id: string | null
          fogger_on: boolean | null
          heater_on: boolean | null
          hsi: number | null
          id: string
          last_cloud_sync: string | null
          light_on: boolean
          manual_override: boolean
          mode: string | null
          power_on: boolean
          shed_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alarm_on?: boolean
          circulation_fan_on?: boolean | null
          curtain_position?: string | null
          device_id?: string | null
          fan_on?: boolean
          fan_speed?: string
          farm_id?: string | null
          fogger_on?: boolean | null
          heater_on?: boolean | null
          hsi?: number | null
          id?: string
          last_cloud_sync?: string | null
          light_on?: boolean
          manual_override?: boolean
          mode?: string | null
          power_on?: boolean
          shed_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alarm_on?: boolean
          circulation_fan_on?: boolean | null
          curtain_position?: string | null
          device_id?: string | null
          fan_on?: boolean
          fan_speed?: string
          farm_id?: string | null
          fogger_on?: boolean | null
          heater_on?: boolean | null
          hsi?: number | null
          id?: string
          last_cloud_sync?: string | null
          light_on?: boolean
          manual_override?: boolean
          mode?: string | null
          power_on?: boolean
          shed_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_status_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_status_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          device_name: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          shed_id: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          shed_id?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          shed_id?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_production: {
        Row: {
          broken: number
          created_at: string
          grade_a: number
          grade_b: number
          grade_c: number
          id: string
          notes: string | null
          production_date: string
          shed_id: string | null
          total_eggs: number
          user_id: string
        }
        Insert: {
          broken?: number
          created_at?: string
          grade_a?: number
          grade_b?: number
          grade_c?: number
          id?: string
          notes?: string | null
          production_date?: string
          shed_id?: string | null
          total_eggs?: number
          user_id: string
        }
        Update: {
          broken?: number
          created_at?: string
          grade_a?: number
          grade_b?: number
          grade_c?: number
          id?: string
          notes?: string | null
          production_date?: string
          shed_id?: string | null
          total_eggs?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "egg_production_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      farm_settings: {
        Row: {
          ammonia_max: number
          created_at: string
          fan_high_temp_min: number
          fan_low_temp_max: number
          fan_low_temp_min: number
          fan_medium_temp_max: number
          fan_medium_temp_min: number
          hsi_automation_enabled: boolean
          hsi_emergency_threshold: number
          hsi_mild_threshold: number
          hsi_moderate_threshold: number
          hsi_severe_threshold: number
          humidity_max: number
          humidity_min: number
          id: string
          temperature_max: number
          temperature_min: number
          updated_at: string
          user_id: string
          water_anomaly_threshold: number
        }
        Insert: {
          ammonia_max?: number
          created_at?: string
          fan_high_temp_min?: number
          fan_low_temp_max?: number
          fan_low_temp_min?: number
          fan_medium_temp_max?: number
          fan_medium_temp_min?: number
          hsi_automation_enabled?: boolean
          hsi_emergency_threshold?: number
          hsi_mild_threshold?: number
          hsi_moderate_threshold?: number
          hsi_severe_threshold?: number
          humidity_max?: number
          humidity_min?: number
          id?: string
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          user_id: string
          water_anomaly_threshold?: number
        }
        Update: {
          ammonia_max?: number
          created_at?: string
          fan_high_temp_min?: number
          fan_low_temp_max?: number
          fan_low_temp_min?: number
          fan_medium_temp_max?: number
          fan_medium_temp_min?: number
          hsi_automation_enabled?: boolean
          hsi_emergency_threshold?: number
          hsi_mild_threshold?: number
          hsi_moderate_threshold?: number
          hsi_severe_threshold?: number
          humidity_max?: number
          humidity_min?: number
          id?: string
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          user_id?: string
          water_anomaly_threshold?: number
        }
        Relationships: []
      }
      farms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          name_en: string
          owner_id: string
          total_sheds: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          name_en?: string
          owner_id: string
          total_sheds?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          name_en?: string
          owner_id?: string
          total_sheds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      feed_consumption: {
        Row: {
          consumption_date: string
          created_at: string
          feed_type: string
          id: string
          notes: string | null
          quantity_kg: number
          user_id: string
        }
        Insert: {
          consumption_date?: string
          created_at?: string
          feed_type?: string
          id?: string
          notes?: string | null
          quantity_kg?: number
          user_id: string
        }
        Update: {
          consumption_date?: string
          created_at?: string
          feed_type?: string
          id?: string
          notes?: string | null
          quantity_kg?: number
          user_id?: string
        }
        Relationships: []
      }
      feed_inventory: {
        Row: {
          created_at: string
          feed_type: string
          id: string
          notes: string | null
          purchase_date: string
          quantity_kg: number
          supplier: string | null
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_type?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          quantity_kg?: number
          supplier?: string | null
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feed_type?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          quantity_kg?: number
          supplier?: string | null
          unit_price?: number
          user_id?: string
        }
        Relationships: []
      }
      firmware_install_logs: {
        Row: {
          board_type: string | null
          completed_at: string | null
          crc_validated: boolean | null
          created_at: string
          device_token_id: string
          download_started_at: string | null
          error_message: string | null
          firmware_id: string
          from_version: string | null
          id: string
          install_started_at: string | null
          partition_used: string | null
          rollback_triggered: boolean | null
          rollout_batch_id: string | null
          status: string
          to_version: string
          user_id: string
        }
        Insert: {
          board_type?: string | null
          completed_at?: string | null
          crc_validated?: boolean | null
          created_at?: string
          device_token_id: string
          download_started_at?: string | null
          error_message?: string | null
          firmware_id: string
          from_version?: string | null
          id?: string
          install_started_at?: string | null
          partition_used?: string | null
          rollback_triggered?: boolean | null
          rollout_batch_id?: string | null
          status?: string
          to_version: string
          user_id: string
        }
        Update: {
          board_type?: string | null
          completed_at?: string | null
          crc_validated?: boolean | null
          created_at?: string
          device_token_id?: string
          download_started_at?: string | null
          error_message?: string | null
          firmware_id?: string
          from_version?: string | null
          id?: string
          install_started_at?: string | null
          partition_used?: string | null
          rollback_triggered?: boolean | null
          rollout_batch_id?: string | null
          status?: string
          to_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "firmware_install_logs_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmware_install_logs_firmware_id_fkey"
            columns: ["firmware_id"]
            isOneToOne: false
            referencedRelation: "ota_firmware"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firmware_install_logs_rollout_batch_id_fkey"
            columns: ["rollout_batch_id"]
            isOneToOne: false
            referencedRelation: "firmware_rollout_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      firmware_rollout_batches: {
        Row: {
          abort_reason: string | null
          batch_number: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          fail_count: number
          firmware_id: string
          id: string
          started_at: string | null
          status: string
          success_count: number
          target_percentage: number
          total_devices: number
        }
        Insert: {
          abort_reason?: string | null
          batch_number?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          fail_count?: number
          firmware_id: string
          id?: string
          started_at?: string | null
          status?: string
          success_count?: number
          target_percentage?: number
          total_devices?: number
        }
        Update: {
          abort_reason?: string | null
          batch_number?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          fail_count?: number
          firmware_id?: string
          id?: string
          started_at?: string | null
          status?: string
          success_count?: number
          target_percentage?: number
          total_devices?: number
        }
        Relationships: [
          {
            foreignKeyName: "firmware_rollout_batches_firmware_id_fkey"
            columns: ["firmware_id"]
            isOneToOne: false
            referencedRelation: "ota_firmware"
            referencedColumns: ["id"]
          },
        ]
      }
      flock_info: {
        Row: {
          age_weeks: number
          breed: string | null
          created_at: string
          id: string
          purchase_date: string | null
          shed_id: string | null
          total_birds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          age_weeks?: number
          breed?: string | null
          created_at?: string
          id?: string
          purchase_date?: string | null
          shed_id?: string | null
          total_birds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          age_weeks?: number
          breed?: string | null
          created_at?: string
          id?: string
          purchase_date?: string | null
          shed_id?: string | null
          total_birds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flock_info_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          income_date: string
          quantity: number | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          quantity?: number | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          quantity?: number | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: []
      }
      lighting_schedule: {
        Row: {
          end_time: string
          fade_in_minutes: number
          fade_out_minutes: number
          gradual_enabled: boolean
          id: string
          manual_override: boolean
          max_brightness: number
          min_brightness: number
          start_time: string
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          end_time?: string
          fade_in_minutes?: number
          fade_out_minutes?: number
          gradual_enabled?: boolean
          id?: string
          manual_override?: boolean
          max_brightness?: number
          min_brightness?: number
          start_time?: string
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          end_time?: string
          fade_in_minutes?: number
          fade_out_minutes?: number
          gradual_enabled?: boolean
          id?: string
          manual_override?: boolean
          max_brightness?: number
          min_brightness?: number
          start_time?: string
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mode_profiles: {
        Row: {
          ammonia_max: number
          bg_color: string | null
          color: string | null
          created_at: string
          description: string | null
          description_bn: string | null
          fan_high_temp_min: number
          fan_low_temp_max: number
          fan_low_temp_min: number
          fan_medium_temp_max: number
          fan_medium_temp_min: number
          hsi_emergency_threshold: number
          hsi_mild_threshold: number
          hsi_moderate_threshold: number
          hsi_severe_threshold: number
          humidity_max: number
          humidity_min: number
          icon: string | null
          id: string
          is_active: boolean | null
          is_custom: boolean | null
          name: string
          name_bn: string | null
          temperature_max: number
          temperature_min: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ammonia_max?: number
          bg_color?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          description_bn?: string | null
          fan_high_temp_min?: number
          fan_low_temp_max?: number
          fan_low_temp_min?: number
          fan_medium_temp_max?: number
          fan_medium_temp_min?: number
          hsi_emergency_threshold?: number
          hsi_mild_threshold?: number
          hsi_moderate_threshold?: number
          hsi_severe_threshold?: number
          humidity_max?: number
          humidity_min?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name: string
          name_bn?: string | null
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ammonia_max?: number
          bg_color?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          description_bn?: string | null
          fan_high_temp_min?: number
          fan_low_temp_max?: number
          fan_low_temp_min?: number
          fan_medium_temp_max?: number
          fan_medium_temp_min?: number
          hsi_emergency_threshold?: number
          hsi_mild_threshold?: number
          hsi_moderate_threshold?: number
          hsi_severe_threshold?: number
          humidity_max?: number
          humidity_min?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_custom?: boolean | null
          name?: string
          name_bn?: string | null
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mortality_records: {
        Row: {
          age_weeks: number | null
          cause: string
          count: number
          created_at: string
          id: string
          notes: string | null
          record_date: string
          shed_id: string | null
          user_id: string
        }
        Insert: {
          age_weeks?: number | null
          cause?: string
          count?: number
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          shed_id?: string | null
          user_id: string
        }
        Update: {
          age_weeks?: number | null
          cause?: string
          count?: number
          created_at?: string
          id?: string
          notes?: string | null
          record_date?: string
          shed_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortality_records_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_sync_queue: {
        Row: {
          created_at: string
          id: string
          operation: string
          record_data: Json
          synced: boolean | null
          synced_at: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          operation: string
          record_data: Json
          synced?: boolean | null
          synced_at?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          operation?: string
          record_data?: Json
          synced?: boolean | null
          synced_at?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      ota_firmware: {
        Row: {
          board_type: string | null
          checksum: string | null
          crc32: string | null
          created_at: string
          created_by: string | null
          failed_installs: number | null
          farm_type: string | null
          file_size_bytes: number | null
          filename: string
          id: string
          is_active: boolean | null
          is_stable: boolean | null
          max_fail_rate: number | null
          min_firmware_version: string | null
          release_notes: string | null
          release_notes_bn: string | null
          rollout_percentage: number | null
          rollout_status: string | null
          total_installs: number | null
          url: string
          version: string
        }
        Insert: {
          board_type?: string | null
          checksum?: string | null
          crc32?: string | null
          created_at?: string
          created_by?: string | null
          failed_installs?: number | null
          farm_type?: string | null
          file_size_bytes?: number | null
          filename: string
          id?: string
          is_active?: boolean | null
          is_stable?: boolean | null
          max_fail_rate?: number | null
          min_firmware_version?: string | null
          release_notes?: string | null
          release_notes_bn?: string | null
          rollout_percentage?: number | null
          rollout_status?: string | null
          total_installs?: number | null
          url: string
          version: string
        }
        Update: {
          board_type?: string | null
          checksum?: string | null
          crc32?: string | null
          created_at?: string
          created_by?: string | null
          failed_installs?: number | null
          farm_type?: string | null
          file_size_bytes?: number | null
          filename?: string
          id?: string
          is_active?: boolean | null
          is_stable?: boolean | null
          max_fail_rate?: number | null
          min_firmware_version?: string | null
          release_notes?: string | null
          release_notes_bn?: string | null
          rollout_percentage?: number | null
          rollout_status?: string | null
          total_installs?: number | null
          url?: string
          version?: string
        }
        Relationships: []
      }
      ota_update_history: {
        Row: {
          completed_at: string | null
          created_at: string
          device_token_id: string
          error_message: string | null
          firmware_id: string | null
          from_version: string | null
          id: string
          started_at: string | null
          status: string
          to_version: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          device_token_id: string
          error_message?: string | null
          firmware_id?: string | null
          from_version?: string | null
          id?: string
          started_at?: string | null
          status?: string
          to_version?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          device_token_id?: string
          error_message?: string | null
          firmware_id?: string | null
          from_version?: string | null
          id?: string
          started_at?: string | null
          status?: string
          to_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ota_update_history_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ota_update_history_firmware_id_fkey"
            columns: ["firmware_id"]
            isOneToOne: false
            referencedRelation: "ota_firmware"
            referencedColumns: ["id"]
          },
        ]
      }
      power_outage_logs: {
        Row: {
          actions_taken: string | null
          battery_level: number | null
          created_at: string
          humidity_during: number | null
          id: string
          log_type: string
          message: string
          power_outage_id: string | null
          temperature_during: number | null
          user_id: string
        }
        Insert: {
          actions_taken?: string | null
          battery_level?: number | null
          created_at?: string
          humidity_during?: number | null
          id?: string
          log_type?: string
          message: string
          power_outage_id?: string | null
          temperature_during?: number | null
          user_id: string
        }
        Update: {
          actions_taken?: string | null
          battery_level?: number | null
          created_at?: string
          humidity_during?: number | null
          id?: string
          log_type?: string
          message?: string
          power_outage_id?: string | null
          temperature_during?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "power_outage_logs_power_outage_id_fkey"
            columns: ["power_outage_id"]
            isOneToOne: false
            referencedRelation: "power_outages"
            referencedColumns: ["id"]
          },
        ]
      }
      power_outages: {
        Row: {
          alert_sent: boolean | null
          battery_level_end: number | null
          battery_level_start: number | null
          created_at: string
          critical_alert_sent: boolean | null
          device_token_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_ongoing: boolean | null
          notes: string | null
          power_source: string | null
          shed_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          alert_sent?: boolean | null
          battery_level_end?: number | null
          battery_level_start?: number | null
          created_at?: string
          critical_alert_sent?: boolean | null
          device_token_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_ongoing?: boolean | null
          notes?: string | null
          power_source?: string | null
          shed_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          alert_sent?: boolean | null
          battery_level_end?: number | null
          battery_level_start?: number | null
          created_at?: string
          critical_alert_sent?: boolean | null
          device_token_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_ongoing?: boolean | null
          notes?: string | null
          power_source?: string | null
          shed_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "power_outages_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_outages_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_at: string | null
          blocked_by: string | null
          created_at: string
          email: string | null
          farm_name: string
          farm_type: string | null
          id: string
          is_blocked: boolean | null
          phone: string | null
          updated_at: string
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          email?: string | null
          farm_name?: string
          farm_type?: string | null
          id: string
          is_blocked?: boolean | null
          phone?: string | null
          updated_at?: string
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          email?: string | null
          farm_name?: string
          farm_type?: string | null
          id?: string
          is_blocked?: boolean | null
          phone?: string | null
          updated_at?: string
          user_name?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_notifications: {
        Row: {
          advisory_type: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          message_bn: string | null
          notification_type: string
          schedule_id: string | null
          user_id: string
        }
        Insert: {
          advisory_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          message_bn?: string | null
          notification_type: string
          schedule_id?: string | null
          user_id: string
        }
        Update: {
          advisory_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          message_bn?: string | null
          notification_type?: string
          schedule_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_notifications_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          custom_interval_days: number | null
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          notify_before_minutes: number | null
          recurrence: string
          schedule_type: string
          shed_id: string | null
          time_of_day: string
          title: string
          title_bn: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_interval_days?: number | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          notify_before_minutes?: number | null
          recurrence?: string
          schedule_type: string
          shed_id?: string | null
          time_of_day: string
          title: string
          title_bn?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_interval_days?: number | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          notify_before_minutes?: number | null
          recurrence?: string
          schedule_type?: string
          shed_id?: string | null
          time_of_day?: string
          title?: string
          title_bn?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_buffer: {
        Row: {
          ammonia: number
          created_at: string
          device_token_id: string
          hsi: number | null
          humidity: number
          id: string
          power_status: string | null
          recorded_at: string
          shed_id: string | null
          synced_at: string | null
          temperature: number
          user_id: string
          water_flow: number | null
        }
        Insert: {
          ammonia: number
          created_at?: string
          device_token_id: string
          hsi?: number | null
          humidity: number
          id?: string
          power_status?: string | null
          recorded_at: string
          shed_id?: string | null
          synced_at?: string | null
          temperature: number
          user_id: string
          water_flow?: number | null
        }
        Update: {
          ammonia?: number
          created_at?: string
          device_token_id?: string
          hsi?: number | null
          humidity?: number
          id?: string
          power_status?: string | null
          recorded_at?: string
          shed_id?: string | null
          synced_at?: string | null
          temperature?: number
          user_id?: string
          water_flow?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_buffer_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_buffer_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_logs: {
        Row: {
          ammonia: number
          device_id: string
          farm_id: string | null
          hsi: number | null
          humidity: number
          id: string
          power_status: string
          shed_id: string | null
          temperature: number
          timestamp: string
          user_id: string
          water_flow: number
        }
        Insert: {
          ammonia: number
          device_id?: string
          farm_id?: string | null
          hsi?: number | null
          humidity: number
          id?: string
          power_status?: string
          shed_id?: string | null
          temperature: number
          timestamp?: string
          user_id: string
          water_flow?: number
        }
        Update: {
          ammonia?: number
          device_id?: string
          farm_id?: string | null
          hsi?: number | null
          humidity?: number
          id?: string
          power_status?: string
          shed_id?: string | null
          temperature?: number
          timestamp?: string
          user_id?: string
          water_flow?: number
        }
        Relationships: [
          {
            foreignKeyName: "sensor_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_logs_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_readings: {
        Row: {
          ammonia: number
          device_id: string | null
          farm_id: string | null
          hsi: number | null
          humidity: number
          id: string
          recorded_at: string
          shed_id: string | null
          temperature: number
          user_id: string
          water_usage: number
        }
        Insert: {
          ammonia: number
          device_id?: string | null
          farm_id?: string | null
          hsi?: number | null
          humidity: number
          id?: string
          recorded_at?: string
          shed_id?: string | null
          temperature: number
          user_id: string
          water_usage: number
        }
        Update: {
          ammonia?: number
          device_id?: string | null
          farm_id?: string | null
          hsi?: number | null
          humidity?: number
          id?: string
          recorded_at?: string
          shed_id?: string | null
          temperature?: number
          user_id?: string
          water_usage?: number
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_readings_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      sheds: {
        Row: {
          bird_capacity: number | null
          created_at: string
          description: string | null
          farm_id: string | null
          farm_type: string
          id: string
          is_active: boolean | null
          name: string
          name_en: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bird_capacity?: number | null
          created_at?: string
          description?: string | null
          farm_id?: string | null
          farm_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bird_capacity?: number | null
          created_at?: string
          description?: string | null
          farm_id?: string | null
          farm_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheds_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_alert_settings: {
        Row: {
          ammonia_alerts: boolean
          cooldown_minutes: number
          created_at: string
          device_offline_alerts: boolean
          enabled: boolean
          humidity_alerts: boolean
          id: string
          last_sms_sent_at: string | null
          power_alerts: boolean
          temperature_alerts: boolean
          updated_at: string
          user_id: string
          water_alerts: boolean
        }
        Insert: {
          ammonia_alerts?: boolean
          cooldown_minutes?: number
          created_at?: string
          device_offline_alerts?: boolean
          enabled?: boolean
          humidity_alerts?: boolean
          id?: string
          last_sms_sent_at?: string | null
          power_alerts?: boolean
          temperature_alerts?: boolean
          updated_at?: string
          user_id: string
          water_alerts?: boolean
        }
        Update: {
          ammonia_alerts?: boolean
          cooldown_minutes?: number
          created_at?: string
          device_offline_alerts?: boolean
          enabled?: boolean
          humidity_alerts?: boolean
          id?: string
          last_sms_sent_at?: string | null
          power_alerts?: boolean
          temperature_alerts?: boolean
          updated_at?: string
          user_id?: string
          water_alerts?: boolean
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          alert_type: string
          created_at: string
          error_message: string | null
          id: string
          message: string
          phone_number: string
          sent_via: string
          status: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          phone_number: string
          sent_via?: string
          status?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          phone_number?: string
          sent_via?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_phone_numbers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          phone_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          farm_owner_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_owner_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          farm_owner_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_trends: {
        Row: {
          deviation_percent: number | null
          id: string
          notes: string | null
          recorded_at: string
          rolling_avg_30d: number | null
          rolling_avg_7d: number | null
          shed_id: string | null
          trend_type: string
          user_id: string
          water_usage: number
        }
        Insert: {
          deviation_percent?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          rolling_avg_30d?: number | null
          rolling_avg_7d?: number | null
          shed_id?: string | null
          trend_type?: string
          user_id: string
          water_usage: number
        }
        Update: {
          deviation_percent?: number | null
          id?: string
          notes?: string | null
          recorded_at?: string
          rolling_avg_30d?: number | null
          rolling_avg_7d?: number | null
          shed_id?: string | null
          trend_type?: string
          user_id?: string
          water_usage?: number
        }
        Relationships: [
          {
            foreignKeyName: "water_trends_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_cache: {
        Row: {
          feels_like: number | null
          fetched_at: string
          forecast_json: Json | null
          humidity: number | null
          id: string
          rain_probability: number | null
          temperature: number | null
          user_id: string
          weather_condition: string | null
          weather_icon: string | null
          wind_speed: number | null
        }
        Insert: {
          feels_like?: number | null
          fetched_at?: string
          forecast_json?: Json | null
          humidity?: number | null
          id?: string
          rain_probability?: number | null
          temperature?: number | null
          user_id: string
          weather_condition?: string | null
          weather_icon?: string | null
          wind_speed?: number | null
        }
        Update: {
          feels_like?: number | null
          fetched_at?: string
          forecast_json?: Json | null
          humidity?: number | null
          id?: string
          rain_probability?: number | null
          temperature?: number | null
          user_id?: string
          weather_condition?: string | null
          weather_icon?: string | null
          wind_speed?: number | null
        }
        Relationships: []
      }
      weather_settings: {
        Row: {
          auto_fan_adjustment: boolean
          created_at: string
          heat_wave_protection: boolean
          heat_wave_threshold: number
          id: string
          last_weather_fetch: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          rain_alert_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_fan_adjustment?: boolean
          created_at?: string
          heat_wave_protection?: boolean
          heat_wave_threshold?: number
          id?: string
          last_weather_fetch?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          rain_alert_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_fan_adjustment?: boolean
          created_at?: string
          heat_wave_protection?: boolean
          heat_wave_threshold?: number
          id?: string
          last_weather_fetch?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          rain_alert_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_invitations: {
        Row: {
          created_at: string
          expires_at: string
          farm_owner_id: string
          id: string
          invite_code: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          farm_owner_id: string
          id?: string
          invite_code: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          farm_owner_id?: string
          id?: string
          invite_code?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          _assigner_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      can_access_farm: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
      get_farm_owner_id: { Args: { _user_id: string }; Returns: string }
      get_user_access_role: { Args: { _user_id: string }; Returns: string }
      has_min_role: {
        Args: { _required_role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_farm_owner: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_severity: "info" | "warning" | "danger"
      alert_type: "temperature" | "ammonia" | "power" | "water"
      app_role:
        | "owner"
        | "worker"
        | "super_admin"
        | "viewer"
        | "farmer"
        | "admin"
      device_mode: "AUTO" | "MANUAL" | "FAIL_SAFE" | "OFFLINE"
      device_type: "fan" | "light" | "alarm"
      operator_type: ">" | "<" | ">=" | "<="
      sensor_type: "temperature" | "humidity" | "ammonia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["info", "warning", "danger"],
      alert_type: ["temperature", "ammonia", "power", "water"],
      app_role: ["owner", "worker", "super_admin", "viewer", "farmer", "admin"],
      device_mode: ["AUTO", "MANUAL", "FAIL_SAFE", "OFFLINE"],
      device_type: ["fan", "light", "alarm"],
      operator_type: [">", "<", ">=", "<="],
      sensor_type: ["temperature", "humidity", "ammonia"],
    },
  },
} as const
