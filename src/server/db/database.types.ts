/**
 * Hand-written types for the public schema (see supabase/schema.sql).
 * Regenerate with `supabase gen types typescript --project-id <id>` if the CLI is available;
 * keep the `Functions` section in sync with the SQL functions.
 */
export type Database = {
  public: {
    Tables: {
      places: {
        Row: {
          id: string;
          name: string;
          city: string;
          city_slug: string;
          category: string;
          neighborhood: string | null;
          price_level: number | null;
          tags: string[] | null;
          description: string | null;
          lat: number | null;
          lng: number | null;
          image_url: string | null;
          pearlclub_url: string;
          curator: string | null;
          curator_slug: string | null;
          curator_image: string | null;
          curator_type: string | null;
          /** pgvector value as returned by PostgREST (a string); never selected by the app. */
          embedding: string | null;
          /** Generated column. */
          search_text: string | null;
        };
        Insert: {
          id: string;
          name: string;
          city: string;
          city_slug: string;
          category: string;
          pearlclub_url: string;
          neighborhood?: string | null;
          price_level?: number | null;
          tags?: string[] | null;
          description?: string | null;
          lat?: number | null;
          lng?: number | null;
          image_url?: string | null;
          curator?: string | null;
          curator_slug?: string | null;
          curator_image?: string | null;
          curator_type?: string | null;
          embedding?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["places"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          session_id: string;
          name: string | null;
          language: string | null;
          travel_style: string | null;
          budget: string | null;
          interests: string[] | null;
          dietary: string[] | null;
          home_city: string | null;
          updated_at: string | null;
        };
        Insert: {
          session_id: string;
          name?: string | null;
          language?: string | null;
          travel_style?: string | null;
          budget?: string | null;
          interests?: string[] | null;
          dietary?: string[] | null;
          home_city?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      saved_places: {
        Row: { session_id: string; place_id: string; created_at: string | null };
        Insert: { session_id: string; place_id: string; created_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["saved_places"]["Insert"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          session_id: string;
          idempotency_key: string | null;
          hotel_id: string;
          booking_type: string;
          item_id: string;
          item_name: string;
          date: string;
          time: string | null;
          party_size: number | null;
          guest_name: string;
          guest_email: string;
          room_number: string | null;
          notes: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          session_id: string;
          hotel_id: string;
          booking_type: string;
          item_id: string;
          item_name: string;
          date: string;
          guest_name: string;
          guest_email: string;
          id?: string;
          idempotency_key?: string | null;
          time?: string | null;
          party_size?: number | null;
          room_number?: string | null;
          notes?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      usage: {
        Row: { session_id: string; message_count: number | null; updated_at: string | null };
        Insert: { session_id: string; message_count?: number | null; updated_at?: string | null };
        Update: Partial<Database["public"]["Tables"]["usage"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_usage: { Args: { p_session_id: string }; Returns: number };
      match_places: {
        Args: {
          query_embedding: string;
          p_city: string;
          p_category?: string | null;
          p_price_max?: number | null;
          p_exclude?: string[];
          match_count?: number;
        };
        Returns: { id: string; similarity: number }[];
      };
      purge_usage: {
        Args: { p_daily_older_than?: string; p_session_older_than?: string };
        Returns: number;
      };
      purge_old_bookings: { Args: { p_older_than?: string }; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
