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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      leads: {
        Row: {
          address: string
          city: string | null
          contact: string | null
          created_at: string
          date_listed: string | null
          id: string
          order_id: string
          price: string | null
          seller_name: string | null
          source: string
          source_type: string | null
          state: string | null
          url: string | null
          zip: string | null
        }
        Insert: {
          address: string
          city?: string | null
          contact?: string | null
          created_at?: string
          date_listed?: string | null
          id?: string
          order_id: string
          price?: string | null
          seller_name?: string | null
          source: string
          source_type?: string | null
          state?: string | null
          url?: string | null
          zip?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          contact?: string | null
          created_at?: string
          date_listed?: string | null
          id?: string
          order_id?: string
          price?: string | null
          seller_name?: string | null
          source?: string
          source_type?: string | null
          state?: string | null
          url?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_cities: string[] | null
          billing_type: string | null
          cities_searched: string[] | null
          created_at: string
          current_radius: number | null
          customer_email: string | null
          customer_name: string | null
          delivered_at: string | null
          id: string
          lead_count_range: string | null
          leads_count: number | null
          max_leads: number | null
          min_leads: number | null
          needs_additional_scraping: boolean | null
          next_delivery_date: string | null
          next_scrape_date: string | null
          price_paid: number | null
          primary_city: string
          radius_used: number | null
          refund_amount: number | null
          refund_reason: string | null
          scrape_attempts: number | null
          scraping_cost: number | null
          search_radius: number
          sheet_url: string | null
          source_breakdown: Json | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["pricing_tier"]
          total_leads_delivered: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_cities?: string[] | null
          billing_type?: string | null
          cities_searched?: string[] | null
          created_at?: string
          current_radius?: number | null
          customer_email?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          id?: string
          lead_count_range?: string | null
          leads_count?: number | null
          max_leads?: number | null
          min_leads?: number | null
          needs_additional_scraping?: boolean | null
          next_delivery_date?: string | null
          next_scrape_date?: string | null
          price_paid?: number | null
          primary_city?: string
          radius_used?: number | null
          refund_amount?: number | null
          refund_reason?: string | null
          scrape_attempts?: number | null
          scraping_cost?: number | null
          search_radius?: number
          sheet_url?: string | null
          source_breakdown?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          tier: Database["public"]["Enums"]["pricing_tier"]
          total_leads_delivered?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_cities?: string[] | null
          billing_type?: string | null
          cities_searched?: string[] | null
          created_at?: string
          current_radius?: number | null
          customer_email?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          id?: string
          lead_count_range?: string | null
          leads_count?: number | null
          max_leads?: number | null
          min_leads?: number | null
          needs_additional_scraping?: boolean | null
          next_delivery_date?: string | null
          next_scrape_date?: string | null
          price_paid?: number | null
          primary_city?: string
          radius_used?: number | null
          refund_amount?: number | null
          refund_reason?: string | null
          scrape_attempts?: number | null
          scraping_cost?: number | null
          search_radius?: number
          sheet_url?: string | null
          source_breakdown?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["pricing_tier"]
          total_leads_delivered?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_credit: number | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_credit?: number | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          account_credit?: number | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_email: { Args: never; Returns: string }
    }
    Enums: {
      order_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "partial_delivery"
      pricing_tier: "starter" | "growth" | "pro"
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
      order_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "partial_delivery",
      ],
      pricing_tier: ["starter", "growth", "pro"],
    },
  },
} as const
