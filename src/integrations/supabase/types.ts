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
      active_profile: {
        Row: {
          profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_profile_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          duration_minutes: number
          field_id: string
          id: string
          message: string | null
          requester_team_id: string | null
          requester_user_id: string
          scheduled_at: string
          status: string
          sub_field_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          field_id: string
          id?: string
          message?: string | null
          requester_team_id?: string | null
          requester_user_id: string
          scheduled_at: string
          status?: string
          sub_field_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          field_id?: string
          id?: string
          message?: string | null
          requester_team_id?: string | null
          requester_user_id?: string
          scheduled_at?: string
          status?: string
          sub_field_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_requester_team_id_fkey"
            columns: ["requester_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_sub_field_id_fkey"
            columns: ["sub_field_id"]
            isOneToOne: false
            referencedRelation: "sub_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by_team_id: string
          description: string | null
          id: string
          location: string | null
          opponent_team_id: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by_team_id: string
          description?: string | null
          id?: string
          location?: string | null
          opponent_team_id?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by_team_id?: string
          description?: string | null
          id?: string
          location?: string | null
          opponent_team_id?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_team_id_fkey"
            columns: ["created_by_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          created_at: string
          field_type: string
          id: string
          name: string
          owner_user_id: string
          price_per_hour: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          field_type: string
          id?: string
          name: string
          owner_user_id: string
          price_per_hour?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          created_at?: string
          field_type?: string
          id?: string
          name?: string
          owner_user_id?: string
          price_per_hour?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      match_assignments: {
        Row: {
          challenge_id: string | null
          created_at: string
          id: string
          match_id: string | null
          message: string | null
          price: number
          referee_id: string
          requester_profile_type: string
          requester_team_id: string | null
          requester_user_id: string
          scheduled_at: string
          signed_at: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          match_id?: string | null
          message?: string | null
          price?: number
          referee_id: string
          requester_profile_type: string
          requester_team_id?: string | null
          requester_user_id: string
          scheduled_at: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          match_id?: string | null
          message?: string | null
          price?: number
          referee_id?: string
          requester_profile_type?: string
          requester_team_id?: string | null
          requester_user_id?: string
          scheduled_at?: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_assignments_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "referees"
            referencedColumns: ["referee_id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          challenge_id: string | null
          created_at: string
          home_score: number | null
          home_team_id: string | null
          id: string
          league_id: string | null
          location: string | null
          played_at: string | null
          reported_by: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          challenge_id?: string | null
          created_at?: string
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          league_id?: string | null
          location?: string | null
          played_at?: string | null
          reported_by?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          challenge_id?: string | null
          created_at?: string
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          league_id?: string | null
          location?: string | null
          played_at?: string | null
          reported_by?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_applications: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          experience: string | null
          id: string
          message: string | null
          opening_id: string
          player_age: number | null
          player_name: string
          player_nickname: string | null
          player_phone: string
          player_user_id: string
          status: Database["public"]["Enums"]["opening_application_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          experience?: string | null
          id?: string
          message?: string | null
          opening_id: string
          player_age?: number | null
          player_name: string
          player_nickname?: string | null
          player_phone: string
          player_user_id: string
          status?: Database["public"]["Enums"]["opening_application_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          experience?: string | null
          id?: string
          message?: string | null
          opening_id?: string
          player_age?: number | null
          player_name?: string
          player_nickname?: string | null
          player_phone?: string
          player_user_id?: string
          status?: Database["public"]["Enums"]["opening_application_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          assignment_id: string
          created_at: string
          currency: string
          held_at: string
          id: string
          payer_user_id: string
          referee_id: string
          refunded_at: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          assignment_id: string
          created_at?: string
          currency?: string
          held_at?: string
          id?: string
          payer_user_id: string
          referee_id: string
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          assignment_id?: string
          created_at?: string
          currency?: string
          held_at?: string
          id?: string
          payer_user_id?: string
          referee_id?: string
          refunded_at?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "match_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "referees"
            referencedColumns: ["referee_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referee_hires: {
        Row: {
          created_at: string
          hire_date: string
          hire_time: string
          id: string
          message: string | null
          price: number | null
          referee_id: string
          referee_name: string
          requester_name: string | null
          requester_profile_type: string
          requester_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hire_date: string
          hire_time: string
          id?: string
          message?: string | null
          price?: number | null
          referee_id: string
          referee_name: string
          requester_name?: string | null
          requester_profile_type: string
          requester_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hire_date?: string
          hire_time?: string
          id?: string
          message?: string | null
          price?: number | null
          referee_id?: string
          referee_name?: string
          requester_name?: string | null
          requester_profile_type?: string
          requester_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      referee_reviews: {
        Row: {
          assignment_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          referee_id: string
          reviewer_user_id: string
        }
        Insert: {
          assignment_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          referee_id: string
          reviewer_user_id: string
        }
        Update: {
          assignment_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          referee_id?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referee_reviews_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "match_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_reviews_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "referees"
            referencedColumns: ["referee_id"]
          },
        ]
      }
      referees: {
        Row: {
          active: boolean
          available_days: string[]
          available_times: string[]
          bio: string | null
          certifications: string[]
          city: string | null
          created_at: string
          display_name: string
          experience_years: number
          price_per_game: number
          referee_id: string
          reviews_count: number
          score: number
          tier: Database["public"]["Enums"]["referee_tier"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          available_days?: string[]
          available_times?: string[]
          bio?: string | null
          certifications?: string[]
          city?: string | null
          created_at?: string
          display_name: string
          experience_years?: number
          price_per_game?: number
          referee_id: string
          reviews_count?: number
          score?: number
          tier?: Database["public"]["Enums"]["referee_tier"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          available_days?: string[]
          available_times?: string[]
          bio?: string | null
          certifications?: string[]
          city?: string | null
          created_at?: string
          display_name?: string
          experience_years?: number
          price_per_game?: number
          referee_id?: string
          reviews_count?: number
          score?: number
          tier?: Database["public"]["Enums"]["referee_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      sub_fields: {
        Row: {
          active: boolean
          available_days: string[]
          available_times: string[]
          created_at: string
          field_type: Database["public"]["Enums"]["sub_field_type"]
          id: string
          name: string
          photo_url: string | null
          price_per_hour: number
          pricing_rules: Json
          updated_at: string
          venue_id: string
        }
        Insert: {
          active?: boolean
          available_days?: string[]
          available_times?: string[]
          created_at?: string
          field_type: Database["public"]["Enums"]["sub_field_type"]
          id?: string
          name: string
          photo_url?: string | null
          price_per_hour?: number
          pricing_rules?: Json
          updated_at?: string
          venue_id: string
        }
        Update: {
          active?: boolean
          available_days?: string[]
          available_times?: string[]
          created_at?: string
          field_type?: Database["public"]["Enums"]["sub_field_type"]
          id?: string
          name?: string
          photo_url?: string | null
          price_per_hour?: number
          pricing_rules?: Json
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_fields_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_trophies: {
        Row: {
          awarded_at: string
          created_at: string
          icon: string | null
          id: string
          kind: string
          season: string | null
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          awarded_at?: string
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          season?: string | null
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          awarded_at?: string
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          season?: string | null
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_trophies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          bio: string | null
          captain: string | null
          city: string | null
          color: string | null
          created_at: string
          fair_play: number
          founded: number | null
          id: string
          name: string
          preferred_days: string[] | null
          preferred_times: string[] | null
          rating: number
          shield: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          bio?: string | null
          captain?: string | null
          city?: string | null
          color?: string | null
          created_at?: string
          fair_play?: number
          founded?: number | null
          id?: string
          name: string
          preferred_days?: string[] | null
          preferred_times?: string[] | null
          rating?: number
          shield?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          bio?: string | null
          captain?: string | null
          city?: string | null
          color?: string | null
          created_at?: string
          fair_play?: number
          founded?: number | null
          id?: string
          name?: string
          preferred_days?: string[] | null
          preferred_times?: string[] | null
          rating?: number
          shield?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      user_account_types: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          user_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          address: string | null
          age: number | null
          avatar: string | null
          bio: string | null
          capacity: number | null
          city: string | null
          color: string
          created_at: string
          field_type: string | null
          field_types: string[] | null
          founded: number | null
          frame: string
          gender: string | null
          id: string
          level: string | null
          name: string
          nickname: string | null
          photo_url: string | null
          position: string | null
          preferred_foot: string | null
          price_per_hour: number | null
          type: Database["public"]["Enums"]["profile_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar?: string | null
          bio?: string | null
          capacity?: number | null
          city?: string | null
          color?: string
          created_at?: string
          field_type?: string | null
          field_types?: string[] | null
          founded?: number | null
          frame?: string
          gender?: string | null
          id?: string
          level?: string | null
          name: string
          nickname?: string | null
          photo_url?: string | null
          position?: string | null
          preferred_foot?: string | null
          price_per_hour?: number | null
          type: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar?: string | null
          bio?: string | null
          capacity?: number | null
          city?: string | null
          color?: string
          created_at?: string
          field_type?: string | null
          field_types?: string[] | null
          founded?: number | null
          frame?: string
          gender?: string | null
          id?: string
          level?: string | null
          name?: string
          nickname?: string | null
          photo_url?: string | null
          position?: string | null
          preferred_foot?: string | null
          price_per_hour?: number | null
          type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          bio: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          owner_user_id: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_pending_bookings: { Args: never; Returns: number }
      has_active_team_pro: {
        Args: { _env?: string; _team_id: string }
        Returns: boolean
      }
      is_business_account: { Args: { _uid: string }; Returns: boolean }
      is_sub_field_slot_available: {
        Args: { _scheduled_at: string; _sub_field_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      reserve_sub_field_slot: {
        Args: {
          _duration_minutes?: number
          _scheduled_at: string
          _sub_field_id: string
          _team_id?: string
        }
        Returns: string
      }
      team_admin_count: { Args: { _team_id: string }; Returns: number }
    }
    Enums: {
      account_type: "sportist" | "business"
      assignment_status:
        | "pending"
        | "accepted"
        | "declined"
        | "completed"
        | "cancelled"
      opening_application_status: "pending" | "accepted" | "rejected"
      payout_status: "held" | "released" | "refunded"
      profile_type: "player" | "team" | "field"
      referee_tier: "bronze" | "silver" | "gold"
      sub_field_type: "society" | "areia" | "sintetico" | "salao"
      team_role: "owner" | "admin"
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
      account_type: ["sportist", "business"],
      assignment_status: [
        "pending",
        "accepted",
        "declined",
        "completed",
        "cancelled",
      ],
      opening_application_status: ["pending", "accepted", "rejected"],
      payout_status: ["held", "released", "refunded"],
      profile_type: ["player", "team", "field"],
      referee_tier: ["bronze", "silver", "gold"],
      sub_field_type: ["society", "areia", "sintetico", "salao"],
      team_role: ["owner", "admin"],
    },
  },
} as const
