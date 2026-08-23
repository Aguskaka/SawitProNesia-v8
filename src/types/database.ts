export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string;
          estate_id: string;
          created_by: string;
          type: string;
          note: string;
          value: string | null;
          activity_date: string;
          block_id: string | null;
        };
        Insert: {
          id?: string;
          estate_id: string;
          created_by: string;
          type: string;
          note: string;
          value?: string | null;
          activity_date?: string;
          block_id?: string | null;
        };
        Update: {
          id?: string;
          estate_id?: string;
          created_by?: string;
          type?: string;
          note?: string;
          value?: string | null;
          activity_date?: string;
          block_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activities_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      annual_block_budgets: {
        Row: {
          id: string;
          owner_id: string;
          estate_id: string;
          block_id: string;
          budget_year: number;
          category: string;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          estate_id: string;
          block_id: string;
          budget_year: number;
          category: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          estate_id?: string;
          block_id?: string;
          budget_year?: number;
          category?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "annual_block_budgets_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "annual_block_budgets_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      annual_budget_categories: {
        Row: {
          id: string;
          owner_id: string;
          estate_id: string;
          budget_year: number;
          category: string;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          estate_id: string;
          budget_year: number;
          category: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          estate_id?: string;
          budget_year?: number;
          category?: string;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "annual_budget_categories_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      annual_budgets: {
        Row: {
          id: string;
          owner_id: string;
          estate_id: string;
          budget_year: number;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          estate_id: string;
          budget_year: number;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          estate_id?: string;
          budget_year?: number;
          amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "annual_budgets_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      blocks: {
        Row: {
          id: string;
          estate_id: string;
          name: string;
          area: number;
          trees: number;
          planting_year: number | null;
          variety: string | null;
          status: string;
          created_at: string;
          planting_date: string | null;
          soil_type: string | null;
          fertilizer_pattern: string | null;
        };
        Insert: {
          id?: string;
          estate_id: string;
          name: string;
          area?: number;
          trees?: number;
          planting_year?: number | null;
          variety?: string | null;
          status?: string;
          created_at?: string;
          planting_date?: string | null;
          soil_type?: string | null;
          fertilizer_pattern?: string | null;
        };
        Update: {
          id?: string;
          estate_id?: string;
          name?: string;
          area?: number;
          trees?: number;
          planting_year?: number | null;
          variety?: string | null;
          status?: string;
          created_at?: string;
          planting_date?: string | null;
          soil_type?: string | null;
          fertilizer_pattern?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      estate_members: {
        Row: {
          estate_id: string;
          user_id: string;
          role: string;
        };
        Insert: {
          estate_id: string;
          user_id: string;
          role?: string;
        };
        Update: {
          estate_id?: string;
          user_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estate_members_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      estates: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          area: number;
          trees: number;
          prod: number;
          revenue: number;
          cost: number;
          history: Json;
          created_at: string;
          latitude: number | null;
          longitude: number | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          area?: number;
          trees?: number;
          prod?: number;
          revenue?: number;
          cost?: number;
          history?: Json;
          created_at?: string;
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          area?: number;
          trees?: number;
          prod?: number;
          revenue?: number;
          cost?: number;
          history?: Json;
          created_at?: string;
          latitude?: number | null;
          longitude?: number | null;
        };
        Relationships: [];
      };
      fertilizer_execution_items: {
        Row: {
          id: string;
          owner_id: string;
          execution_id: string;
          program_item_id: string;
          operation_id: string | null;
          actual_quantity_kg: number;
          actual_unit_price: number;
          actual_cost: number;
          actual_dose_per_tree: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          execution_id: string;
          program_item_id: string;
          operation_id?: string | null;
          actual_quantity_kg?: number;
          actual_unit_price?: number;
          actual_cost?: number;
          actual_dose_per_tree?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          execution_id?: string;
          program_item_id?: string;
          operation_id?: string | null;
          actual_quantity_kg?: number;
          actual_unit_price?: number;
          actual_cost?: number;
          actual_dose_per_tree?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fertilizer_execution_items_execution_id_fkey";
            columns: ["execution_id"];
            isOneToOne: false;
            referencedRelation: "fertilizer_executions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fertilizer_execution_items_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "operations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fertilizer_execution_items_program_item_id_fkey";
            columns: ["program_item_id"];
            isOneToOne: false;
            referencedRelation: "fertilizer_program_items";
            referencedColumns: ["id"];
          },
        ];
      };
      fertilizer_executions: {
        Row: {
          id: string;
          owner_id: string;
          program_id: string;
          estate_id: string;
          block_id: string;
          execution_date: string;
          worker: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          program_id: string;
          estate_id: string;
          block_id: string;
          execution_date: string;
          worker?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          program_id?: string;
          estate_id?: string;
          block_id?: string;
          execution_date?: string;
          worker?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fertilizer_executions_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fertilizer_executions_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fertilizer_executions_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "fertilizer_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      fertilizer_program_items: {
        Row: {
          id: string;
          owner_id: string;
          program_id: string;
          fertilizer_name: string;
          standard_dose: number;
          custom_dose: number;
          dose_unit: string;
          requirement_kg: number;
          unit_price: number;
          estimated_cost: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          program_id: string;
          fertilizer_name: string;
          standard_dose?: number;
          custom_dose?: number;
          dose_unit: string;
          requirement_kg?: number;
          unit_price?: number;
          estimated_cost?: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          program_id?: string;
          fertilizer_name?: string;
          standard_dose?: number;
          custom_dose?: number;
          dose_unit?: string;
          requirement_kg?: number;
          unit_price?: number;
          estimated_cost?: number;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fertilizer_program_items_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "fertilizer_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      fertilizer_programs: {
        Row: {
          id: string;
          owner_id: string;
          estate_id: string;
          block_id: string;
          pattern: string;
          planned_date: string;
          period_label: string | null;
          recommendation_source: string | null;
          status: string;
          note: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string | null;
          planning_mode: string;
          target_age_months: number | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          estate_id: string;
          block_id: string;
          pattern: string;
          planned_date: string;
          period_label?: string | null;
          recommendation_source?: string | null;
          status?: string;
          note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          planning_mode?: string;
          target_age_months?: number | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          estate_id?: string;
          block_id?: string;
          pattern?: string;
          planned_date?: string;
          period_label?: string | null;
          recommendation_source?: string | null;
          status?: string;
          note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          planning_mode?: string;
          target_age_months?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fertilizer_programs_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fertilizer_programs_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      harvests: {
        Row: {
          id: string;
          estate_id: string;
          block_id: string;
          created_by: string;
          harvest_date: string;
          weight_kg: number;
          bunches: number;
          price_per_kg: number;
          revenue: number;
          worker: string | null;
          note: string | null;
          created_at: string;
          updated_at: string | null;
          plan_id: string | null;
          source: string;
        };
        Insert: {
          id?: string;
          estate_id: string;
          block_id: string;
          created_by: string;
          harvest_date?: string;
          weight_kg: number;
          bunches?: number;
          price_per_kg?: number;
          revenue?: number;
          worker?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
          plan_id?: string | null;
          source?: string;
        };
        Update: {
          id?: string;
          estate_id?: string;
          block_id?: string;
          created_by?: string;
          harvest_date?: string;
          weight_kg?: number;
          bunches?: number;
          price_per_kg?: number;
          revenue?: number;
          worker?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
          plan_id?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "harvests_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "harvests_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "harvests_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      operations: {
        Row: {
          id: string;
          estate_id: string;
          block_id: string | null;
          created_by: string;
          type: string;
          op_date: string;
          description: string;
          quantity: number;
          unit: string | null;
          unit_price: number;
          labor_days: number;
          labor_rate: number;
          worker: string | null;
          total_cost: number;
          note: string | null;
          created_at: string;
          dose_per_tree: number;
          updated_at: string | null;
          plan_id: string | null;
          fertilizer_program_id: string | null;
          source: string;
        };
        Insert: {
          id?: string;
          estate_id: string;
          block_id?: string | null;
          created_by: string;
          type: string;
          op_date?: string;
          description: string;
          quantity?: number;
          unit?: string | null;
          unit_price?: number;
          labor_days?: number;
          labor_rate?: number;
          worker?: string | null;
          total_cost?: number;
          note?: string | null;
          created_at?: string;
          dose_per_tree?: number;
          updated_at?: string | null;
          plan_id?: string | null;
          fertilizer_program_id?: string | null;
          source?: string;
        };
        Update: {
          id?: string;
          estate_id?: string;
          block_id?: string | null;
          created_by?: string;
          type?: string;
          op_date?: string;
          description?: string;
          quantity?: number;
          unit?: string | null;
          unit_price?: number;
          labor_days?: number;
          labor_rate?: number;
          worker?: string | null;
          total_cost?: number;
          note?: string | null;
          created_at?: string;
          dose_per_tree?: number;
          updated_at?: string | null;
          plan_id?: string | null;
          fertilizer_program_id?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operations_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_fertilizer_program_id_fkey";
            columns: ["fertilizer_program_id"];
            isOneToOne: false;
            referencedRelation: "fertilizer_programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operations_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          estate_id: string;
          block_id: string | null;
          created_by: string;
          type: string;
          planned_date: string;
          target_quantity: number;
          unit: string | null;
          note: string | null;
          created_at: string;
          updated_at: string | null;
          reminder_days: number;
        };
        Insert: {
          id?: string;
          estate_id: string;
          block_id?: string | null;
          created_by: string;
          type: string;
          planned_date: string;
          target_quantity?: number;
          unit?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
          reminder_days?: number;
        };
        Update: {
          id?: string;
          estate_id?: string;
          block_id?: string | null;
          created_by?: string;
          type?: string;
          planned_date?: string;
          target_quantity?: number;
          unit?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string | null;
          reminder_days?: number;
        };
        Relationships: [
          {
            foreignKeyName: "plans_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plans_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          email: string;
          role: string;
          estate_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          email: string;
          role: string;
          estate_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          email?: string;
          role?: string;
          estate_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_estate_id_fkey";
            columns: ["estate_id"];
            isOneToOne: false;
            referencedRelation: "estates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      spn_current_access: {
        Args: Record<PropertyKey, never>;
        Returns: { role: string; estate_id: string | null }[];
      };
      spn_assign_member_by_email: {
        Args: { p_email: string; p_role: string; p_estate_id: string | null };
        Returns: string;
      };
      spn_list_workspace_members: {
        Args: Record<PropertyKey, never>;
        Returns: { id: string; email: string; role: string; estate_id: string | null; status: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
