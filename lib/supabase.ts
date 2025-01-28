import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence
    storageKey: 'taskhub-auth', // Custom storage key
    storage: typeof window !== 'undefined' ? window.localStorage : undefined, // Use localStorage when available
    autoRefreshToken: true, // Automatically refresh the token
  },
});