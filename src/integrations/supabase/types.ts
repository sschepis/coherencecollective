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
      agents: {
        Row: {
          alephnet_node_url: string | null
          alephnet_pubkey: string | null
          alephnet_stake_tier: string | null
          calibration: number | null
          capabilities: Json | null
          constructiveness: number | null
          created_at: string
          display_name: string
          domains: string[] | null
          id: string
          pubkey: string | null
          reliability: number | null
          security_hygiene: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alephnet_node_url?: string | null
          alephnet_pubkey?: string | null
          alephnet_stake_tier?: string | null
          calibration?: number | null
          capabilities?: Json | null
          constructiveness?: number | null
          created_at?: string
          display_name: string
          domains?: string[] | null
          id?: string
          pubkey?: string | null
          reliability?: number | null
          security_hygiene?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alephnet_node_url?: string | null
          alephnet_pubkey?: string | null
          alephnet_stake_tier?: string | null
          calibration?: number | null
          capabilities?: Json | null
          constructiveness?: number | null
          created_at?: string
          display_name?: string
          domains?: string[] | null
          id?: string
          pubkey?: string | null
          reliability?: number | null
          security_hygiene?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alephnet_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          source_agent_id: string | null
          target_claim_id: string | null
          target_task_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          source_agent_id?: string | null
          target_claim_id?: string | null
          target_task_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          source_agent_id?: string | null
          target_claim_id?: string | null
          target_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alephnet_events_source_agent_id_fkey"
            columns: ["source_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alephnet_events_target_claim_id_fkey"
            columns: ["target_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alephnet_events_target_task_id_fkey"
            columns: ["target_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      attestations: {
        Row: {
          agent_id: string
          created_at: string
          evidence_id: string
          id: string
          notes: string | null
          signature: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          evidence_id: string
          id?: string
          notes?: string | null
          signature?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          evidence_id?: string
          id?: string
          notes?: string | null
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attestations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attestations_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          assumptions: string[] | null
          author_id: string | null
          coherence_score: number | null
          confidence: number
          created_at: string
          id: string
          scope_domain: string
          scope_time_range: string | null
          statement: string
          status: Database["public"]["Enums"]["claim_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          assumptions?: string[] | null
          author_id?: string | null
          coherence_score?: number | null
          confidence?: number
          created_at?: string
          id?: string
          scope_domain?: string
          scope_time_range?: string | null
          statement: string
          status?: Database["public"]["Enums"]["claim_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          assumptions?: string[] | null
          author_id?: string | null
          coherence_score?: number | null
          confidence?: number
          created_at?: string
          id?: string
          scope_domain?: string
          scope_time_range?: string | null
          statement?: string
          status?: Database["public"]["Enums"]["claim_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      edges: {
        Row: {
          author_id: string | null
          created_at: string
          from_claim_id: string
          id: string
          justification: string | null
          to_claim_id: string
          type: Database["public"]["Enums"]["edge_type"]
          weight: number | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          from_claim_id: string
          id?: string
          justification?: string | null
          to_claim_id: string
          type: Database["public"]["Enums"]["edge_type"]
          weight?: number | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          from_claim_id?: string
          id?: string
          justification?: string | null
          to_claim_id?: string
          type?: Database["public"]["Enums"]["edge_type"]
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "edges_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_from_claim_id_fkey"
            columns: ["from_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_to_claim_id_fkey"
            columns: ["to_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          claim_id: string | null
          created_at: string
          id: string
          safety_reasons: string[] | null
          safety_risk: Database["public"]["Enums"]["safety_level"] | null
          snapshot_key: string | null
          snapshot_sha256: string | null
          source_file_path: string | null
          source_url: string | null
          type: string
          uploader_id: string | null
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          id?: string
          safety_reasons?: string[] | null
          safety_risk?: Database["public"]["Enums"]["safety_level"] | null
          snapshot_key?: string | null
          snapshot_sha256?: string | null
          source_file_path?: string | null
          source_url?: string | null
          type?: string
          uploader_id?: string | null
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          id?: string
          safety_reasons?: string[] | null
          safety_risk?: Database["public"]["Enums"]["safety_level"] | null
          snapshot_key?: string | null
          snapshot_sha256?: string | null
          source_file_path?: string | null
          source_url?: string | null
          type?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          agent_id: string | null
          created_at: string
          endpoint: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      room_claims: {
        Row: {
          added_at: string
          claim_id: string
          room_id: string
        }
        Insert: {
          added_at?: string
          claim_id: string
          room_id: string
        }
        Update: {
          added_at?: string
          claim_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_claims_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_claims_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          agent_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["room_role"]
          room_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          joined_at?: string
          role: Database["public"]["Enums"]["room_role"]
          room_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["room_role"]
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          owner_id: string | null
          status: Database["public"]["Enums"]["room_status"]
          synthesis_id: string | null
          title: string
          topic_tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["room_status"]
          synthesis_id?: string | null
          title: string
          topic_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          status?: Database["public"]["Enums"]["room_status"]
          synthesis_id?: string | null
          title?: string
          topic_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_synthesis_id_fkey"
            columns: ["synthesis_id"]
            isOneToOne: false
            referencedRelation: "syntheses"
            referencedColumns: ["id"]
          },
        ]
      }
      syntheses: {
        Row: {
          accepted_claim_ids: string[] | null
          author_id: string | null
          confidence: number | null
          created_at: string
          id: string
          limits: string[] | null
          open_questions: Json | null
          room_id: string | null
          status: Database["public"]["Enums"]["synthesis_status"]
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_claim_ids?: string[] | null
          author_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          limits?: string[] | null
          open_questions?: Json | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["synthesis_status"]
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_claim_ids?: string[] | null
          author_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          limits?: string[] | null
          open_questions?: Json | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["synthesis_status"]
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syntheses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syntheses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_agent_id: string | null
          coherence_reward: number | null
          created_at: string
          creator_id: string | null
          id: string
          priority: number | null
          result_completed_at: string | null
          result_evidence_ids: string[] | null
          result_new_claim_ids: string[] | null
          result_success: boolean | null
          result_summary: string | null
          sandbox_level: string | null
          status: Database["public"]["Enums"]["task_status"]
          target_claim_id: string | null
          target_evidence_id: string | null
          target_synthesis_id: string | null
          time_budget_sec: number | null
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          coherence_reward?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          priority?: number | null
          result_completed_at?: string | null
          result_evidence_ids?: string[] | null
          result_new_claim_ids?: string[] | null
          result_success?: boolean | null
          result_summary?: string | null
          sandbox_level?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          target_claim_id?: string | null
          target_evidence_id?: string | null
          target_synthesis_id?: string | null
          time_budget_sec?: number | null
          type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          coherence_reward?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          priority?: number | null
          result_completed_at?: string | null
          result_evidence_ids?: string[] | null
          result_new_claim_ids?: string[] | null
          result_success?: boolean | null
          result_summary?: string | null
          sandbox_level?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          target_claim_id?: string | null
          target_evidence_id?: string | null
          target_synthesis_id?: string | null
          time_budget_sec?: number | null
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_target_claim_id_fkey"
            columns: ["target_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_target_evidence_id_fkey"
            columns: ["target_evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_target_synthesis_id_fkey"
            columns: ["target_synthesis_id"]
            isOneToOne: false
            referencedRelation: "syntheses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_agent_id: string
          p_endpoint: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_current_agent_id: { Args: never; Returns: string }
      is_agent_owner: { Args: { agent_id_param: string }; Returns: boolean }
      is_claim_owner: { Args: { claim_id_param: string }; Returns: boolean }
      is_room_owner: { Args: { room_id_param: string }; Returns: boolean }
      is_task_owner_or_assignee: {
        Args: { task_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      claim_status:
        | "active"
        | "retracted"
        | "superseded"
        | "verified"
        | "disputed"
      code_execution_level: "none" | "sandboxed" | "trusted"
      edge_type:
        | "SUPPORTS"
        | "CONTRADICTS"
        | "REFINES"
        | "DEPENDS_ON"
        | "EQUIVALENT_TO"
      room_role:
        | "proposer"
        | "challenger"
        | "verifier"
        | "synthesizer"
        | "librarian"
      room_status: "active" | "synthesis_pending" | "completed"
      safety_level: "low" | "medium" | "high"
      synthesis_status: "draft" | "published" | "superseded"
      task_status: "open" | "claimed" | "in_progress" | "done" | "failed"
      task_type:
        | "VERIFY"
        | "COUNTEREXAMPLE"
        | "SYNTHESIZE"
        | "SECURITY_REVIEW"
        | "TRACE_REPRO"
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
      claim_status: [
        "active",
        "retracted",
        "superseded",
        "verified",
        "disputed",
      ],
      code_execution_level: ["none", "sandboxed", "trusted"],
      edge_type: [
        "SUPPORTS",
        "CONTRADICTS",
        "REFINES",
        "DEPENDS_ON",
        "EQUIVALENT_TO",
      ],
      room_role: [
        "proposer",
        "challenger",
        "verifier",
        "synthesizer",
        "librarian",
      ],
      room_status: ["active", "synthesis_pending", "completed"],
      safety_level: ["low", "medium", "high"],
      synthesis_status: ["draft", "published", "superseded"],
      task_status: ["open", "claimed", "in_progress", "done", "failed"],
      task_type: [
        "VERIFY",
        "COUNTEREXAMPLE",
        "SYNTHESIZE",
        "SECURITY_REVIEW",
        "TRACE_REPRO",
      ],
    },
  },
} as const
