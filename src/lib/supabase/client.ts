import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client for FrontOffice.
 *
 * This is intentionally small for the backend-foundation build.
 * Authentication and typed database helpers will be added in the next build.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
   throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
}

if (!supabaseAnonKey) {
   throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(
   supabaseUrl,
   supabaseAnonKey,
);
