import { createClient } from "@supabase/supabase-js"

/** Service role — bypasses RLS. Never import in client components or public routes. */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
