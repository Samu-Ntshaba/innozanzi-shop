import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin() {
  const configuredUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!configuredUrl || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured");
  }

  const url = new URL(configuredUrl);
  url.pathname = "";
  url.search = "";
  url.hash = "";

  return createClient(url.origin, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
