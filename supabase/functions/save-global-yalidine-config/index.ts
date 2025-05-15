// supabase/functions/save-global-yalidine-config/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// IMPORTANT: Set these in your Supabase project's environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// For actual encryption, you'd also need an encryption key, ideally from env vars
// const ENCRYPTION_KEY = Deno.env.get("YOUR_ENCRYPTION_KEY")!;

serve(async (req: Request) => {
   // DEBUG LOG

  if (req.method === "OPTIONS") {
     // DEBUG LOG
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    console.warn(`[save-global-yalidine-config] Method Not Allowed: ${req.method}`); // DEBUG LOG
    return new Response(JSON.stringify({ error: "Method Not Allowed", received_method: req.method }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

   // DEBUG LOG
  try {
    const { apiKey, apiToken } = await req.json();

    if (!apiKey || !apiToken) {
       // DEBUG LOG
      return new Response(JSON.stringify({ error: "API Key and API Token are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // --- !!! ENCRYPTION POINT !!! ---
    // In a real application, encrypt apiKey and apiToken here before saving.
    // Example (conceptual - requires an actual encryption library and key management):
    // const encryptedApiKey = encrypt(apiKey, ENCRYPTION_KEY);
    // const encryptedApiToken = encrypt(apiToken, ENCRYPTION_KEY);
    // For now, we'll store them as is, but this is NOT secure for production.
    const yalidine_api_key_to_store = apiKey; // Replace with encryptedApiKey
    const yalidine_api_token_to_store = apiToken; // Replace with encryptedApiToken
    // --- !!! END ENCRYPTION POINT !!! ---

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from("global_yalidine_configuration")
      .update({
        yalidine_api_key: yalidine_api_key_to_store,
        yalidine_api_token: yalidine_api_token_to_store,
        // updated_at is handled by the database trigger
      })
      .eq("id", 1) // Assuming the single config row has id = 1
      .select() // To get the updated row back
      .single();

    if (error) {
      console.error("[save-global-yalidine-config] Error updating Yalidine config in DB:", error); // DEBUG LOG
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!data) {
        console.warn("[save-global-yalidine-config] Failed to update configuration or configuration not found (id=1)."); // DEBUG LOG
        return new Response(JSON.stringify({ error: "Failed to update configuration or configuration not found." }), {
            status: 404, 
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
     // DEBUG LOG
    return new Response(JSON.stringify({ message: "Configuration saved successfully.", data }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    });

  } catch (e) {
    console.error("[save-global-yalidine-config] Unhandled error in POST handler:", e); // DEBUG LOG
    // Check if the error is from req.json() failing (e.g. invalid JSON)
    if (e instanceof SyntaxError && e.message.includes("JSON")) {
        console.warn("[save-global-yalidine-config] Invalid JSON payload received."); // DEBUG LOG
        return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
            status: 400, 
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error: " + e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});

// Conceptual encryption function (replace with a proper library)
// function encrypt(text: string, key: string): string {
//   // Implement actual encryption logic here (e.g., using AES)
//   // This is just a placeholder
//   console.warn("Data is NOT being encrypted in this example!");
//   return \`encrypted(\${text})_with_key(\${key.substring(0,4)}...\`;
// }
