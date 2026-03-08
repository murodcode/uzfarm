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
      admin_transactions: {
        Row: {
          action_type: string
          admin_id: string
          amount: number | null
          created_at: string
          field: string | null
          id: string
          new_value: number | null
          old_value: number | null
          target_user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          amount?: number | null
          created_at?: string
          field?: string | null
          id?: string
          new_value?: number | null
          old_value?: number | null
          target_user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          amount?: number | null
          created_at?: string
          field?: string | null
          id?: string
          new_value?: number | null
          old_value?: number | null
          target_user_id?: string
        }
        Relationships: []
      }
      animals: {
        Row: {
          bought_at: string
          feed_count: number
          grown_at: string | null
          growth_percent: number
          hunger: number
          id: string
          last_collected_at: string
          last_fed_at: string
          type_id: string
          user_id: string
        }
        Insert: {
          bought_at?: string
          feed_count?: number
          grown_at?: string | null
          growth_percent?: number
          hunger?: number
          id?: string
          last_collected_at?: string
          last_fed_at?: string
          type_id: string
          user_id: string
        }
        Update: {
          bought_at?: string
          feed_count?: number
          grown_at?: string | null
          growth_percent?: number
          hunger?: number
          id?: string
          last_collected_at?: string
          last_fed_at?: string
          type_id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      chat_bans: {
        Row: {
          banned_by: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          is_read: boolean
          message: string
          sender: string
          telegram_id: number | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_read?: boolean
          message: string
          sender?: string
          telegram_id?: number | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_read?: boolean
          message?: string
          sender?: string
          telegram_id?: number | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      daily_task_progress: {
        Row: {
          created_at: string
          id: string
          progress: number
          reward_claimed: boolean
          reward_coins: number
          target: number
          task_date: string
          task_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          progress?: number
          reward_claimed?: boolean
          reward_coins?: number
          target?: number
          task_date?: string
          task_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          progress?: number
          reward_claimed?: boolean
          reward_coins?: number
          target?: number
          task_date?: string
          task_key?: string
          user_id?: string
        }
        Relationships: []
      }
      game_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          is_daily: boolean
          name: string
          requirement_type: string
          requirement_value: number
          reward_cash: number
          reward_coins: number
          task_type: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_daily?: boolean
          name: string
          requirement_type: string
          requirement_value?: number
          reward_cash?: number
          reward_coins?: number
          task_type?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_daily?: boolean
          name?: string
          requirement_type?: string
          requirement_value?: number
          reward_cash?: number
          reward_coins?: number
          task_type?: string
          url?: string | null
        }
        Relationships: []
      }
      general_chat_messages: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          message: string
          photo_url: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          message: string
          photo_url?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          message?: string
          photo_url?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          button_text: string | null
          button_url: string | null
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          message: string
          title: string
        }
        Insert: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          message: string
          title: string
        }
        Update: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          message?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ad_views: number
          cash: number
          coins: number
          created_at: string
          eggs: number
          exp: number
          first_name: string | null
          id: string
          is_blocked: boolean
          level: number
          meat: number
          milk: number
          photo_url: string | null
          referral_count: number
          referral_earnings: number
          referral_level: number
          referred_by: string | null
          telegram_id: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          ad_views?: number
          cash?: number
          coins?: number
          created_at?: string
          eggs?: number
          exp?: number
          first_name?: string | null
          id: string
          is_blocked?: boolean
          level?: number
          meat?: number
          milk?: number
          photo_url?: string | null
          referral_count?: number
          referral_earnings?: number
          referral_level?: number
          referred_by?: string | null
          telegram_id?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          ad_views?: number
          cash?: number
          coins?: number
          created_at?: string
          eggs?: number
          exp?: number
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          level?: number
          meat?: number
          milk?: number
          photo_url?: string | null
          referral_count?: number
          referral_earnings?: number
          referral_level?: number
          referred_by?: string | null
          telegram_id?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      referral_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          percent: number
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          percent?: number
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          percent?: number
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      user_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_task_completions: {
        Row: {
          completed_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "game_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount: number
          card_number: string | null
          id: string
          processed_at: string | null
          referrals_consumed: number
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          card_number?: string | null
          id?: string
          processed_at?: string | null
          referrals_consumed?: number
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_number?: string | null
          id?: string
          processed_at?: string | null
          referrals_consumed?: number
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_global_stats: { Args: never; Returns: Json }
      get_user_rank: {
        Args: { p_column: string; p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
