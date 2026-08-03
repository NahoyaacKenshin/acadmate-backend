/**
 * Supabase Client (Server-side)
 *
 * Initializes a single Supabase client using the service role key.
 * The service role key bypasses Row Level Security (RLS), allowing
 * the backend to upload, retrieve, and delete files securely.
 *
 * Used exclusively for Supabase Storage operations in the AI Notebook pipeline.
 */

import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/config/env';

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.'
  );
}

export const supabase = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
