/**
 * Hand-maintained mirror of supabase/migrations/*.sql.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * The app treats this file as the contract: if a migration changes a column,
 * typecheck fails until this file is refreshed.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          address: string | null;
          cover_url: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          facebook: string | null;
          id: string;
          instagram: string | null;
          is_indexable: boolean;
          is_published: boolean;
          locale: string;
          logo_url: string | null;
          menu_style: Database["public"]["Enums"]["menu_style"];
          name: string;
          opening_hours: string | null;
          phone: string | null;
          plan: Database["public"]["Enums"]["subscription_plan"];
          primary_color: string;
          secondary_color: string;
          slug: string;
          timezone: string;
          translations: Json;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          address?: string | null;
          cover_url?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          facebook?: string | null;
          id?: string;
          instagram?: string | null;
          is_indexable?: boolean;
          is_published?: boolean;
          locale?: string;
          logo_url?: string | null;
          menu_style?: Database["public"]["Enums"]["menu_style"];
          name: string;
          opening_hours?: string | null;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          primary_color?: string;
          secondary_color?: string;
          slug: string;
          timezone?: string;
          translations?: Json;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          address?: string | null;
          cover_url?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          facebook?: string | null;
          id?: string;
          instagram?: string | null;
          is_indexable?: boolean;
          is_published?: boolean;
          locale?: string;
          logo_url?: string | null;
          menu_style?: Database["public"]["Enums"]["menu_style"];
          name?: string;
          opening_hours?: string | null;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          primary_color?: string;
          secondary_color?: string;
          slug?: string;
          timezone?: string;
          translations?: Json;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };

      categories: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          emoji: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          restaurant_id: string;
          translations: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          emoji?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          restaurant_id: string;
          translations?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          emoji?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          restaurant_id?: string;
          translations?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };

      menu_items: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_available: boolean;
          is_featured: boolean;
          name: string;
          price: number;
          restaurant_id: string;
          search_document: unknown;
          tags: string[];
          translations: Json;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          is_featured?: boolean;
          name: string;
          price: number;
          restaurant_id: string;
          search_document?: unknown;
          tags?: string[];
          translations?: Json;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          is_featured?: boolean;
          name?: string;
          price?: number;
          restaurant_id?: string;
          search_document?: unknown;
          tags?: string[];
          translations?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };

      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          locale: string;
          restaurant_id: string | null;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          restaurant_id?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          restaurant_id?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };

      menu_views: {
        Row: {
          category_id: string | null;
          created_at: string;
          device: string | null;
          event: Database["public"]["Enums"]["menu_event"];
          id: number;
          item_id: string | null;
          referrer: string | null;
          restaurant_id: string;
          source: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          device?: string | null;
          event?: Database["public"]["Enums"]["menu_event"];
          id?: never;
          item_id?: string | null;
          referrer?: string | null;
          restaurant_id: string;
          source?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          device?: string | null;
          event?: Database["public"]["Enums"]["menu_event"];
          id?: never;
          item_id?: string | null;
          referrer?: string | null;
          restaurant_id?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_views_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_views_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_views_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    Views: Record<string, never>;

    Functions: {
      create_restaurant_for_self: {
        Args: { p_restaurant_name: string; p_slug?: string | null };
        Returns: string;
      };
      current_restaurant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      generate_unique_restaurant_slug: {
        Args: { p_name: string };
        Returns: string;
      };
      get_analytics_summary: {
        Args: { p_days?: number };
        Returns: {
          metric: string;
          value: number;
          previous: number;
        }[];
      };
      get_menu_analytics: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          event: Database["public"]["Enums"]["menu_event"];
          source: string;
          views: number;
        }[];
      };
      get_top_viewed_items: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          item_id: string;
          item_name: string;
          image_url: string | null;
          is_available: boolean;
          views: number;
        }[];
      };
      is_publicly_visible: {
        Args: { p_restaurant_id: string };
        Returns: boolean;
      };
      is_restaurant_owner: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      provision_restaurant: {
        Args: {
          p_user_id: string;
          p_restaurant_name: string;
          p_role?: Database["public"]["Enums"]["app_role"];
          p_slug?: string | null;
          p_email?: string | null;
          p_full_name?: string | null;
        };
        Returns: string;
      };
      record_menu_view: {
        Args: {
          p_restaurant_id: string;
          p_event?: Database["public"]["Enums"]["menu_event"];
          p_source?: string | null;
          p_referrer?: string | null;
          p_device?: string | null;
          p_category_id?: string | null;
          p_item_id?: string | null;
        };
        Returns: undefined;
      };
      reorder_categories: {
        Args: { p_ids: string[] };
        Returns: number;
      };
      reorder_menu_items: {
        Args: { p_ids: string[] };
        Returns: number;
      };
      slugify: {
        Args: { input: string };
        Returns: string | null;
      };
    };

    Enums: {
      app_role: "owner" | "manager";
      menu_event: "menu_view" | "category_view" | "item_view";
      menu_style: "modern" | "classic" | "minimal";
      subscription_plan: "free" | "pro";
    };

    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type Category = Tables<"categories">;
export type MenuItem = Tables<"menu_items">;
export type Profile = Tables<"profiles">;
export type Restaurant = Tables<"restaurants">;
