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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_image: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          channel: string
          created_at: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          id: string
          mp_payment_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          channel?: string
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          mp_payment_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          channel?: string
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          mp_payment_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          images: string[]
          name: string
          price: number
          sale_price: number | null
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          name: string
          price: number
          sale_price?: number | null
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          name?: string
          price?: number
          sale_price?: number | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          about_gallery: string[]
          about_hero_image: string | null
          about_stat1_label: string | null
          about_stat1_number: string | null
          about_stat2_label: string | null
          about_stat2_number: string | null
          about_stat3_label: string | null
          about_stat3_number: string | null
          about_stat4_label: string | null
          about_stat4_number: string | null
          about_text1: string | null
          about_text2: string | null
          id: string
          mercadopago_access_token: string | null
          pix_key: string | null
          store_address: string | null
          store_email: string | null
          store_header_image: string | null
          store_hours: string | null
          store_instagram: string | null
          store_logo: string | null
          store_name: string
          store_phone: string | null
          store_slogan: string | null
          store_whatsapp: string | null
          support_image: string | null
          updated_at: string
        }
        Insert: {
          about_gallery?: string[]
          about_hero_image?: string | null
          about_stat1_label?: string | null
          about_stat1_number?: string | null
          about_stat2_label?: string | null
          about_stat2_number?: string | null
          about_stat3_label?: string | null
          about_stat3_number?: string | null
          about_stat4_label?: string | null
          about_stat4_number?: string | null
          about_text1?: string | null
          about_text2?: string | null
          id?: string
          mercadopago_access_token?: string | null
          pix_key?: string | null
          store_address?: string | null
          store_email?: string | null
          store_header_image?: string | null
          store_hours?: string | null
          store_instagram?: string | null
          store_logo?: string | null
          store_name?: string
          store_phone?: string | null
          store_slogan?: string | null
          store_whatsapp?: string | null
          support_image?: string | null
          updated_at?: string
        }
        Update: {
          about_gallery?: string[]
          about_hero_image?: string | null
          about_stat1_label?: string | null
          about_stat1_number?: string | null
          about_stat2_label?: string | null
          about_stat2_number?: string | null
          about_stat3_label?: string | null
          about_stat3_number?: string | null
          about_stat4_label?: string | null
          about_stat4_number?: string | null
          about_text1?: string | null
          about_text2?: string | null
          id?: string
          mercadopago_access_token?: string | null
          pix_key?: string | null
          store_address?: string | null
          store_email?: string | null
          store_header_image?: string | null
          store_hours?: string | null
          store_instagram?: string | null
          store_logo?: string | null
          store_name?: string
          store_phone?: string | null
          store_slogan?: string | null
          store_whatsapp?: string | null
          support_image?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
      order_status:
        | "pending"
        | "paid"
        | "cancelled"
        | "shipped"
        | "delivered"
        | "refunded"
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
      app_role: ["admin", "cliente"],
      order_status: [
        "pending",
        "paid",
        "cancelled",
        "shipped",
        "delivered",
        "refunded",
      ],
    },
  },
} as const
