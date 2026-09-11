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
      announcements: {
        Row: {
          button_text: string | null
          button_url: string | null
          created_at: string
          end_at: string | null
          end_time: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_pinned: boolean
          message: string | null
          position: string
          sort_order: number
          start_at: string | null
          start_time: string | null
          title: string
          type: string
        }
        Insert: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          end_at?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_pinned?: boolean
          message?: string | null
          position?: string
          sort_order?: number
          start_at?: string | null
          start_time?: string | null
          title: string
          type?: string
        }
        Update: {
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          end_at?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_pinned?: boolean
          message?: string | null
          position?: string
          sort_order?: number
          start_at?: string | null
          start_time?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      brokers: {
        Row: {
          categories: string[]
          commission_type: string | null
          commission_value: number | null
          created_at: string
          experience_years: number | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          service_areas: string | null
          status: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          experience_years?: number | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          service_areas?: string | null
          status?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          experience_years?: number | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          service_areas?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          is_active: boolean
          kind: string
          name: string
          slug: string
          sort_order: number
          subtitle: string | null
        }
        Insert: {
          icon?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          slug: string
          sort_order?: number
          subtitle?: string | null
        }
        Update: {
          icon?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          slug?: string
          sort_order?: number
          subtitle?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          is_closed: boolean
          last_message_at: string
          lead_status: string
          listing_id: string | null
          party: string
          subject: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          last_message_at?: string
          lead_status?: string
          listing_id?: string | null
          party?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          last_message_at?: string
          lead_status?: string
          listing_id?: string | null
          party?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          admin_notes: string | null
          broker_id: string | null
          commission_amount: number | null
          commission_status: string | null
          created_at: string
          id: string
          listing_id: string | null
          message: string | null
          name: string | null
          phone: string | null
          requirement_id: string | null
          service_id: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          broker_id?: string | null
          commission_amount?: number | null
          commission_status?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          name?: string | null
          phone?: string | null
          requirement_id?: string | null
          service_id?: string | null
          source: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          broker_id?: string | null
          commission_amount?: number | null
          commission_status?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          name?: string | null
          phone?: string | null
          requirement_id?: string | null
          service_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_private: {
        Row: {
          listing_id: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
        }
        Insert: {
          listing_id: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
        }
        Update: {
          listing_id?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_private_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          area_size: string | null
          audience: string | null
          availability: string | null
          bhk: string | null
          category_slug: string | null
          city: string
          contact_mode: string
          created_at: string
          custom_public_number: string | null
          description: string | null
          facilities: string[]
          furnishing: string | null
          id: string
          images: string[]
          is_featured: boolean
          location: string
          owner_id: string
          price: number | null
          price_unit: string | null
          property_type: string
          purpose: string
          rejection_reason: string | null
          status: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          address?: string | null
          area_size?: string | null
          audience?: string | null
          availability?: string | null
          bhk?: string | null
          category_slug?: string | null
          city?: string
          contact_mode?: string
          created_at?: string
          custom_public_number?: string | null
          description?: string | null
          facilities?: string[]
          furnishing?: string | null
          id?: string
          images?: string[]
          is_featured?: boolean
          location: string
          owner_id: string
          price?: number | null
          price_unit?: string | null
          property_type: string
          purpose?: string
          rejection_reason?: string | null
          status?: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          address?: string | null
          area_size?: string | null
          audience?: string | null
          availability?: string | null
          bhk?: string | null
          category_slug?: string | null
          city?: string
          contact_mode?: string
          created_at?: string
          custom_public_number?: string | null
          description?: string | null
          facilities?: string[]
          furnishing?: string | null
          id?: string
          images?: string[]
          is_featured?: boolean
          location?: string
          owner_id?: string
          price?: number | null
          price_unit?: string | null
          property_type?: string
          purpose?: string
          rejection_reason?: string | null
          status?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          deleted: boolean
          id: string
          image_url: string | null
          is_admin: boolean
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted?: boolean
          id?: string
          image_url?: string | null
          is_admin?: boolean
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted?: boolean
          id?: string
          image_url?: string | null
          is_admin?: boolean
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          admin_notes: string | null
          amount: number
          counter_amount: number | null
          created_at: string
          id: string
          listing_id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          counter_amount?: number | null
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          counter_amount?: number | null
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          is_verified: boolean
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          is_verified?: boolean
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          is_verified?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          reason: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          reason: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          reason?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          area_size: string | null
          bhk: string | null
          budget_max: number | null
          budget_min: number | null
          city: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          preferred_date: string | null
          property_type: string | null
          purpose: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_size?: string | null
          bhk?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          preferred_date?: string | null
          property_type?: string | null
          purpose?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_size?: string | null
          bhk?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          preferred_date?: string | null
          property_type?: string | null
          purpose?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_listings: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          areas: string | null
          city: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          name: string
          phone: string | null
          price_from: number | null
          service_type: string
          status: string
          user_id: string | null
        }
        Insert: {
          areas?: string | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name: string
          phone?: string | null
          price_from?: number | null
          service_type: string
          status?: string
          user_id?: string | null
        }
        Update: {
          areas?: string | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name?: string
          phone?: string | null
          price_from?: number | null
          service_type?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string
          admin_avatar_url: string | null
          business_name: string
          description: string | null
          email: string | null
          id: boolean
          logo_url: string | null
          management_name: string
          mobile: string
          powered_by: string
          public_contact_number: string
          social_links: Json
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string
          admin_avatar_url?: string | null
          business_name?: string
          description?: string | null
          email?: string | null
          id?: boolean
          logo_url?: string | null
          management_name?: string
          mobile?: string
          powered_by?: string
          public_contact_number?: string
          social_links?: Json
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          admin_avatar_url?: string | null
          business_name?: string
          description?: string | null
          email?: string | null
          id?: boolean
          logo_url?: string | null
          management_name?: string
          mobile?: string
          powered_by?: string
          public_contact_number?: string
          social_links?: Json
          updated_at?: string
          whatsapp?: string
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
      visit_requests: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          note: string | null
          preferred_date: string | null
          preferred_time: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          note?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          note?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "broker" | "user"
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
      app_role: ["admin", "broker", "user"],
    },
  },
} as const
