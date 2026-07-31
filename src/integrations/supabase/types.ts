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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
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
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount: number
          id: string
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          uses?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          uses?: number
          value?: number
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          neighborhood: string | null
          number: string
          state: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          neighborhood?: string | null
          number: string
          state: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          neighborhood?: string | null
          number?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          kind: string
          order_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          kind?: string
          order_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          kind?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          credit_limit: number
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          email?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          email?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
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
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          points: number
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      order_tracking_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          channel: string
          coupon_code: string | null
          created_at: string
          customer_address: string | null
          customer_cpf: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_type: string
          discount: number
          discount_coupon: number
          id: string
          kanban_status: string
          mp_init_point: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          points_earned: number
          points_used: number
          refunded_at: string | null
          shipping_cep: string | null
          shipping_city: string | null
          shipping_complement: string | null
          shipping_fee: number
          shipping_neighborhood: string | null
          shipping_number: string | null
          shipping_state: string | null
          shipping_street: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          tracking_code: string | null
          updated_at: string
          user_id: string
          warranty_days: number | null
          warranty_text: string | null
        }
        Insert: {
          cancel_reason?: string | null
          channel?: string
          coupon_code?: string | null
          created_at?: string
          customer_address?: string | null
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_type?: string
          discount?: number
          discount_coupon?: number
          id?: string
          kanban_status?: string
          mp_init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          points_earned?: number
          points_used?: number
          refunded_at?: string | null
          shipping_cep?: string | null
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_fee?: number
          shipping_neighborhood?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          tracking_code?: string | null
          updated_at?: string
          user_id: string
          warranty_days?: number | null
          warranty_text?: string | null
        }
        Update: {
          cancel_reason?: string | null
          channel?: string
          coupon_code?: string | null
          created_at?: string
          customer_address?: string | null
          customer_cpf?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_type?: string
          discount?: number
          discount_coupon?: number
          id?: string
          kanban_status?: string
          mp_init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          points_earned?: number
          points_used?: number
          refunded_at?: string | null
          shipping_cep?: string | null
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_fee?: number
          shipping_neighborhood?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string
          warranty_days?: number | null
          warranty_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved: boolean
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          order_id: string | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          tags: string[]
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
          tags?: string[]
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
          tags?: string[]
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
      shipping_rates: {
        Row: {
          active: boolean
          cep_from: string
          cep_to: string
          created_at: string
          days: number
          id: string
          label: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          cep_from: string
          cep_to: string
          created_at?: string
          days?: number
          id?: string
          label: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          cep_from?: string
          cep_to?: string
          created_at?: string
          days?: number
          id?: string
          label?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_secrets: {
        Row: {
          created_at: string
          id: string
          mercadopago_access_token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mercadopago_access_token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mercadopago_access_token?: string | null
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
          active_theme_key: string
          faq: Json
          footer_links: Json
          footer_payment_methods: string | null
          footer_text: string | null
          home_banners: Json
          home_hero_cta: string | null
          home_hero_subtitle: string | null
          home_hero_title: string | null
          id: string
          loyalty_points_per_real: number
          loyalty_real_per_point: number
          pix_key: string | null
          product_page_extra_info: string | null
          product_page_shipping_text: string | null
          product_page_warranty_text: string | null
          receipt_footer_text: string | null
          receipt_header_text: string | null
          receipt_show_logo: boolean
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
          theme_expires_at: string | null
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
          active_theme_key?: string
          faq?: Json
          footer_links?: Json
          footer_payment_methods?: string | null
          footer_text?: string | null
          home_banners?: Json
          home_hero_cta?: string | null
          home_hero_subtitle?: string | null
          home_hero_title?: string | null
          id?: string
          loyalty_points_per_real?: number
          loyalty_real_per_point?: number
          pix_key?: string | null
          product_page_extra_info?: string | null
          product_page_shipping_text?: string | null
          product_page_warranty_text?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          receipt_show_logo?: boolean
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
          theme_expires_at?: string | null
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
          active_theme_key?: string
          faq?: Json
          footer_links?: Json
          footer_payment_methods?: string | null
          footer_text?: string | null
          home_banners?: Json
          home_hero_cta?: string | null
          home_hero_subtitle?: string | null
          home_hero_title?: string | null
          id?: string
          loyalty_points_per_real?: number
          loyalty_real_per_point?: number
          pix_key?: string | null
          product_page_extra_info?: string | null
          product_page_shipping_text?: string | null
          product_page_warranty_text?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          receipt_show_logo?: boolean
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
          theme_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_packs: {
        Row: {
          accent_color: string
          accent_glow: string
          active: boolean
          banner_subtext: string | null
          banner_text: string | null
          created_at: string
          decoration: string
          id: string
          key: string
          name: string
        }
        Insert: {
          accent_color?: string
          accent_glow?: string
          active?: boolean
          banner_subtext?: string | null
          banner_text?: string | null
          created_at?: string
          decoration?: string
          id?: string
          key: string
          name: string
        }
        Update: {
          accent_color?: string
          accent_glow?: string
          active?: boolean
          banner_subtext?: string | null
          banner_text?: string | null
          created_at?: string
          decoration?: string
          id?: string
          key?: string
          name?: string
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
      customer_balance: { Args: { _customer_id: string }; Returns: number }
      decrement_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: undefined
      }
      gen_tracking_code: { Args: never; Returns: string }
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
      app_role: "admin" | "cliente" | "funcionario"
      coupon_type: "percent" | "fixed" | "free_shipping"
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
      app_role: ["admin", "cliente", "funcionario"],
      coupon_type: ["percent", "fixed", "free_shipping"],
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
