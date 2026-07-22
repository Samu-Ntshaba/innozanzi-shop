import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
