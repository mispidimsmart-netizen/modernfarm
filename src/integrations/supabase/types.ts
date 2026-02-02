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
          user_id?: string
        }
        Relationships: []
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
      device_status: {
        Row: {
          alarm_on: boolean
          fan_on: boolean
          id: string
          light_on: boolean
          manual_override: boolean
          power_on: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alarm_on?: boolean
          fan_on?: boolean
          id?: string
          light_on?: boolean
          manual_override?: boolean
          power_on?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alarm_on?: boolean
          fan_on?: boolean
          id?: string
          light_on?: boolean
          manual_override?: boolean
          power_on?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          device_name: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      farm_settings: {
        Row: {
          ammonia_max: number
          created_at: string
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
      sensor_readings: {
        Row: {
          ammonia: number
          humidity: number
          id: string
          recorded_at: string
          temperature: number
          user_id: string
          water_usage: number
        }
        Insert: {
          ammonia: number
          humidity: number
          id?: string
          recorded_at?: string
          temperature: number
          user_id: string
          water_usage: number
        }
        Update: {
          ammonia?: number
          humidity?: number
          id?: string
          recorded_at?: string
          temperature?: number
          user_id?: string
          water_usage?: number
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
