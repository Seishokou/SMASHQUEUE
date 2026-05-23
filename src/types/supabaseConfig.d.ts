declare module "../../supabase/supabaseConfig" {
  import type { SupabaseClient } from "@supabase/supabase-js";

  export const isSupabaseConfigured: boolean;
  export const supabase: SupabaseClient | null;
}
