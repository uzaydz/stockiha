// supabase/functions/get-global-yalidine-sync-info/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// IMPORTANT: Set these in your Supabase project's environment variables
// e.g., in the Supabase dashboard under Project Settings > Functions
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Use service_role_key for server-side operations

serve(async (req: Request) => {
  // Standard CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*", // Be more specific in production!
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Create a Supabase client with the service role key for elevated privileges
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch the single configuration row
    const { data, error } = await supabase
      .from("global_yalidine_configuration")
      .select(
        "yalidine_api_key, last_global_provinces_sync, last_global_municipalities_sync, last_global_centers_sync"
      )
      .eq("id", 1) // Assuming 'id' is 1 for the single global config row
      .single(); // .single() expects exactly one row or returns an error

    if (error) {
      // If .single() returns an error (e.g., no rows found, or more than one row)
      if (error.code === 'PGRST116') { // PGRST116: Row count mismatch (0 or >1 rows)
         // This could mean the config row hasn't been created yet or there's an issue.
         // For a fresh setup, it's possible it doesn't exist, so we can return defaults or a specific status.
        return new Response(JSON.stringify({
          apiKeysSet: false,
          lastGlobalProvincesSync: null,
          lastGlobalMunicipalitiesSync: null,
          lastGlobalCentersSync: null,
          message: "Configuration not initialized or ambiguous."
        }), {
          status: 404, // Or 200 with a specific message, depending on how frontend handles it
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // If data is null but no error, it's unexpected with .single() but good to check
    if (!data) {
      return new Response(JSON.stringify({ error: "Configuration data is unexpectedly null." }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const responsePayload = {
      // Check if API key is present and not just empty or whitespace
      apiKeysSet: !!(data.yalidine_api_key && data.yalidine_api_key.trim() !== ""), 
      lastGlobalProvincesSync: data.last_global_provinces_sync,
      lastGlobalMunicipalitiesSync: data.last_global_municipalities_sync,
      lastGlobalCentersSync: data.last_global_centers_sync,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal Server Error: " + e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
