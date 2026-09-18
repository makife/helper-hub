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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      credentials: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          kind: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed_at: string | null
          avatar_url: string | null
          bio: string | null
          cancel_count: number | null
          created_at: string
          credits: number | null
          custom_owned_tools: string[]
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          id_verification_note: string | null
          id_verification_status: string
          id_verified_at: string | null
          id_verify_attempts: number
          id_verify_last_attempt_at: string | null
          is_available: boolean | null
          is_banned: boolean | null
          language: string
          latitude: number | null
          longitude: number | null
          no_show_count: number
          notify_messages: boolean
          notify_offers: boolean
          notify_task_updates: boolean
          owned_tools: string[]
          phone: string | null
          profession: string | null
          rating: number | null
          referral_code: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          skill_tags: string[]
          skills: Database["public"]["Enums"]["task_category"][] | null
          suspended_until: string | null
          total_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_confirmed_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          cancel_count?: number | null
          created_at?: string
          credits?: number | null
          custom_owned_tools?: string[]
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id?: string
          id_verification_note?: string | null
          id_verification_status?: string
          id_verified_at?: string | null
          id_verify_attempts?: number
          id_verify_last_attempt_at?: string | null
          is_available?: boolean | null
          is_banned?: boolean | null
          language?: string
          latitude?: number | null
          longitude?: number | null
          no_show_count?: number
          notify_messages?: boolean
          notify_offers?: boolean
          notify_task_updates?: boolean
          owned_tools?: string[]
          phone?: string | null
          profession?: string | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skill_tags?: string[]
          skills?: Database["public"]["Enums"]["task_category"][] | null
          suspended_until?: string | null
          total_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_confirmed_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          cancel_count?: number | null
          created_at?: string
          credits?: number | null
          custom_owned_tools?: string[]
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          id_verification_note?: string | null
          id_verification_status?: string
          id_verified_at?: string | null
          id_verify_attempts?: number
          id_verify_last_attempt_at?: string | null
          is_available?: boolean | null
          is_banned?: boolean | null
          language?: string
          latitude?: number | null
          longitude?: number | null
          no_show_count?: number
          notify_messages?: boolean
          notify_offers?: boolean
          notify_task_updates?: boolean
          owned_tools?: string[]
          phone?: string | null
          profession?: string | null
          rating?: number | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skill_tags?: string[]
          skills?: Database["public"]["Enums"]["task_category"][] | null
          suspended_until?: string | null
          total_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      push_config: {
        Row: {
          function_url: string
          hook_secret: string
          id: boolean
        }
        Insert: {
          function_url: string
          hook_secret: string
          id?: boolean
        }
        Update: {
          function_url?: string
          hook_secret?: string
          id?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          task_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          task_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      store_purchases: {
        Row: {
          created_at: string
          credits: number
          currency: string | null
          event_id: string
          event_type: string
          id: string
          price: number | null
          product_id: string
          raw: Json | null
          store: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          currency?: string | null
          event_id: string
          event_type: string
          id?: string
          price?: number | null
          product_id: string
          raw?: Json | null
          store?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          currency?: string | null
          event_id?: string
          event_type?: string
          id?: string
          price?: number | null
          product_id?: string
          raw?: Json | null
          store?: string | null
          user_id?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          agreed_price: number | null
          arrival_distance_m: number | null
          arrived_at: string | null
          created_at: string
          id: string
          status: string
          task_id: string
          tasker_id: string
          updated_at: string
        }
        Insert: {
          agreed_price?: number | null
          arrival_distance_m?: number | null
          arrived_at?: string | null
          created_at?: string
          id?: string
          status?: string
          task_id: string
          tasker_id: string
          updated_at?: string
        }
        Update: {
          agreed_price?: number | null
          arrival_distance_m?: number | null
          arrived_at?: string | null
          created_at?: string
          id?: string
          status?: string
          task_id?: string
          tasker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_offers: {
        Row: {
          amount: number
          created_at: string
          id: string
          message: string | null
          responded_at: string | null
          status: string
          task_id: string
          tasker_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          task_id: string
          tasker_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          task_id?: string
          tasker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_offers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_views: {
        Row: {
          id: string
          task_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          task_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          task_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_views_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          address_note: string | null
          cancelled_at: string | null
          category: Database["public"]["Enums"]["task_category"]
          completed_at: string | null
          completion_requested_at: string | null
          completion_requested_by: string | null
          created_at: string
          currency: string
          current_price: number | null
          custom_tools: string[]
          description: string
          dispute_reason: string | null
          disputed_at: string | null
          estimated_minutes: number
          expires_at: string | null
          id: string
          is_demo: boolean | null
          last_rejected_at: string | null
          latitude: number
          longitude: number
          matched_at: string | null
          min_price: number | null
          needs_tools: boolean
          noshow_reminder_sent_at: string | null
          noshow_warning_sent_at: string | null
          owner_id: string
          person_count: number
          photo_urls: string[] | null
          price: number
          price_drop_started_at: string | null
          rejection_count: number
          reminder_sent_at: string | null
          required_tools: string[]
          scheduled_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          subcategory: string | null
          tasker_id: string | null
          title: string
          tool_provider: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["task_urgency"]
          urgent_push_sent: boolean
          wait_deadline: string | null
          wait_decided: boolean
          wait_minutes: number | null
          wait_reminder_sent_at: string | null
        }
        Insert: {
          address_note?: string | null
          cancelled_at?: string | null
          category: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          completion_requested_at?: string | null
          completion_requested_by?: string | null
          created_at?: string
          currency?: string
          current_price?: number | null
          custom_tools?: string[]
          description: string
          dispute_reason?: string | null
          disputed_at?: string | null
          estimated_minutes?: number
          expires_at?: string | null
          id?: string
          is_demo?: boolean | null
          last_rejected_at?: string | null
          latitude: number
          longitude: number
          matched_at?: string | null
          min_price?: number | null
          needs_tools?: boolean
          noshow_reminder_sent_at?: string | null
          noshow_warning_sent_at?: string | null
          owner_id: string
          person_count?: number
          photo_urls?: string[] | null
          price: number
          price_drop_started_at?: string | null
          rejection_count?: number
          reminder_sent_at?: string | null
          required_tools?: string[]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          subcategory?: string | null
          tasker_id?: string | null
          title: string
          tool_provider?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["task_urgency"]
          urgent_push_sent?: boolean
          wait_deadline?: string | null
          wait_decided?: boolean
          wait_minutes?: number | null
          wait_reminder_sent_at?: string | null
        }
        Update: {
          address_note?: string | null
          cancelled_at?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          completed_at?: string | null
          completion_requested_at?: string | null
          completion_requested_by?: string | null
          created_at?: string
          currency?: string
          current_price?: number | null
          custom_tools?: string[]
          description?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          estimated_minutes?: number
          expires_at?: string | null
          id?: string
          is_demo?: boolean | null
          last_rejected_at?: string | null
          latitude?: number
          longitude?: number
          matched_at?: string | null
          min_price?: number | null
          needs_tools?: boolean
          noshow_reminder_sent_at?: string | null
          noshow_warning_sent_at?: string | null
          owner_id?: string
          person_count?: number
          photo_urls?: string[] | null
          price?: number
          price_drop_started_at?: string | null
          rejection_count?: number
          reminder_sent_at?: string | null
          required_tools?: string[]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          subcategory?: string | null
          tasker_id?: string | null
          title?: string
          tool_provider?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["task_urgency"]
          urgent_push_sent?: boolean
          wait_deadline?: string | null
          wait_decided?: boolean
          wait_minutes?: number | null
          wait_reminder_sent_at?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: string
          task_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          status?: string
          task_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      verification_requests: {
        Row: {
          attempts: number
          created_at: string
          file_path: string | null
          id: string
          kind: string
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          file_path?: string | null
          id?: string
          kind: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
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
      _settle_unfilled_task: {
        Args: { p_action: string; p_auto: boolean; p_task_id: string }
        Returns: undefined
      }
      admin_apply_sanction: {
        Args: { p_action: string; p_report_id: string }
        Returns: string
      }
      cancel_task: { Args: { _task_id: string }; Returns: boolean }
      cancel_unfilled_task: { Args: { p_task_id: string }; Returns: undefined }
      charge_employer_credit: {
        Args: { p_description: string; p_owner_id: string; p_task_id: string }
        Returns: undefined
      }
      compute_task_current_price: {
        Args: { _task_id: string }
        Returns: number
      }
      confirm_accepted_offer: { Args: { _offer_id: string }; Returns: string }
      confirm_task_completion: { Args: { _task_id: string }; Returns: boolean }
      dispatch_push: {
        Args: { _body: string; _path: string; _title: string; _user_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_user_language: { Args: { _user_id: string }; Returns: string }
      grant_store_credits: {
        Args: {
          _credits: number
          _currency: string
          _event_id: string
          _event_type: string
          _price: number
          _product_id: string
          _raw: Json
          _store: string
          _user_id: string
        }
        Returns: string
      }
      has_pending_reviews: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_arrival: {
        Args: { _lat: number; _lng: number; _task_id: string }
        Returns: boolean
      }
      nearby_helper_ids: {
        Args: {
          _exclude_user_id: string
          _lat: number
          _lng: number
          _radius_m: number
        }
        Returns: {
          user_id: string
        }[]
      }
      process_no_show_tasks: { Args: never; Returns: undefined }
      process_offer_confirm_deadlines: { Args: never; Returns: undefined }
      process_task_lifecycle: { Args: never; Returns: undefined }
      process_wait_deadlines: { Args: never; Returns: undefined }
      profile_system_snapshot: { Args: { _user_id: string }; Returns: Json }
      reject_task_completion: {
        Args: { _reason?: string; _task_id: string }
        Returns: string
      }
      remind_stale_open_tasks: { Args: never; Returns: undefined }
      request_task_completion: { Args: { _task_id: string }; Returns: string }
      resolve_dispute: { Args: { _task_id: string }; Returns: undefined }
      respond_to_offer: {
        Args: { _accept: boolean; _offer_id: string }
        Returns: string
      }
      start_task_with_partial_quota: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      task_lifecycle_snapshot: { Args: { _task_id: string }; Returns: Json }
      test_grant_credits: {
        Args: { _credits: number; _pack?: string }
        Returns: number
      }
      trust_score: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      task_category:
        | "ampul_takma"
        | "perde_asma"
        | "mobilya_monte"
        | "duvar_tamir"
        | "kucuk_tamir"
        | "tasima_yardimi"
      task_status:
        | "open"
        | "matched"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "pending_confirm"
        | "expired"
        | "disputed"
      task_urgency: "urgent" | "can_wait"
      user_role: "owner" | "tasker"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      task_category: [
        "ampul_takma",
        "perde_asma",
        "mobilya_monte",
        "duvar_tamir",
        "kucuk_tamir",
        "tasima_yardimi",
      ],
      task_status: [
        "open",
        "matched",
        "in_progress",
        "completed",
        "cancelled",
        "pending_confirm",
        "expired",
        "disputed",
      ],
      task_urgency: ["urgent", "can_wait"],
      user_role: ["owner", "tasker"],
    },
  },
} as const
