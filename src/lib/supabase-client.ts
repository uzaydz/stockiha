// Import the supabase instance directly from supabase.ts
import { supabase } from './supabase';

// Export the supabase instance for backward compatibility
export { supabase };

// Export a function to get the supabase client for backward compatibility
export const getSupabaseClient = () => supabase;