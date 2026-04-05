// Автогенерированные типы Supabase описывают структуру таблиц, enum и RPC для TypeScript.
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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          include_installation: boolean | null
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          include_installation?: boolean | null
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          include_installation?: boolean | null
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      master_applications: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          district: string
          email: string
          experience_years: number
          full_name: string
          id: string
          phone: string
          photo_url: string | null
          specialization: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          district?: string
          email?: string
          experience_years?: number
          full_name?: string
          id?: string
          phone?: string
          photo_url?: string | null
          specialization?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          district?: string
          email?: string
          experience_years?: number
          full_name?: string
          id?: string
          phone?: string
          photo_url?: string | null
          specialization?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      master_listings: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          cancelled_orders: number | null
          complaints: number | null
          completed_orders: number | null
          created_at: string
          experience_years: number | null
          full_name: string
          id: string
          is_active: boolean | null
          is_top_master: boolean | null
          last_ranking_update: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          price_max: number | null
          price_min: number | null
          quality_flag: string | null
          ranking_score: number | null
          repeat_clients: number | null
          response_time_avg: number | null
          service_categories: string[] | null
          total_reviews: number | null
          user_id: string | null
          working_districts: string[] | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          cancelled_orders?: number | null
          complaints?: number | null
          completed_orders?: number | null
          created_at?: string
          experience_years?: number | null
          full_name: string
          id?: string
          is_active?: boolean | null
          is_top_master?: boolean | null
          last_ranking_update?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          quality_flag?: string | null
          ranking_score?: number | null
          repeat_clients?: number | null
          response_time_avg?: number | null
          service_categories?: string[] | null
          total_reviews?: number | null
          user_id?: string | null
          working_districts?: string[] | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          cancelled_orders?: number | null
          complaints?: number | null
          completed_orders?: number | null
          created_at?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_top_master?: boolean | null
          last_ranking_update?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          quality_flag?: string | null
          ranking_score?: number | null
          repeat_clients?: number | null
          response_time_avg?: number | null
          service_categories?: string[] | null
          total_reviews?: number | null
          user_id?: string | null
          working_districts?: string[] | null
        }
        Relationships: []
      }
      master_portfolio: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          master_id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          master_id: string
          title?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          master_id?: string
          title?: string
        }
        Relationships: []
      }
      master_product_sales: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          include_installation: boolean | null
          installation_price: number | null
          master_earnings: number
          master_id: string
          order_id: string | null
          product_id: string
          product_price: number
          quantity: number
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          include_installation?: boolean | null
          installation_price?: number | null
          master_earnings?: number
          master_id: string
          order_id?: string | null
          product_id: string
          product_price?: number
          quantity?: number
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          include_installation?: boolean | null
          installation_price?: number | null
          master_earnings?: number
          master_id?: string
          order_id?: string | null
          product_id?: string
          product_price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "master_product_sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          order_id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          order_id: string
          read?: boolean
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          order_id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          address: string
          budget: number | null
          category_id: string | null
          client_id: string
          client_rating: number | null
          client_review: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          master_id: string | null
          master_payout: number | null
          materials_cost: number | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          payout_date: string | null
          payout_status: string | null
          phone: string
          platform_commission: number | null
          preferred_time: string | null
          service_id: string | null
          service_price: number | null
          started_at: string | null
          status: string
          total_amount: number | null
          updated_at: string
          urgency_surcharge: number | null
        }
        Insert: {
          accepted_at?: string | null
          address?: string
          budget?: number | null
          category_id?: string | null
          client_id: string
          client_rating?: number | null
          client_review?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          master_id?: string | null
          master_payout?: number | null
          materials_cost?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          payout_date?: string | null
          payout_status?: string | null
          phone?: string
          platform_commission?: number | null
          preferred_time?: string | null
          service_id?: string | null
          service_price?: number | null
          started_at?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          urgency_surcharge?: number | null
        }
        Update: {
          accepted_at?: string | null
          address?: string
          budget?: number | null
          category_id?: string | null
          client_id?: string
          client_rating?: number | null
          client_review?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          master_id?: string | null
          master_payout?: number | null
          materials_cost?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          payout_date?: string | null
          payout_status?: string | null
          phone?: string
          platform_commission?: number | null
          preferred_time?: string | null
          service_id?: string | null
          service_price?: number | null
          started_at?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
          urgency_surcharge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          created_at: string
          documents: Json | null
          experience_years: number | null
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          price_max: number | null
          price_min: number | null
          quality_flag: string | null
          ranking_score: number | null
          service_categories: string[] | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          working_districts: string[] | null
        }
        Insert: {
          approval_status?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          documents?: Json | null
          experience_years?: number | null
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          quality_flag?: string | null
          ranking_score?: number | null
          service_categories?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          working_districts?: string[] | null
        }
        Update: {
          approval_status?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          documents?: Json | null
          experience_years?: number | null
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          price_max?: number | null
          price_min?: number | null
          quality_flag?: string | null
          ranking_score?: number | null
          service_categories?: string[] | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          working_districts?: string[] | null
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          created_at: string
          discount_applied: number
          id: string
          order_id: string | null
          promo_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          promo_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          times_used: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          times_used?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          times_used?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          master_id: string
          order_id: string
          photos: string[] | null
          rating: number
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          master_id: string
          order_id: string
          photos?: string[] | null
          rating: number
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          master_id?: string
          order_id?: string
          photos?: string[] | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name_en: string
          name_ru: string
          name_tj: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name_en?: string
          name_ru: string
          name_tj?: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name_en?: string
          name_ru?: string
          name_tj?: string
          sort_order?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name_en: string
          name_ru: string
          name_tj: string
          note: string | null
          price_avg: number
          price_max: number
          price_min: number
          sort_order: number
          unit: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name_en?: string
          name_ru: string
          name_tj?: string
          note?: string | null
          price_avg?: number
          price_max?: number
          price_min?: number
          sort_order?: number
          unit?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name_en?: string
          name_ru?: string
          name_tj?: string
          note?: string | null
          price_avg?: number
          price_max?: number
          price_min?: number
          sort_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          image_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          include_installation: boolean | null
          installation_price: number | null
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          include_installation?: boolean | null
          installation_price?: number | null
          order_id: string
          price?: number
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          include_installation?: boolean | null
          installation_price?: number | null
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          comments: string | null
          created_at: string
          customer_name: string | null
          delivery_address: string | null
          discount_amount: number
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          phone: string | null
          promo_code: string | null
          promo_code_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          customer_name?: string | null
          delivery_address?: string | null
          discount_amount?: number
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          customer_name?: string | null
          delivery_address?: string | null
          discount_amount?: number
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category_id: string
          commission_rate: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          in_stock: boolean | null
          installation_price: number | null
          is_approved: boolean | null
          is_discounted: boolean | null
          is_popular: boolean | null
          master_id: string | null
          name: string
          old_price: number | null
          price: number
          promotion_end: string | null
          promotion_label: string | null
          promotion_start: string | null
          rating: number | null
          related_service_category: string | null
          reviews_count: number | null
          seller_type: string | null
          specs: Json | null
          stock_qty: number | null
        }
        Insert: {
          category_id: string
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          installation_price?: number | null
          is_approved?: boolean | null
          is_discounted?: boolean | null
          is_popular?: boolean | null
          master_id?: string | null
          name: string
          old_price?: number | null
          price?: number
          promotion_end?: string | null
          promotion_label?: string | null
          promotion_start?: string | null
          rating?: number | null
          related_service_category?: string | null
          reviews_count?: number | null
          seller_type?: string | null
          specs?: Json | null
          stock_qty?: number | null
        }
        Update: {
          category_id?: string
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          installation_price?: number | null
          is_approved?: boolean | null
          is_discounted?: boolean | null
          is_popular?: boolean | null
          master_id?: string | null
          name?: string
          old_price?: number | null
          price?: number
          promotion_end?: string | null
          promotion_label?: string | null
          promotion_start?: string | null
          rating?: number | null
          related_service_category?: string | null
          reviews_count?: number | null
          seller_type?: string | null
          specs?: Json | null
          stock_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          related_order_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category: string
          created_at?: string
          id?: string
          message?: string
          related_order_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          related_order_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      calculate_master_ranking: {
        Args: {
          p_avg_rating: number
          p_cancelled_orders: number
          p_complaints: number
          p_completed_orders: number
          p_repeat_clients: number
          p_response_time_avg: number
          p_total_reviews: number
        }
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
      app_role: "client" | "master" | "admin" | "super_admin"
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
      app_role: ["client", "master", "admin", "super_admin"],
    },
  },
} as const
