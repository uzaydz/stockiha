// Import the supabase instance from main file
import { supabase, getSupabaseClient } from './supabase';
import { getAuthenticatedSupabase } from './supabase-auth-manager';

// Export the supabase instance for backward compatibility
export { supabase };

// Export a function to get the supabase client for backward compatibility
export { getSupabaseClient };

// Export authenticated client
export { getAuthenticatedSupabase };
