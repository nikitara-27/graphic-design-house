import type { SupabaseClient } from "@supabase/supabase-js";
import { presenceConfig } from "./presence";

let client: Promise<SupabaseClient> | null = null;

/**
 * One shared Supabase client (live presence + the Design Resources board), loaded on first use.
 * Null when Supabase isn't configured, so callers fall back to working without it.
 */
export function getSupabase(): Promise<SupabaseClient> | null {
  const config = presenceConfig();
  if (!config) return null;
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 10 } },
    }),
  );
  return client;
}
