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
          battery_percentage: number | null
          cpu_temperature: number | null
          created_at: string
          device_token_id: string
          error_count: number | null
          firmware_version: string | null
          free_memory_bytes: number | null
          id: string
          is_online: boolean | null
          last_error_message: string | null
          last_restart_at: string | null
          last_seen_at: string | null
          power_source: string | null
          shed_id: string | null
          updated_at: string
          uptime_seconds: number | null
          user_id: string
          wifi_signal_strength: number | null
        }
        Insert: {
          battery_percentage?: number | null
          cpu_temperature?: number | null
          created_at?: string
          device_token_id: string
          error_count?: number | null
          firmware_version?: string | null
          free_memory_bytes?: number | null
          id?: string
          is_online?: boolean | null
          last_error_message?: string | null
          last_restart_at?: string | null
          last_seen_at?: string | null
          power_source?: string | null
          shed_id?: string | null
          updated_at?: string
          uptime_seconds?: number | null
          user_id: string
          wifi_signal_strength?: number | null
        }
        Update: {
          battery_percentage?: number | null
          cpu_temperature?: number | null
          created_at?: string
          device_token_id?: string
          error_count?: number | null
          firmware_version?: string | null
          free_memory_bytes?: number | null
          id?: string
          is_online?: boolean | null
          last_error_message?: string | null
          last_restart_at?: string | null
          last_seen_at?: string | null
          power_source?: string | null
          shed_id?: string | null
          updated_at?: string
          uptime_seconds?: number | null
          user_id?: string
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
          fan_on: boolean
          fan_speed: string
          id: string
          light_on: boolean
          manual_override: boolean
          power_on: boolean
          shed_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alarm_on?: boolean
          fan_on?: boolean
          fan_speed?: string
          id?: string
          light_on?: boolean
          manual_override?: boolean
          power_on?: boolean
          shed_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alarm_on?: boolean
          fan_on?: boolean
          fan_speed?: string
          id?: string
          light_on?: boolean
          manual_override?: boolean
          power_on?: boolean
          shed_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          id: string
          manual_override: boolean
          start_time: string
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          end_time?: string
          id?: string
          manual_override?: boolean
          start_time?: string
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          end_time?: string
          id?: string
          manual_override?: boolean
          start_time?: string
          total_hours?: number
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
      profiles: {
        Row: {
          created_at: string
          farm_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
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
      sensor_logs: {
        Row: {
          ammonia: number
          device_id: string
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
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_severity: "warning" | "danger"
      alert_type: "temperature" | "ammonia" | "power" | "water"
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
      alert_severity: ["warning", "danger"],
      alert_type: ["temperature", "ammonia", "power", "water"],
      device_type: ["fan", "light", "alarm"],
      operator_type: [">", "<", ">=", "<="],
      sensor_type: ["temperature", "humidity", "ammonia"],
    },
  },
} as const
