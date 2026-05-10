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
          ceiling_fan_enabled: boolean | null
          ceiling_fan_off_temp: number | null
          ceiling_fan_on_temp: number | null
          comfort_preference: string
          cooling_preference: string
          created_at: string
          curtain_advisory_enabled: boolean | null
          curtain_close_on_cold: boolean | null
          curtain_open_temp_diff: number | null
          farm_id: string | null
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
          heating_preference: string
          id: string
          lighting_fade_duration_minutes: number | null
          min_vent_ceiling_fan_always_on: boolean | null
          min_vent_cycle_seconds: number | null
          min_vent_enabled: boolean | null
          min_vent_interval_minutes: number | null
          min_vent_temp_threshold: number | null
          protection_preference: string
          shed_id: string | null
          sprinkler_cycle_off_seconds: number | null
          sprinkler_cycle_on_seconds: number | null
          sprinkler_enabled: boolean | null
          sprinkler_hsi_threshold: number | null
          sprinkler_max_daily_minutes: number | null
          sprinkler_stop_hsi: number | null
          updated_at: string
          user_id: string
          ventilation_preference: string
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
          ceiling_fan_enabled?: boolean | null
          ceiling_fan_off_temp?: number | null
          ceiling_fan_on_temp?: number | null
          comfort_preference?: string
          cooling_preference?: string
          created_at?: string
          curtain_advisory_enabled?: boolean | null
          curtain_close_on_cold?: boolean | null
          curtain_open_temp_diff?: number | null
          farm_id?: string | null
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
          heating_preference?: string
          id?: string
          lighting_fade_duration_minutes?: number | null
          min_vent_ceiling_fan_always_on?: boolean | null
          min_vent_cycle_seconds?: number | null
          min_vent_enabled?: boolean | null
          min_vent_interval_minutes?: number | null
          min_vent_temp_threshold?: number | null
          protection_preference?: string
          shed_id?: string | null
          sprinkler_cycle_off_seconds?: number | null
          sprinkler_cycle_on_seconds?: number | null
          sprinkler_enabled?: boolean | null
          sprinkler_hsi_threshold?: number | null
          sprinkler_max_daily_minutes?: number | null
          sprinkler_stop_hsi?: number | null
          updated_at?: string
          user_id: string
          ventilation_preference?: string
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
          ceiling_fan_enabled?: boolean | null
          ceiling_fan_off_temp?: number | null
          ceiling_fan_on_temp?: number | null
          comfort_preference?: string
          cooling_preference?: string
          created_at?: string
          curtain_advisory_enabled?: boolean | null
          curtain_close_on_cold?: boolean | null
          curtain_open_temp_diff?: number | null
          farm_id?: string | null
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
          heating_preference?: string
          id?: string
          lighting_fade_duration_minutes?: number | null
          min_vent_ceiling_fan_always_on?: boolean | null
          min_vent_cycle_seconds?: number | null
          min_vent_enabled?: boolean | null
          min_vent_interval_minutes?: number | null
          min_vent_temp_threshold?: number | null
          protection_preference?: string
          shed_id?: string | null
          sprinkler_cycle_off_seconds?: number | null
          sprinkler_cycle_on_seconds?: number | null
          sprinkler_enabled?: boolean | null
          sprinkler_hsi_threshold?: number | null
          sprinkler_max_daily_minutes?: number | null
          sprinkler_stop_hsi?: number | null
          updated_at?: string
          user_id?: string
          ventilation_preference?: string
          water_baseline_hours?: number | null
          water_drop_threshold_percent?: number | null
          water_night_spike_enabled?: boolean | null
          water_zero_flow_alert?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "advanced_automation_settings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_automation_settings_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_channel_config: {
        Row: {
          created_at: string
          critical_bypass_quiet_hours: boolean
          escalation_minutes: number
          escalation_phone_e164: string | null
          farm_id: string
          id: string
          phone_e164: string | null
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          created_at?: string
          critical_bypass_quiet_hours?: boolean
          escalation_minutes?: number
          escalation_phone_e164?: string | null
          farm_id: string
          id?: string
          phone_e164?: string | null
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          created_at?: string
          critical_bypass_quiet_hours?: boolean
          escalation_minutes?: number
          escalation_phone_e164?: string | null
          farm_id?: string
          id?: string
          phone_e164?: string | null
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "alert_channel_config_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: true
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_deliveries: {
        Row: {
          alert_id: string
          channel: string
          created_at: string
          error_message: string | null
          farm_id: string | null
          id: string
          is_escalation: boolean
          provider_message_id: string | null
          recipient: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          alert_id: string
          channel: string
          created_at?: string
          error_message?: string | null
          farm_id?: string | null
          id?: string
          is_escalation?: boolean
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status: string
        }
        Update: {
          alert_id?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          farm_id?: string | null
          id?: string
          is_escalation?: boolean
          provider_message_id?: string | null
          recipient?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          channels: Json
          cooldown_minutes: number
          created_at: string
          created_by: string | null
          duration_seconds: number
          enabled: boolean
          farm_id: string
          id: string
          metric: string
          name: string
          operator: string
          severity: string
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          channels?: Json
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          enabled?: boolean
          farm_id: string
          id?: string
          metric: string
          name: string
          operator?: string
          severity?: string
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          channels?: Json
          cooldown_minutes?: number
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          enabled?: boolean
          farm_id?: string
          id?: string
          metric?: string
          name?: string
          operator?: string
          severity?: string
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          escalated_at: string | null
          farm_id: string | null
          id: string
          message: string
          message_bn: string
          rule_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          shed_id: string | null
          sustained_since: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          escalated_at?: string | null
          farm_id?: string | null
          id?: string
          message: string
          message_bn: string
          rule_id?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          shed_id?: string | null
          sustained_since?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          escalated_at?: string | null
          farm_id?: string | null
          id?: string
          message?: string
          message_bn?: string
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          shed_id?: string | null
          sustained_since?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules_new: {
        Row: {
          action: string
          condition: string
          created_at: string
          enabled: boolean
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
          id?: string
          parameter?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_new_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
            foreignKeyName: "broiler_batches_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
          {
            foreignKeyName: "broiler_feed_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
          {
            foreignKeyName: "broiler_mortality_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
          {
            foreignKeyName: "broiler_sales_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      broiler_weights: {
        Row: {
          average_weight_grams: number
          batch_id: string
          created_at: string
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
          {
            foreignKeyName: "broiler_weights_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
          id?: string
          report_date?: string
          total_water_usage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_summary: {
        Row: {
          alerts_count: number | null
          avg_ammonia: number | null
          avg_humidity: number | null
          avg_temperature: number | null
          created_at: string
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "daily_summary_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      device_calibration: {
        Row: {
          air_volume_cubic_meters: number | null
          ammonia_offset_ppm: number
          calibration_score: number | null
          clean_air_nh3_ppm: number | null
          created_at: string
          device_token_id: string | null
          fan_direction_test_passed: boolean | null
          fan_direction_tested_at: string | null
          farm_height_meters: number | null
          farm_id: string | null
          farm_length_meters: number | null
          farm_width_meters: number | null
          heater_temp_rise: number | null
          heater_test_passed: boolean | null
          heater_tested_at: string | null
          humidity_offset_percent: number
          id: string
          nh3_baseline_calibrated_at: string | null
          overall_status: string | null
          shed_id: string | null
          temp_drop_rate: number | null
          temp_sensor_placement_status: string | null
          temp_sensor_test_passed: boolean | null
          temp_sensor_tested_at: string | null
          temperature_offset_celsius: number
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
          ammonia_offset_ppm?: number
          calibration_score?: number | null
          clean_air_nh3_ppm?: number | null
          created_at?: string
          device_token_id?: string | null
          fan_direction_test_passed?: boolean | null
          fan_direction_tested_at?: string | null
          farm_height_meters?: number | null
          farm_id?: string | null
          farm_length_meters?: number | null
          farm_width_meters?: number | null
          heater_temp_rise?: number | null
          heater_test_passed?: boolean | null
          heater_tested_at?: string | null
          humidity_offset_percent?: number
          id?: string
          nh3_baseline_calibrated_at?: string | null
          overall_status?: string | null
          shed_id?: string | null
          temp_drop_rate?: number | null
          temp_sensor_placement_status?: string | null
          temp_sensor_test_passed?: boolean | null
          temp_sensor_tested_at?: string | null
          temperature_offset_celsius?: number
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
          ammonia_offset_ppm?: number
          calibration_score?: number | null
          clean_air_nh3_ppm?: number | null
          created_at?: string
          device_token_id?: string | null
          fan_direction_test_passed?: boolean | null
          fan_direction_tested_at?: string | null
          farm_height_meters?: number | null
          farm_id?: string | null
          farm_length_meters?: number | null
          farm_width_meters?: number | null
          heater_temp_rise?: number | null
          heater_test_passed?: boolean | null
          heater_tested_at?: string | null
          humidity_offset_percent?: number
          id?: string
          nh3_baseline_calibrated_at?: string | null
          overall_status?: string | null
          shed_id?: string | null
          temp_drop_rate?: number | null
          temp_sensor_placement_status?: string | null
          temp_sensor_test_passed?: boolean | null
          temp_sensor_tested_at?: string | null
          temperature_offset_celsius?: number
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
            foreignKeyName: "device_calibration_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: true
            referencedRelation: "farms"
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
            foreignKeyName: "device_command_log_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
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
          client_request_id: string | null
          command_type: string
          command_value: boolean
          created_at: string
          device_name: string
          dispatched_at: string | null
          executed: boolean
          executed_at: string | null
          farm_id: string | null
          id: string
          latency_to_ack_ms: number | null
          latency_to_device_ms: number | null
          retry_count: number
          user_id: string
        }
        Insert: {
          client_request_id?: string | null
          command_type: string
          command_value?: boolean
          created_at?: string
          device_name?: string
          dispatched_at?: string | null
          executed?: boolean
          executed_at?: string | null
          farm_id?: string | null
          id?: string
          latency_to_ack_ms?: number | null
          latency_to_device_ms?: number | null
          retry_count?: number
          user_id: string
        }
        Update: {
          client_request_id?: string | null
          command_type?: string
          command_value?: boolean
          created_at?: string
          device_name?: string
          dispatched_at?: string | null
          executed?: boolean
          executed_at?: string | null
          farm_id?: string | null
          id?: string
          latency_to_ack_ms?: number | null
          latency_to_device_ms?: number | null
          retry_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_commands_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      device_control: {
        Row: {
          alarm: boolean
          device_id: string
          fan: boolean
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
          id?: string
          light?: boolean
          mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_control_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      device_hardware_profiles: {
        Row: {
          board_type: string
          created_at: string
          device_token_id: string
          farm_id: string | null
          features: Json
          gpio_map: Json
          id: string
          relay_count: number
          updated_at: string
        }
        Insert: {
          board_type?: string
          created_at?: string
          device_token_id: string
          farm_id?: string | null
          features?: Json
          gpio_map?: Json
          id?: string
          relay_count?: number
          updated_at?: string
        }
        Update: {
          board_type?: string
          created_at?: string
          device_token_id?: string
          farm_id?: string | null
          features?: Json
          gpio_map?: Json
          id?: string
          relay_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_hardware_profiles_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: true
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_hardware_profiles_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      device_health: {
        Row: {
          ammonia_avg_10: number | null
          battery_capacity_wh: number | null
          battery_percentage: number | null
          broiler_age_source: string | null
          cached_settings_version: number | null
          ceiling_fan_total_runtime_seconds: number | null
          circulation_fan_last_cycle_at: string | null
          connection_quality_score: number | null
          consecutive_failed_syncs: number
          consecutive_high_ammonia: number | null
          cpu_temperature: number | null
          created_at: string
          curtain_advisory_last_sent: string | null
          device_token_id: string
          error_count: number | null
          failsafe_activated_at: string | null
          failsafe_mode: boolean | null
          failsafe_recovery_attempts: number
          farm_id: string | null
          firmware_version: string | null
          fogger_last_cycle_at: string | null
          free_memory_bytes: number | null
          gas_sensor_warmup_done: boolean | null
          gas_sensor_warmup_start: string | null
          heater_total_runtime_seconds: number | null
          hsi: number | null
          id: string
          is_online: boolean | null
          last_age_sync_at: string | null
          last_cloud_sync_at: string | null
          last_error_message: string | null
          last_offline_buffer_flush: string | null
          last_power_event_at: string | null
          last_power_outage_id: string | null
          last_restart_at: string | null
          last_seen_at: string | null
          last_server_age_sync_at: string | null
          min_vent_last_cycle_at: string | null
          mode: string | null
          motor_total_runtime_seconds: number | null
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
          relay_count: number | null
          relay_toggle_violations: number | null
          restart_count: number | null
          restart_reason: string | null
          safe_mode_until: string | null
          shed_id: string | null
          sprinkler_last_cycle_at: string | null
          sprinkler_total_runtime_seconds: number | null
          stuck_relay_detected: boolean | null
          stuck_relay_device: string | null
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
          ceiling_fan_total_runtime_seconds?: number | null
          circulation_fan_last_cycle_at?: string | null
          connection_quality_score?: number | null
          consecutive_failed_syncs?: number
          consecutive_high_ammonia?: number | null
          cpu_temperature?: number | null
          created_at?: string
          curtain_advisory_last_sent?: string | null
          device_token_id: string
          error_count?: number | null
          failsafe_activated_at?: string | null
          failsafe_mode?: boolean | null
          failsafe_recovery_attempts?: number
          farm_id?: string | null
          firmware_version?: string | null
          fogger_last_cycle_at?: string | null
          free_memory_bytes?: number | null
          gas_sensor_warmup_done?: boolean | null
          gas_sensor_warmup_start?: string | null
          heater_total_runtime_seconds?: number | null
          hsi?: number | null
          id?: string
          is_online?: boolean | null
          last_age_sync_at?: string | null
          last_cloud_sync_at?: string | null
          last_error_message?: string | null
          last_offline_buffer_flush?: string | null
          last_power_event_at?: string | null
          last_power_outage_id?: string | null
          last_restart_at?: string | null
          last_seen_at?: string | null
          last_server_age_sync_at?: string | null
          min_vent_last_cycle_at?: string | null
          mode?: string | null
          motor_total_runtime_seconds?: number | null
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
          relay_count?: number | null
          relay_toggle_violations?: number | null
          restart_count?: number | null
          restart_reason?: string | null
          safe_mode_until?: string | null
          shed_id?: string | null
          sprinkler_last_cycle_at?: string | null
          sprinkler_total_runtime_seconds?: number | null
          stuck_relay_detected?: boolean | null
          stuck_relay_device?: string | null
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
          ceiling_fan_total_runtime_seconds?: number | null
          circulation_fan_last_cycle_at?: string | null
          connection_quality_score?: number | null
          consecutive_failed_syncs?: number
          consecutive_high_ammonia?: number | null
          cpu_temperature?: number | null
          created_at?: string
          curtain_advisory_last_sent?: string | null
          device_token_id?: string
          error_count?: number | null
          failsafe_activated_at?: string | null
          failsafe_mode?: boolean | null
          failsafe_recovery_attempts?: number
          farm_id?: string | null
          firmware_version?: string | null
          fogger_last_cycle_at?: string | null
          free_memory_bytes?: number | null
          gas_sensor_warmup_done?: boolean | null
          gas_sensor_warmup_start?: string | null
          heater_total_runtime_seconds?: number | null
          hsi?: number | null
          id?: string
          is_online?: boolean | null
          last_age_sync_at?: string | null
          last_cloud_sync_at?: string | null
          last_error_message?: string | null
          last_offline_buffer_flush?: string | null
          last_power_event_at?: string | null
          last_power_outage_id?: string | null
          last_restart_at?: string | null
          last_seen_at?: string | null
          last_server_age_sync_at?: string | null
          min_vent_last_cycle_at?: string | null
          mode?: string | null
          motor_total_runtime_seconds?: number | null
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
          relay_count?: number | null
          relay_toggle_violations?: number | null
          restart_count?: number | null
          restart_reason?: string | null
          safe_mode_until?: string | null
          shed_id?: string | null
          sprinkler_last_cycle_at?: string | null
          sprinkler_total_runtime_seconds?: number | null
          stuck_relay_detected?: boolean | null
          stuck_relay_device?: string | null
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
      device_health_metrics: {
        Row: {
          bucket_hour: string
          device_token_id: string
          error_count: number
          farm_id: string | null
          last_sync_at: string | null
          max_latency_ms: number
          nonce_reuse_count: number
          rate_limited_count: number
          restart_count: number
          sensor_gap_seconds_max: number
          signature_failures: number
          sync_count: number
          total_latency_ms: number
          updated_at: string
        }
        Insert: {
          bucket_hour: string
          device_token_id: string
          error_count?: number
          farm_id?: string | null
          last_sync_at?: string | null
          max_latency_ms?: number
          nonce_reuse_count?: number
          rate_limited_count?: number
          restart_count?: number
          sensor_gap_seconds_max?: number
          signature_failures?: number
          sync_count?: number
          total_latency_ms?: number
          updated_at?: string
        }
        Update: {
          bucket_hour?: string
          device_token_id?: string
          error_count?: number
          farm_id?: string | null
          last_sync_at?: string | null
          max_latency_ms?: number
          nonce_reuse_count?: number
          rate_limited_count?: number
          restart_count?: number
          sensor_gap_seconds_max?: number
          signature_failures?: number
          sync_count?: number
          total_latency_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      device_offline_buffer_log: {
        Row: {
          accepted_count: number
          batch_size: number
          device_token_id: string
          farm_id: string | null
          flushed_at: string
          id: string
          newest_ts: string | null
          oldest_ts: string | null
          rejected_count: number
        }
        Insert: {
          accepted_count?: number
          batch_size: number
          device_token_id: string
          farm_id?: string | null
          flushed_at?: string
          id?: string
          newest_ts?: string | null
          oldest_ts?: string | null
          rejected_count?: number
        }
        Update: {
          accepted_count?: number
          batch_size?: number
          device_token_id?: string
          farm_id?: string | null
          flushed_at?: string
          id?: string
          newest_ts?: string | null
          oldest_ts?: string | null
          rejected_count?: number
        }
        Relationships: []
      }
      device_provisioning_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          device_name: string | null
          device_token_id: string | null
          expires_at: string
          farm_id: string
          id: string
          shed_id: string | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          device_name?: string | null
          device_token_id?: string | null
          expires_at?: string
          farm_id: string
          id?: string
          shed_id?: string | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          device_name?: string | null
          device_token_id?: string | null
          expires_at?: string
          farm_id?: string
          id?: string
          shed_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_provisioning_codes_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_provisioning_codes_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_provisioning_codes_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      device_request_nonces: {
        Row: {
          device_token_id: string
          expires_at: string
          id: string
          nonce: string
          used_at: string
        }
        Insert: {
          device_token_id: string
          expires_at?: string
          id?: string
          nonce: string
          used_at?: string
        }
        Update: {
          device_token_id?: string
          expires_at?: string
          id?: string
          nonce?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_request_nonces_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      device_restart_log: {
        Row: {
          created_at: string
          device_token_id: string
          error_message: string | null
          farm_id: string | null
          firmware_version: string | null
          free_memory_bytes: number | null
          id: string
          occurred_at: string
          restart_reason: string
          uptime_before_restart_seconds: number | null
          user_id: string
          wifi_signal_strength: number | null
        }
        Insert: {
          created_at?: string
          device_token_id: string
          error_message?: string | null
          farm_id?: string | null
          firmware_version?: string | null
          free_memory_bytes?: number | null
          id?: string
          occurred_at?: string
          restart_reason: string
          uptime_before_restart_seconds?: number | null
          user_id: string
          wifi_signal_strength?: number | null
        }
        Update: {
          created_at?: string
          device_token_id?: string
          error_message?: string | null
          farm_id?: string | null
          firmware_version?: string | null
          free_memory_bytes?: number | null
          id?: string
          occurred_at?: string
          restart_reason?: string
          uptime_before_restart_seconds?: number | null
          user_id?: string
          wifi_signal_strength?: number | null
        }
        Relationships: []
      }
      device_status: {
        Row: {
          age_profile_days: number | null
          alarm_on: boolean
          ceiling_fan_on: boolean
          circulation_fan_on: boolean | null
          curtain_position: string | null
          desired_alarm_on: boolean | null
          desired_ceiling_fan_on: boolean | null
          desired_circulation_fan_on: boolean | null
          desired_fan_on: boolean | null
          desired_fan_speed: string | null
          desired_fogger_on: boolean | null
          desired_heater_on: boolean | null
          desired_light_on: boolean | null
          desired_manual_override: boolean | null
          desired_sprinkler_on: boolean | null
          device_id: string | null
          fan_on: boolean
          fan_speed: string
          farm_id: string | null
          fogger_on: boolean | null
          heater_on: boolean | null
          hsi: number | null
          id: string
          last_cloud_sync: string | null
          last_device_ack_at: string | null
          light_on: boolean
          manual_override: boolean
          mode: string | null
          power_on: boolean
          safety_override: boolean | null
          safety_override_at: string | null
          safety_override_reason: string | null
          shed_id: string | null
          sprinkler_on: boolean
          state_mismatch: boolean | null
          target_air_quality: number | null
          target_humidity: number | null
          target_temperature: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_profile_days?: number | null
          alarm_on?: boolean
          ceiling_fan_on?: boolean
          circulation_fan_on?: boolean | null
          curtain_position?: string | null
          desired_alarm_on?: boolean | null
          desired_ceiling_fan_on?: boolean | null
          desired_circulation_fan_on?: boolean | null
          desired_fan_on?: boolean | null
          desired_fan_speed?: string | null
          desired_fogger_on?: boolean | null
          desired_heater_on?: boolean | null
          desired_light_on?: boolean | null
          desired_manual_override?: boolean | null
          desired_sprinkler_on?: boolean | null
          device_id?: string | null
          fan_on?: boolean
          fan_speed?: string
          farm_id?: string | null
          fogger_on?: boolean | null
          heater_on?: boolean | null
          hsi?: number | null
          id?: string
          last_cloud_sync?: string | null
          last_device_ack_at?: string | null
          light_on?: boolean
          manual_override?: boolean
          mode?: string | null
          power_on?: boolean
          safety_override?: boolean | null
          safety_override_at?: string | null
          safety_override_reason?: string | null
          shed_id?: string | null
          sprinkler_on?: boolean
          state_mismatch?: boolean | null
          target_air_quality?: number | null
          target_humidity?: number | null
          target_temperature?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_profile_days?: number | null
          alarm_on?: boolean
          ceiling_fan_on?: boolean
          circulation_fan_on?: boolean | null
          curtain_position?: string | null
          desired_alarm_on?: boolean | null
          desired_ceiling_fan_on?: boolean | null
          desired_circulation_fan_on?: boolean | null
          desired_fan_on?: boolean | null
          desired_fan_speed?: string | null
          desired_fogger_on?: boolean | null
          desired_heater_on?: boolean | null
          desired_light_on?: boolean | null
          desired_manual_override?: boolean | null
          desired_sprinkler_on?: boolean | null
          device_id?: string | null
          fan_on?: boolean
          fan_speed?: string
          farm_id?: string | null
          fogger_on?: boolean | null
          heater_on?: boolean | null
          hsi?: number | null
          id?: string
          last_cloud_sync?: string | null
          last_device_ack_at?: string | null
          light_on?: boolean
          manual_override?: boolean
          mode?: string | null
          power_on?: boolean
          safety_override?: boolean | null
          safety_override_at?: string | null
          safety_override_reason?: string | null
          shed_id?: string | null
          sprinkler_on?: boolean
          state_mismatch?: boolean | null
          target_air_quality?: number | null
          target_humidity?: number | null
          target_temperature?: number | null
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
          device_secret: string | null
          device_secret_hash: string | null
          farm_id: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          last_signature_at: string | null
          previous_device_secret: string | null
          previous_secret_expires_at: string | null
          previous_secret_hash: string | null
          secret_rotated_at: string | null
          secret_version: number
          shed_id: string | null
          signature_failure_count: number
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string
          device_secret?: string | null
          device_secret_hash?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          last_signature_at?: string | null
          previous_device_secret?: string | null
          previous_secret_expires_at?: string | null
          previous_secret_hash?: string | null
          secret_rotated_at?: string | null
          secret_version?: number
          shed_id?: string | null
          signature_failure_count?: number
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string
          device_secret?: string | null
          device_secret_hash?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          last_signature_at?: string | null
          previous_device_secret?: string | null
          previous_secret_expires_at?: string | null
          previous_secret_hash?: string | null
          secret_rotated_at?: string | null
          secret_version?: number
          shed_id?: string | null
          signature_failure_count?: number
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_tokens_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_request_log: {
        Row: {
          created_at: string
          device_token_id: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          farm_id: string | null
          function_name: string
          id: string
          method: string | null
          path: string | null
          payload_size_bytes: number | null
          request_id: string | null
          response_size_bytes: number | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_token_id?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          farm_id?: string | null
          function_name: string
          id?: string
          method?: string | null
          path?: string | null
          payload_size_bytes?: number | null
          request_id?: string | null
          response_size_bytes?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_token_id?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          farm_id?: string | null
          function_name?: string
          id?: string
          method?: string | null
          path?: string | null
          payload_size_bytes?: number | null
          request_id?: string | null
          response_size_bytes?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      egg_production: {
        Row: {
          batch_id: string | null
          broken: number
          created_at: string
          farm_id: string | null
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
          batch_id?: string | null
          broken?: number
          created_at?: string
          farm_id?: string | null
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
          batch_id?: string | null
          broken?: number
          created_at?: string
          farm_id?: string | null
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
            foreignKeyName: "egg_production_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egg_production_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_events: {
        Row: {
          actions_taken: Json | null
          created_at: string
          description: string | null
          description_bn: string | null
          device_token_id: string | null
          farm_id: string | null
          id: string
          metadata: Json | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          sensor_snapshot: Json | null
          shed_id: string | null
          source: string | null
          status: string
          title: string
          title_bn: string
          trigger_type: string
          updated_at: string
          user_id: string
          webhook_called: boolean | null
          webhook_response: Json | null
          webhook_url: string | null
        }
        Insert: {
          actions_taken?: Json | null
          created_at?: string
          description?: string | null
          description_bn?: string | null
          device_token_id?: string | null
          farm_id?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sensor_snapshot?: Json | null
          shed_id?: string | null
          source?: string | null
          status?: string
          title: string
          title_bn: string
          trigger_type: string
          updated_at?: string
          user_id: string
          webhook_called?: boolean | null
          webhook_response?: Json | null
          webhook_url?: string | null
        }
        Update: {
          actions_taken?: Json | null
          created_at?: string
          description?: string | null
          description_bn?: string | null
          device_token_id?: string | null
          farm_id?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sensor_snapshot?: Json | null
          shed_id?: string | null
          source?: string | null
          status?: string
          title?: string
          title_bn?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string
          webhook_called?: boolean | null
          webhook_response?: Json | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_events_device_token_id_fkey"
            columns: ["device_token_id"]
            isOneToOne: false
            referencedRelation: "device_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_events_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_events_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_webhook_config: {
        Row: {
          created_at: string
          farm_id: string | null
          id: string
          notify_on_critical: boolean | null
          notify_on_info: boolean | null
          notify_on_life_threatening: boolean | null
          notify_on_warning: boolean | null
          updated_at: string
          user_id: string
          webhook_enabled: boolean | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          farm_id?: string | null
          id?: string
          notify_on_critical?: boolean | null
          notify_on_info?: boolean | null
          notify_on_life_threatening?: boolean | null
          notify_on_warning?: boolean | null
          updated_at?: string
          user_id: string
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          farm_id?: string | null
          id?: string
          notify_on_critical?: boolean | null
          notify_on_info?: boolean | null
          notify_on_life_threatening?: boolean | null
          notify_on_warning?: boolean | null
          updated_at?: string
          user_id?: string
          webhook_enabled?: boolean | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_webhook_config_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          batch_id: string | null
          category: string
          created_at: string
          description: string | null
          expense_date: string
          farm_id: string | null
          farm_mode: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          farm_id?: string | null
          farm_mode?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          farm_id?: string | null
          farm_mode?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_audit_logs: {
        Row: {
          action_category: string
          action_type: string
          created_at: string
          device_name: string | null
          farm_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          severity: string
          shed_id: string | null
          source: string
          target_entity: string | null
          target_id: string | null
          user_email: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          action_category?: string
          action_type: string
          created_at?: string
          device_name?: string | null
          farm_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          severity?: string
          shed_id?: string | null
          source?: string
          target_entity?: string | null
          target_id?: string | null
          user_email?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          created_at?: string
          device_name?: string | null
          farm_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          severity?: string
          shed_id?: string | null
          source?: string
          target_entity?: string | null
          target_id?: string | null
          user_email?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_audit_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_audit_logs_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_members: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_settings: {
        Row: {
          ammonia_max: number
          automation_mode: string
          created_at: string
          fan_high_temp_min: number
          fan_low_temp_max: number
          fan_low_temp_min: number
          fan_medium_temp_max: number
          fan_medium_temp_min: number
          farm_id: string | null
          farm_size: string | null
          hsi_automation_enabled: boolean
          hsi_emergency_threshold: number
          hsi_mild_threshold: number
          hsi_moderate_threshold: number
          hsi_severe_threshold: number
          humidity_max: number
          humidity_min: number
          id: string
          manual_mode_since: string | null
          profile_override: string | null
          safety_engine_enabled: boolean
          season_override: string | null
          temperature_max: number
          temperature_min: number
          updated_at: string
          user_id: string
          water_anomaly_threshold: number
        }
        Insert: {
          ammonia_max?: number
          automation_mode?: string
          created_at?: string
          fan_high_temp_min?: number
          fan_low_temp_max?: number
          fan_low_temp_min?: number
          fan_medium_temp_max?: number
          fan_medium_temp_min?: number
          farm_id?: string | null
          farm_size?: string | null
          hsi_automation_enabled?: boolean
          hsi_emergency_threshold?: number
          hsi_mild_threshold?: number
          hsi_moderate_threshold?: number
          hsi_severe_threshold?: number
          humidity_max?: number
          humidity_min?: number
          id?: string
          manual_mode_since?: string | null
          profile_override?: string | null
          safety_engine_enabled?: boolean
          season_override?: string | null
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          user_id: string
          water_anomaly_threshold?: number
        }
        Update: {
          ammonia_max?: number
          automation_mode?: string
          created_at?: string
          fan_high_temp_min?: number
          fan_low_temp_max?: number
          fan_low_temp_min?: number
          fan_medium_temp_max?: number
          fan_medium_temp_min?: number
          farm_id?: string | null
          farm_size?: string | null
          hsi_automation_enabled?: boolean
          hsi_emergency_threshold?: number
          hsi_mild_threshold?: number
          hsi_moderate_threshold?: number
          hsi_severe_threshold?: number
          humidity_max?: number
          humidity_min?: number
          id?: string
          manual_mode_since?: string | null
          profile_override?: string | null
          safety_engine_enabled?: boolean
          season_override?: string | null
          temperature_max?: number
          temperature_min?: number
          updated_at?: string
          user_id?: string
          water_anomaly_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "farm_settings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: true
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_setup_status: {
        Row: {
          created_at: string
          current_step: number
          farm_id: string
          hardware_validation_at: string | null
          hardware_validation_passed: boolean
          hardware_validation_results: Json | null
          id: string
          relay_test_results: Json | null
          setup_completed: boolean
          setup_completed_at: string | null
          simulation_results: Json | null
          step_automation_profile_selected: boolean
          step_chick_age_set: boolean
          step_controller_registered: boolean
          step_farm_created: boolean
          step_relays_tested: boolean
          step_sensors_calibrated: boolean
          step_shed_added: boolean
          step_simulation_passed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          farm_id: string
          hardware_validation_at?: string | null
          hardware_validation_passed?: boolean
          hardware_validation_results?: Json | null
          id?: string
          relay_test_results?: Json | null
          setup_completed?: boolean
          setup_completed_at?: string | null
          simulation_results?: Json | null
          step_automation_profile_selected?: boolean
          step_chick_age_set?: boolean
          step_controller_registered?: boolean
          step_farm_created?: boolean
          step_relays_tested?: boolean
          step_sensors_calibrated?: boolean
          step_shed_added?: boolean
          step_simulation_passed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          farm_id?: string
          hardware_validation_at?: string | null
          hardware_validation_passed?: boolean
          hardware_validation_results?: Json | null
          id?: string
          relay_test_results?: Json | null
          setup_completed?: boolean
          setup_completed_at?: string | null
          simulation_results?: Json | null
          step_automation_profile_selected?: boolean
          step_chick_age_set?: boolean
          step_controller_registered?: boolean
          step_farm_created?: boolean
          step_relays_tested?: boolean
          step_sensors_calibrated?: boolean
          step_shed_added?: boolean
          step_simulation_passed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_setup_status_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: true
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
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
          batch_id: string | null
          consumption_date: string
          created_at: string
          farm_id: string | null
          feed_type: string
          id: string
          notes: string | null
          quantity_kg: number
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          consumption_date?: string
          created_at?: string
          farm_id?: string | null
          feed_type?: string
          id?: string
          notes?: string | null
          quantity_kg?: number
          user_id: string
        }
        Update: {
          batch_id?: string | null
          consumption_date?: string
          created_at?: string
          farm_id?: string | null
          feed_type?: string
          id?: string
          notes?: string | null
          quantity_kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_consumption_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_inventory: {
        Row: {
          created_at: string
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
          feed_type?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          quantity_kg?: number
          supplier?: string | null
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
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
          farm_id: string | null
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
          farm_id?: string | null
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
          farm_id?: string | null
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
            foreignKeyName: "firmware_install_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
      firmware_registry: {
        Row: {
          changelog: string | null
          changelog_bn: string | null
          compatibility_matrix: Json
          crc32_checksum: string | null
          created_at: string
          created_by: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_active: boolean
          max_hardware: Json
          min_hardware: Json
          release_channel: string
          version: string
          version_code: number
        }
        Insert: {
          changelog?: string | null
          changelog_bn?: string | null
          compatibility_matrix?: Json
          crc32_checksum?: string | null
          created_at?: string
          created_by?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          max_hardware?: Json
          min_hardware?: Json
          release_channel?: string
          version: string
          version_code: number
        }
        Update: {
          changelog?: string | null
          changelog_bn?: string | null
          compatibility_matrix?: Json
          crc32_checksum?: string | null
          created_at?: string
          created_by?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          max_hardware?: Json
          min_hardware?: Json
          release_channel?: string
          version?: string
          version_code?: number
        }
        Relationships: []
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
          batch_id: string | null
          breed: string | null
          created_at: string
          farm_id: string | null
          id: string
          purchase_date: string | null
          shed_id: string | null
          total_birds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          age_weeks?: number
          batch_id?: string | null
          breed?: string | null
          created_at?: string
          farm_id?: string | null
          id?: string
          purchase_date?: string | null
          shed_id?: string | null
          total_birds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          age_weeks?: number
          batch_id?: string | null
          breed?: string | null
          created_at?: string
          farm_id?: string | null
          id?: string
          purchase_date?: string | null
          shed_id?: string | null
          total_birds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flock_info_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
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
          batch_id: string | null
          buyer_name: string | null
          category: string
          created_at: string
          description: string | null
          farm_id: string | null
          farm_mode: string
          id: string
          income_date: string
          notes: string | null
          quantity: number | null
          shed_id: string | null
          source: string
          total_amount: number
          unit: string
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          batch_id?: string | null
          buyer_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          farm_id?: string | null
          farm_mode?: string
          id?: string
          income_date?: string
          notes?: string | null
          quantity?: number | null
          shed_id?: string | null
          source?: string
          total_amount?: number
          unit?: string
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          buyer_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          farm_id?: string | null
          farm_mode?: string
          id?: string
          income_date?: string
          notes?: string | null
          quantity?: number | null
          shed_id?: string | null
          source?: string
          total_amount?: number
          unit?: string
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      layer_batch_summary: {
        Row: {
          batch_id: string
          created_at: string
          duration_days: number | null
          farm_id: string | null
          fcr: number | null
          id: string
          mortality_percent: number | null
          net_profit: number | null
          notes: string | null
          peak_age_weeks: number | null
          peak_production_percent: number | null
          total_eggs: number | null
          total_expenses: number | null
          total_feed_cost: number | null
          total_feed_kg: number | null
          total_mortality: number | null
          total_revenue: number | null
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          duration_days?: number | null
          farm_id?: string | null
          fcr?: number | null
          id?: string
          mortality_percent?: number | null
          net_profit?: number | null
          notes?: string | null
          peak_age_weeks?: number | null
          peak_production_percent?: number | null
          total_eggs?: number | null
          total_expenses?: number | null
          total_feed_cost?: number | null
          total_feed_kg?: number | null
          total_mortality?: number | null
          total_revenue?: number | null
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          duration_days?: number | null
          farm_id?: string | null
          fcr?: number | null
          id?: string
          mortality_percent?: number | null
          net_profit?: number | null
          notes?: string | null
          peak_age_weeks?: number | null
          peak_production_percent?: number | null
          total_eggs?: number | null
          total_expenses?: number | null
          total_feed_cost?: number | null
          total_feed_kg?: number | null
          total_mortality?: number | null
          total_revenue?: number | null
          user_id?: string
        }
        Relationships: []
      }
      layer_batches: {
        Row: {
          actual_end_date: string | null
          age_at_start_weeks: number | null
          batch_name: string
          batch_name_bn: string | null
          breed: string | null
          chick_cost_per_bird: number | null
          created_at: string
          current_bird_count: number
          expected_end_date: string | null
          farm_id: string | null
          id: string
          initial_bird_count: number
          notes: string | null
          shed_id: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_end_date?: string | null
          age_at_start_weeks?: number | null
          batch_name?: string
          batch_name_bn?: string | null
          breed?: string | null
          chick_cost_per_bird?: number | null
          created_at?: string
          current_bird_count?: number
          expected_end_date?: string | null
          farm_id?: string | null
          id?: string
          initial_bird_count?: number
          notes?: string | null
          shed_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_end_date?: string | null
          age_at_start_weeks?: number | null
          batch_name?: string
          batch_name_bn?: string | null
          breed?: string | null
          chick_cost_per_bird?: number | null
          created_at?: string
          current_bird_count?: number
          expected_end_date?: string | null
          farm_id?: string | null
          id?: string
          initial_bird_count?: number
          notes?: string | null
          shed_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lighting_schedule: {
        Row: {
          broiler_age_auto: boolean
          broiler_dark_end: string
          broiler_dark_start: string
          end_time: string
          fade_circuits: number
          fade_in_minutes: number
          fade_out_minutes: number
          fade_step_gap_minutes: number
          farm_id: string | null
          flock_type: string
          gradual_enabled: boolean
          id: string
          layer_dark_hours: number
          ldr_daylight_off_lux: number
          ldr_enabled: boolean
          ldr_hysteresis_lux: number
          ldr_mode: string
          ldr_threshold_lux: number
          manual_override: boolean
          max_brightness: number
          min_brightness: number
          start_time: string
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          broiler_age_auto?: boolean
          broiler_dark_end?: string
          broiler_dark_start?: string
          end_time?: string
          fade_circuits?: number
          fade_in_minutes?: number
          fade_out_minutes?: number
          fade_step_gap_minutes?: number
          farm_id?: string | null
          flock_type?: string
          gradual_enabled?: boolean
          id?: string
          layer_dark_hours?: number
          ldr_daylight_off_lux?: number
          ldr_enabled?: boolean
          ldr_hysteresis_lux?: number
          ldr_mode?: string
          ldr_threshold_lux?: number
          manual_override?: boolean
          max_brightness?: number
          min_brightness?: number
          start_time?: string
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          broiler_age_auto?: boolean
          broiler_dark_end?: string
          broiler_dark_start?: string
          end_time?: string
          fade_circuits?: number
          fade_in_minutes?: number
          fade_out_minutes?: number
          fade_step_gap_minutes?: number
          farm_id?: string | null
          flock_type?: string
          gradual_enabled?: boolean
          id?: string
          layer_dark_hours?: number
          ldr_daylight_off_lux?: number
          ldr_enabled?: boolean
          ldr_hysteresis_lux?: number
          ldr_mode?: string
          ldr_threshold_lux?: number
          manual_override?: boolean
          max_brightness?: number
          min_brightness?: number
          start_time?: string
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lighting_schedule_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_inventory: {
        Row: {
          batch_id: string | null
          created_at: string
          expiry_date: string | null
          farm_id: string | null
          farm_mode: string | null
          id: string
          medicine_name: string
          medicine_type: string
          notes: string | null
          purchase_date: string
          quantity: number
          supplier: string | null
          total_cost: number
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          farm_id?: string | null
          farm_mode?: string | null
          id?: string
          medicine_name: string
          medicine_type?: string
          notes?: string | null
          purchase_date?: string
          quantity?: number
          supplier?: string | null
          total_cost?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          expiry_date?: string | null
          farm_id?: string | null
          farm_mode?: string | null
          id?: string
          medicine_name?: string
          medicine_type?: string
          notes?: string | null
          purchase_date?: string
          quantity?: number
          supplier?: string | null
          total_cost?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medicine_usage: {
        Row: {
          batch_id: string | null
          birds_treated: number | null
          created_at: string
          farm_id: string | null
          id: string
          inventory_id: string | null
          medicine_name: string
          medicine_type: string
          notes: string | null
          quantity_used: number
          reason: string | null
          shed_id: string | null
          unit: string
          usage_date: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          birds_treated?: number | null
          created_at?: string
          farm_id?: string | null
          id?: string
          inventory_id?: string | null
          medicine_name: string
          medicine_type?: string
          notes?: string | null
          quantity_used?: number
          reason?: string | null
          shed_id?: string | null
          unit?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          birds_treated?: number | null
          created_at?: string
          farm_id?: string | null
          id?: string
          inventory_id?: string | null
          medicine_name?: string
          medicine_type?: string
          notes?: string | null
          quantity_used?: number
          reason?: string | null
          shed_id?: string | null
          unit?: string
          usage_date?: string
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
          batch_id: string | null
          cause: string
          count: number
          created_at: string
          farm_id: string | null
          farm_mode: string | null
          id: string
          notes: string | null
          record_date: string
          shed_id: string | null
          user_id: string
        }
        Insert: {
          age_weeks?: number | null
          batch_id?: string | null
          cause?: string
          count?: number
          created_at?: string
          farm_id?: string | null
          farm_mode?: string | null
          id?: string
          notes?: string | null
          record_date?: string
          shed_id?: string | null
          user_id: string
        }
        Update: {
          age_weeks?: number | null
          batch_id?: string | null
          cause?: string
          count?: number
          created_at?: string
          farm_id?: string | null
          farm_mode?: string | null
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
      notification_delivery_log: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_id: string | null
          body: string | null
          channel: string
          created_at: string
          emergency_event_id: string | null
          error_message: string | null
          escalated_to: string | null
          farm_id: string | null
          id: string
          is_escalated: boolean | null
          max_repeats: number | null
          next_repeat_at: string | null
          priority: string
          repeat_count: number | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_id?: string | null
          body?: string | null
          channel: string
          created_at?: string
          emergency_event_id?: string | null
          error_message?: string | null
          escalated_to?: string | null
          farm_id?: string | null
          id?: string
          is_escalated?: boolean | null
          max_repeats?: number | null
          next_repeat_at?: string | null
          priority?: string
          repeat_count?: number | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_id?: string | null
          body?: string | null
          channel?: string
          created_at?: string
          emergency_event_id?: string | null
          error_message?: string | null
          escalated_to?: string | null
          farm_id?: string | null
          id?: string
          is_escalated?: boolean | null
          max_repeats?: number | null
          next_repeat_at?: string | null
          priority?: string
          repeat_count?: number | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_emergency_event_id_fkey"
            columns: ["emergency_event_id"]
            isOneToOne: false
            referencedRelation: "emergency_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_log_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_escalation_config: {
        Row: {
          created_at: string
          critical_push: boolean | null
          critical_repeat_minutes: number | null
          critical_sms: boolean | null
          critical_sound: boolean | null
          critical_webhook: boolean | null
          escalation_cooldown_minutes: number | null
          escalation_enabled: boolean | null
          farm_id: string | null
          id: string
          ignored_critical_threshold: number | null
          important_push: boolean | null
          important_sms: boolean | null
          important_sound: boolean | null
          normal_push: boolean | null
          normal_sms: boolean | null
          normal_sound: boolean | null
          secondary_phone: string | null
          secondary_phone_label: string | null
          updated_at: string
          urgent_push: boolean | null
          urgent_repeat_minutes: number | null
          urgent_sms: boolean | null
          urgent_sound: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          critical_push?: boolean | null
          critical_repeat_minutes?: number | null
          critical_sms?: boolean | null
          critical_sound?: boolean | null
          critical_webhook?: boolean | null
          escalation_cooldown_minutes?: number | null
          escalation_enabled?: boolean | null
          farm_id?: string | null
          id?: string
          ignored_critical_threshold?: number | null
          important_push?: boolean | null
          important_sms?: boolean | null
          important_sound?: boolean | null
          normal_push?: boolean | null
          normal_sms?: boolean | null
          normal_sound?: boolean | null
          secondary_phone?: string | null
          secondary_phone_label?: string | null
          updated_at?: string
          urgent_push?: boolean | null
          urgent_repeat_minutes?: number | null
          urgent_sms?: boolean | null
          urgent_sound?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          critical_push?: boolean | null
          critical_repeat_minutes?: number | null
          critical_sms?: boolean | null
          critical_sound?: boolean | null
          critical_webhook?: boolean | null
          escalation_cooldown_minutes?: number | null
          escalation_enabled?: boolean | null
          farm_id?: string | null
          id?: string
          ignored_critical_threshold?: number | null
          important_push?: boolean | null
          important_sms?: boolean | null
          important_sound?: boolean | null
          normal_push?: boolean | null
          normal_sms?: boolean | null
          normal_sound?: boolean | null
          secondary_phone?: string | null
          secondary_phone_label?: string | null
          updated_at?: string
          urgent_push?: boolean | null
          urgent_repeat_minutes?: number | null
          urgent_sms?: boolean | null
          urgent_sound?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_escalation_config_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_escalation_tracker: {
        Row: {
          created_at: string
          escalated_at: string | null
          escalation_resolved_at: string | null
          farm_id: string | null
          id: string
          ignored_critical_count: number | null
          is_escalated: boolean | null
          last_ignored_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          escalated_at?: string | null
          escalation_resolved_at?: string | null
          farm_id?: string | null
          id?: string
          ignored_critical_count?: number | null
          is_escalated?: boolean | null
          last_ignored_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          escalated_at?: string | null
          escalation_resolved_at?: string | null
          farm_id?: string | null
          id?: string
          ignored_critical_count?: number | null
          is_escalated?: boolean | null
          last_ignored_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_escalation_tracker_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
      safety_engine_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          enabled: boolean
          farm_id: string
          id: string
          note: string | null
          previous_enabled: boolean | null
          source: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          enabled: boolean
          farm_id: string
          id?: string
          note?: string | null
          previous_enabled?: boolean | null
          source?: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          enabled?: boolean
          farm_id?: string
          id?: string
          note?: string | null
          previous_enabled?: boolean | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_engine_audit_log_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_status: {
        Row: {
          actuator_effect_failure: boolean | null
          actuator_fail_reason: string | null
          age_rejection_reason: string | null
          age_valid: boolean | null
          airflow_consecutive_failures: number
          airflow_fail_reason: string | null
          airflow_ineffective: boolean
          airflow_last_verified_at: string | null
          airflow_verified: boolean
          created_at: string
          current_temp_rate: number
          emergency_active: boolean
          emergency_priority: string | null
          farm_id: string | null
          force_ventilation: boolean
          heater_allowed: boolean
          heater_authority_percent: number
          heater_blocked_reason: string | null
          heater_runtime_ms: number
          hsi_fan_activated: boolean
          hsi_level: string | null
          hsi_value: number | null
          id: string
          last_updated_by: string
          locked_relays: string[]
          mandatory_fan_pulse_active: boolean
          min_vent_duty_required: boolean
          motor_runtime_ms: number
          override_active: boolean
          override_out_of_bio_range: boolean
          override_reason: string | null
          override_remaining_seconds: number | null
          plausibility_degraded: boolean
          plausibility_reason: string | null
          rapid_temp_rise_detected: boolean
          reboot_heater_locked: boolean | null
          reboot_nh3_muted: boolean | null
          reboot_vent_purge: boolean | null
          relay_violations: number
          safe_mode_active: boolean
          safe_mode_until: string | null
          sensor_drift_detected: boolean
          sensor_drift_reason: string | null
          sensor_issues: Json
          sensor_state: Json
          shed_id: string | null
          sprinkler_block_reason: string | null
          sprinkler_safety_blocked: boolean | null
          stuck_relay_detected: string | null
          survival_fan_on: boolean
          survival_heater_on: boolean
          survival_mode: boolean
          system_state: string
          thermal_model_invalid: boolean | null
          thermal_model_reason: string | null
          updated_at: string
          user_id: string
          worst_case_max_temp: number | null
          worst_case_min_temp: number | null
        }
        Insert: {
          actuator_effect_failure?: boolean | null
          actuator_fail_reason?: string | null
          age_rejection_reason?: string | null
          age_valid?: boolean | null
          airflow_consecutive_failures?: number
          airflow_fail_reason?: string | null
          airflow_ineffective?: boolean
          airflow_last_verified_at?: string | null
          airflow_verified?: boolean
          created_at?: string
          current_temp_rate?: number
          emergency_active?: boolean
          emergency_priority?: string | null
          farm_id?: string | null
          force_ventilation?: boolean
          heater_allowed?: boolean
          heater_authority_percent?: number
          heater_blocked_reason?: string | null
          heater_runtime_ms?: number
          hsi_fan_activated?: boolean
          hsi_level?: string | null
          hsi_value?: number | null
          id?: string
          last_updated_by?: string
          locked_relays?: string[]
          mandatory_fan_pulse_active?: boolean
          min_vent_duty_required?: boolean
          motor_runtime_ms?: number
          override_active?: boolean
          override_out_of_bio_range?: boolean
          override_reason?: string | null
          override_remaining_seconds?: number | null
          plausibility_degraded?: boolean
          plausibility_reason?: string | null
          rapid_temp_rise_detected?: boolean
          reboot_heater_locked?: boolean | null
          reboot_nh3_muted?: boolean | null
          reboot_vent_purge?: boolean | null
          relay_violations?: number
          safe_mode_active?: boolean
          safe_mode_until?: string | null
          sensor_drift_detected?: boolean
          sensor_drift_reason?: string | null
          sensor_issues?: Json
          sensor_state?: Json
          shed_id?: string | null
          sprinkler_block_reason?: string | null
          sprinkler_safety_blocked?: boolean | null
          stuck_relay_detected?: string | null
          survival_fan_on?: boolean
          survival_heater_on?: boolean
          survival_mode?: boolean
          system_state?: string
          thermal_model_invalid?: boolean | null
          thermal_model_reason?: string | null
          updated_at?: string
          user_id: string
          worst_case_max_temp?: number | null
          worst_case_min_temp?: number | null
        }
        Update: {
          actuator_effect_failure?: boolean | null
          actuator_fail_reason?: string | null
          age_rejection_reason?: string | null
          age_valid?: boolean | null
          airflow_consecutive_failures?: number
          airflow_fail_reason?: string | null
          airflow_ineffective?: boolean
          airflow_last_verified_at?: string | null
          airflow_verified?: boolean
          created_at?: string
          current_temp_rate?: number
          emergency_active?: boolean
          emergency_priority?: string | null
          farm_id?: string | null
          force_ventilation?: boolean
          heater_allowed?: boolean
          heater_authority_percent?: number
          heater_blocked_reason?: string | null
          heater_runtime_ms?: number
          hsi_fan_activated?: boolean
          hsi_level?: string | null
          hsi_value?: number | null
          id?: string
          last_updated_by?: string
          locked_relays?: string[]
          mandatory_fan_pulse_active?: boolean
          min_vent_duty_required?: boolean
          motor_runtime_ms?: number
          override_active?: boolean
          override_out_of_bio_range?: boolean
          override_reason?: string | null
          override_remaining_seconds?: number | null
          plausibility_degraded?: boolean
          plausibility_reason?: string | null
          rapid_temp_rise_detected?: boolean
          reboot_heater_locked?: boolean | null
          reboot_nh3_muted?: boolean | null
          reboot_vent_purge?: boolean | null
          relay_violations?: number
          safe_mode_active?: boolean
          safe_mode_until?: string | null
          sensor_drift_detected?: boolean
          sensor_drift_reason?: string | null
          sensor_issues?: Json
          sensor_state?: Json
          shed_id?: string | null
          sprinkler_block_reason?: string | null
          sprinkler_safety_blocked?: boolean | null
          stuck_relay_detected?: string | null
          survival_fan_on?: boolean
          survival_heater_on?: boolean
          survival_mode?: boolean
          system_state?: string
          thermal_model_invalid?: boolean | null
          thermal_model_reason?: string | null
          updated_at?: string
          user_id?: string
          worst_case_max_temp?: number | null
          worst_case_min_temp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_status_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_status_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_timeline: {
        Row: {
          actual_alarm: boolean
          actual_ceiling_fan: boolean
          actual_circulation_fan: boolean
          actual_fan: boolean
          actual_fan_speed: string | null
          actual_fogger: boolean
          actual_heater: boolean
          actual_sprinkler: boolean
          ammonia: number | null
          event_detail: string | null
          event_type: string
          fan_effect_failures: number | null
          fan_effect_verified: boolean | null
          farm_id: string | null
          force_ventilation: boolean | null
          heater_allowed: boolean | null
          heater_blocked_reason: string | null
          heater_effect_failures: number | null
          heater_effect_verified: boolean | null
          hsi_value: number | null
          humidity: number | null
          humidity_delta_1min: number | null
          id: string
          manual_override_active: boolean | null
          mismatch_details: string | null
          override_target_temp: number | null
          reboot_heater_locked: boolean | null
          reboot_nh3_muted: boolean | null
          reboot_vent_purge: boolean | null
          recorded_at: string
          relay_mismatch: boolean
          requested_alarm: boolean
          requested_ceiling_fan: boolean
          requested_circulation_fan: boolean
          requested_fan: boolean
          requested_fan_speed: string | null
          requested_fogger: boolean
          requested_heater: boolean
          requested_sprinkler: boolean
          safety_override_active: boolean | null
          safety_override_reason: string | null
          shed_id: string | null
          source: string
          system_state: string
          temp_delta_1min: number | null
          temp_delta_5min: number | null
          temperature: number | null
          temperature2: number | null
          thermal_model_deviation: number | null
          thermal_model_plausible: boolean | null
          uptime_ms: number | null
          user_id: string
          water_usage: number | null
          worst_case_max_temp: number | null
          worst_case_min_temp: number | null
        }
        Insert: {
          actual_alarm?: boolean
          actual_ceiling_fan?: boolean
          actual_circulation_fan?: boolean
          actual_fan?: boolean
          actual_fan_speed?: string | null
          actual_fogger?: boolean
          actual_heater?: boolean
          actual_sprinkler?: boolean
          ammonia?: number | null
          event_detail?: string | null
          event_type?: string
          fan_effect_failures?: number | null
          fan_effect_verified?: boolean | null
          farm_id?: string | null
          force_ventilation?: boolean | null
          heater_allowed?: boolean | null
          heater_blocked_reason?: string | null
          heater_effect_failures?: number | null
          heater_effect_verified?: boolean | null
          hsi_value?: number | null
          humidity?: number | null
          humidity_delta_1min?: number | null
          id?: string
          manual_override_active?: boolean | null
          mismatch_details?: string | null
          override_target_temp?: number | null
          reboot_heater_locked?: boolean | null
          reboot_nh3_muted?: boolean | null
          reboot_vent_purge?: boolean | null
          recorded_at?: string
          relay_mismatch?: boolean
          requested_alarm?: boolean
          requested_ceiling_fan?: boolean
          requested_circulation_fan?: boolean
          requested_fan?: boolean
          requested_fan_speed?: string | null
          requested_fogger?: boolean
          requested_heater?: boolean
          requested_sprinkler?: boolean
          safety_override_active?: boolean | null
          safety_override_reason?: string | null
          shed_id?: string | null
          source?: string
          system_state?: string
          temp_delta_1min?: number | null
          temp_delta_5min?: number | null
          temperature?: number | null
          temperature2?: number | null
          thermal_model_deviation?: number | null
          thermal_model_plausible?: boolean | null
          uptime_ms?: number | null
          user_id: string
          water_usage?: number | null
          worst_case_max_temp?: number | null
          worst_case_min_temp?: number | null
        }
        Update: {
          actual_alarm?: boolean
          actual_ceiling_fan?: boolean
          actual_circulation_fan?: boolean
          actual_fan?: boolean
          actual_fan_speed?: string | null
          actual_fogger?: boolean
          actual_heater?: boolean
          actual_sprinkler?: boolean
          ammonia?: number | null
          event_detail?: string | null
          event_type?: string
          fan_effect_failures?: number | null
          fan_effect_verified?: boolean | null
          farm_id?: string | null
          force_ventilation?: boolean | null
          heater_allowed?: boolean | null
          heater_blocked_reason?: string | null
          heater_effect_failures?: number | null
          heater_effect_verified?: boolean | null
          hsi_value?: number | null
          humidity?: number | null
          humidity_delta_1min?: number | null
          id?: string
          manual_override_active?: boolean | null
          mismatch_details?: string | null
          override_target_temp?: number | null
          reboot_heater_locked?: boolean | null
          reboot_nh3_muted?: boolean | null
          reboot_vent_purge?: boolean | null
          recorded_at?: string
          relay_mismatch?: boolean
          requested_alarm?: boolean
          requested_ceiling_fan?: boolean
          requested_circulation_fan?: boolean
          requested_fan?: boolean
          requested_fan_speed?: string | null
          requested_fogger?: boolean
          requested_heater?: boolean
          requested_sprinkler?: boolean
          safety_override_active?: boolean | null
          safety_override_reason?: string | null
          shed_id?: string | null
          source?: string
          system_state?: string
          temp_delta_1min?: number | null
          temp_delta_5min?: number | null
          temperature?: number | null
          temperature2?: number | null
          thermal_model_deviation?: number | null
          thermal_model_plausible?: boolean | null
          uptime_ms?: number | null
          user_id?: string
          water_usage?: number | null
          worst_case_max_temp?: number | null
          worst_case_min_temp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_timeline_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_timeline_shed_id_fkey"
            columns: ["shed_id"]
            isOneToOne: false
            referencedRelation: "sheds"
            referencedColumns: ["id"]
          },
        ]
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
      security_audit_log: {
        Row: {
          created_at: string
          details: Json | null
          device_token_id: string | null
          event_type: string
          farm_id: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          device_token_id?: string | null
          event_type: string
          farm_id?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          device_token_id?: string | null
          event_type?: string
          farm_id?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          light_lux: number | null
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
          light_lux?: number | null
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
          light_lux?: number | null
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
          farm_id: string | null
          farm_owner_id: string
          id: string
          invite_code: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          farm_id?: string | null
          farm_owner_id: string
          id?: string
          invite_code: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          farm_id?: string | null
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
      edge_function_stats_1h: {
        Row: {
          error_4xx: number | null
          error_5xx: number | null
          function_name: string | null
          max_ms: number | null
          p50_ms: number | null
          p95_ms: number | null
          p99_ms: number | null
          rate_limited: number | null
          request_count: number | null
          unauthorized: number | null
        }
        Relationships: []
      }
      edge_function_stats_24h: {
        Row: {
          error_4xx: number | null
          error_5xx: number | null
          function_name: string | null
          p95_ms: number | null
          request_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_sensor_batch: {
        Args: {
          _device_token_id: string
          _farm_id: string
          _readings: Json
          _shed_id: string
          _user_id: string
        }
        Returns: Json
      }
      acknowledge_alert: { Args: { _alert_id: string }; Returns: boolean }
      assign_user_role: {
        Args: {
          _assigner_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      audit_tenant_isolation: { Args: never; Returns: Json }
      can_access_farm: {
        Args: { _owner_id: string; _user_id: string }
        Returns: boolean
      }
      check_firmware_compatibility: {
        Args: { _device_token_id: string; _firmware_id: string }
        Returns: Json
      }
      cleanup_device_health_metrics: { Args: never; Returns: undefined }
      cleanup_device_security_artifacts: { Args: never; Returns: undefined }
      cleanup_edge_request_log: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_restart_logs: { Args: never; Returns: undefined }
      cleanup_old_security_audit: { Args: never; Returns: undefined }
      cleanup_worker_farm: { Args: { _farm_owner_id: string }; Returns: Json }
      consume_device_nonce: {
        Args: { _device_token_id: string; _nonce: string }
        Returns: boolean
      }
      evaluate_alert_rules: { Args: { _farm_id: string }; Returns: number }
      get_device_secret: {
        Args: { _device_token_id: string }
        Returns: {
          device_secret: string
          previous_device_secret: string
          previous_expires: string
          secret_version: number
        }[]
      }
      get_farm_owner_id: { Args: { _user_id: string }; Returns: string }
      get_feed_avg_price: {
        Args: { _farm_id: string; _feed_type: string }
        Returns: number
      }
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
      log_security_event: {
        Args: {
          _details?: Json
          _device_token_id?: string
          _event_type: string
          _farm_id?: string
          _success?: boolean
          _user_id?: string
        }
        Returns: undefined
      }
      record_device_metric: {
        Args: {
          _device_token_id: string
          _farm_id: string
          _is_error?: boolean
          _is_nonce_reuse?: boolean
          _is_rate_limited?: boolean
          _is_restart?: boolean
          _is_signature_failure?: boolean
          _latency_ms: number
          _sensor_gap_seconds?: number
        }
        Returns: undefined
      }
      record_edge_request: {
        Args: {
          _device_token_id?: string
          _duration_ms: number
          _error_code?: string
          _error_message?: string
          _farm_id?: string
          _function_name: string
          _method: string
          _path: string
          _payload_size_bytes?: number
          _request_id?: string
          _response_size_bytes?: number
          _status_code: number
          _user_id?: string
        }
        Returns: undefined
      }
      redeem_invitation: { Args: { _code: string }; Returns: Json }
      user_can_access_farm: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
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
        | "manager"
        | "technician"
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
      app_role: [
        "owner",
        "worker",
        "super_admin",
        "viewer",
        "farmer",
        "admin",
        "manager",
        "technician",
      ],
      device_mode: ["AUTO", "MANUAL", "FAIL_SAFE", "OFFLINE"],
      device_type: ["fan", "light", "alarm"],
      operator_type: [">", "<", ">=", "<="],
      sensor_type: ["temperature", "humidity", "ammonia"],
    },
  },
} as const
