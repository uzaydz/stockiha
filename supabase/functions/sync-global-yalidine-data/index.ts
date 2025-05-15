// supabase/functions/sync-global-yalidine-data/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// const ENCRYPTION_KEY = Deno.env.get("YOUR_ENCRYPTION_KEY")!; // For actual decryption

// --- Helper: Decryption --- (Replace with actual decryption logic)
// function decrypt(encryptedText: string, key: string): string {
//   console.warn("Data is NOT being decrypted in this example!");
//   // Implement actual decryption (e.g., AES)
//   if (encryptedText.startsWith("encrypted(") && encryptedText.endsWith(`)_with_key(${key.substring(0,4)}...)`)) {
//     return encryptedText.substring("encrypted(".length, encryptedText.indexOf(")_with_key"));
//   }
//   return encryptedText; // Fallback if not matching expected pseudo-encrypted format
// }
// --- End Helper ---

// --- Helper: Yalidine API Fetch with Retries and Logging ---
async function fetchFromYalidine(endpoint: string, apiKey: string, apiToken: string, retries = 3, initialDelay = 1000) {
  const YALIDINE_API_BASE_URL = "https://api.yalidine.app/v1";
  let delay = initialDelay;

  

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${YALIDINE_API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
          "X-API-ID": apiKey,
          "X-API-TOKEN": apiToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[sync-yalidine] Yalidine API Error (${response.status}) for ${endpoint}. Attempt ${i + 1}/${retries}. Body: ${errorBody}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          // Don't retry for client errors like 401, 403, 404 unless it's 429 (rate limit)
          throw new Error(`Yalidine API Client Error (${response.status} for ${endpoint}): ${errorBody}`);
        }
        if (i === retries - 1) {
          throw new Error(`Yalidine API Error (${response.status} for ${endpoint}) after ${retries} attempts: ${errorBody}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      const responseData = await response.json();
      
      return responseData;
    } catch (e) {
      console.error(`[sync-yalidine] Fetch attempt ${i + 1}/${retries} for ${endpoint} failed: ${e.message}`);
      if (i === retries - 1) {
        // If this was the last attempt, rethrow the caught error or a new one if e is not an Error instance
        if (e instanceof Error) throw e;
        throw new Error(`All fetch attempts failed for ${endpoint}: ${e}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  // Should not be reached if retries > 0, but as a fallback:
  throw new Error(`[sync-yalidine] Failed to fetch from Yalidine for ${endpoint} after ${retries} attempts and all retries exhausted.`);
}

// --- Helper: Fetch all paginated data from Yalidine ---
async function fetchAllPaginatedData(baseEndpoint: string, apiKey: string, apiToken: string) {
  let allData: any[] = [];
  let page = 1;
  const pageSize = 100; // Yalidine API default is 100, max 1000. Adjust if needed.
  let hasMore = true;
  let totalFetched = 0;
  const PAGINATION_DELAY_MS = 500; // تأخير 500 مللي ثانية بين طلبات الصفحات

  

  while (hasMore) {
    const endpointWithPagination = `${baseEndpoint}?page=${page}&page_size=${pageSize}`;
    try {
      // Use the robust fetchFromYalidine for each page request
      const responseJson = await fetchFromYalidine(endpointWithPagination, apiKey, apiToken);

      if (responseJson && Array.isArray(responseJson.data)) {
        allData = allData.concat(responseJson.data);
        totalFetched += responseJson.data.length;
        hasMore = responseJson.has_more === true; // Ensure strict boolean check
        
        if (hasMore) {
          page++;
          
          await new Promise(resolve => setTimeout(resolve, PAGINATION_DELAY_MS));
        } else {
          
        }
      } else {
        console.warn(`[sync-yalidine] Unexpected response structure or no data array from ${endpointWithPagination}. Stopping pagination for ${baseEndpoint}. Response:`, responseJson);
        hasMore = false; // Stop if data format is not as expected
      }
    } catch (error) {
      console.error(`[sync-yalidine] Error fetching page ${page} for ${baseEndpoint}: ${error.message}. Halting pagination for this endpoint.`);
      // Depending on the error, you might want to rethrow or handle differently
      // For now, we stop pagination for this specific endpoint on error to prevent infinite loops on persistent errors.
      hasMore = false; 
      throw error; // Rethrow to be caught by the main sync process for this data type
    }
  }
  
  return allData;
}

// --- Helper: Upsert data to Supabase ---
async function upsertData(supabase: SupabaseClient, tableName: string, conflictColumn: string, data: any[], syncResults: any) {
  if (!data || data.length === 0) {
    
    return { data: [], error: null };
  }
  
  
  // Ensure all items have created_at and updated_at if your table expects them and they aren't auto-set
  // const now = new Date().toISOString();
  // const processedData = data.map(item => ({
  //   ...item,
  //   created_at: item.created_at || now, 
  //   updated_at: now
  // }));
  // Temporarily removing explicit created_at/updated_at setting to address schema cache issue.
  // Ensure your database tables handle these fields appropriately (e.g., with default values or triggers)
  // or that the columns do not exist if they are not needed.
  const processedData = data.map(item => {
    const { created_at, updated_at, ...restOfItem } = item; // eslint-disable-line @typescript-eslint/no-unused-vars
    return restOfItem;
  });

  const { data: result, error, count } = await supabase
    .from(tableName)
    .upsert(processedData, { 
      onConflict: conflictColumn, 
      ignoreDuplicates: false,
      returning: "representation", // Request the data of affected rows
      count: "exact"             // Request the exact count of affected rows
    }); 
  
  if (error) {
    console.error(`[sync-yalidine] Error upserting to ${tableName}:`, error); 
    syncResults.errors++;
    syncResults.message = error.message || JSON.stringify(error); 
  } else {
    
    
    // syncResults.synced = (result && result.length > 0) ? result.length : processedData.length;
    syncResults.synced = count !== null ? count : 0; // Use the exact count if available
    syncResults.message = ""; 
  }
  return { data: result, error };
}
// --- End Helper ---

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  let apiKey = "", apiToken = "";

  

  try {
    // 1. Fetch API credentials from DB
    
    const { data: config, error: configError } = await supabase
      .from("global_yalidine_configuration")
      .select("yalidine_api_key, yalidine_api_token")
      .eq("id", 1)
      .single();

    if (configError || !config || !config.yalidine_api_key || !config.yalidine_api_token) {
      console.error("[sync-yalidine] API configuration not found or incomplete in database.", configError);
      throw new Error("API configuration not found or incomplete in database.");
    }
    

    // --- !!! DECRYPTION POINT !!! ---
    // apiKey = decrypt(config.yalidine_api_key, ENCRYPTION_KEY);
    // apiToken = decrypt(config.yalidine_api_token, ENCRYPTION_KEY);
    apiKey = config.yalidine_api_key; // Replace with decrypted key
    apiToken = config.yalidine_api_token; // Replace with decrypted token
    // --- !!! END DECRYPTION POINT !!! ---

    const syncResults = {
      provinces: { synced: 0, errors: 0, message: "" },
      municipalities: { synced: 0, errors: 0, message: "" },
      centers: { synced: 0, errors: 0, message: "" },
    };

    // 2. Sync Provinces (Wilayas)
    try {
      
      const rawProvincesData = await fetchAllPaginatedData("/wilayas/", apiKey, apiToken);
      
      
      const provincesToUpsert = rawProvincesData.map((p: any) => {
        if (!p.id || !p.name) {
            console.warn("[sync-yalidine] Province item missing id or name:", p);
        }
        return {
            id: p.id, 
            name: p.name,
            is_deliverable: p.is_deliverable === 1 || p.is_deliverable === true, 
            zone: p.zone,
            // created_at and updated_at should be handled by DB defaults or triggers if they exist
        };
      });
      
      if (provincesToUpsert.length > 0) {
        await upsertData(supabase, "yalidine_provinces_global", "id", provincesToUpsert, syncResults.provinces);
        await supabase.from("global_yalidine_configuration").update({ last_global_provinces_sync: new Date().toISOString() }).eq("id", 1);
        
      } else {
        
      }
    } catch (e) {
      syncResults.provinces.message = e.message;
      syncResults.provinces.errors++;
      console.error("[sync-yalidine] Error syncing provinces:", e);
    }

    // 3. Sync Municipalities (Communes)
    try {
      
      const rawMunicipalitiesData = await fetchAllPaginatedData("/communes/", apiKey, apiToken);
      
      
      const municipalitiesToUpsert = rawMunicipalitiesData.map((m: any) => {
        if (!m.id || !m.name || !m.wilaya_id) {
            console.warn("[sync-yalidine] Municipality item missing id, name, or wilaya_id:", m);
        }
        return {
            id: m.id, 
            name: m.name,
            wilaya_id: m.wilaya_id, 
            wilaya_name: m.wilaya_name, 
            has_stop_desk: m.has_stop_desk === 1 || m.has_stop_desk === true, 
            is_deliverable: m.is_deliverable === 1 || m.is_deliverable === true, 
            delivery_time_parcel: m.delivery_time_parcel,
            delivery_time_payment: m.delivery_time_payment,
            // created_at and updated_at should be handled by DB defaults or triggers if they exist
        };
      });

      if (municipalitiesToUpsert.length > 0) {
        await upsertData(supabase, "yalidine_municipalities_global", "id", municipalitiesToUpsert, syncResults.municipalities);
        await supabase.from("global_yalidine_configuration").update({ last_global_municipalities_sync: new Date().toISOString() }).eq("id", 1);
        
      } else {
        
      }
    } catch (e) {
      syncResults.municipalities.message = e.message;
      syncResults.municipalities.errors++;
      console.error("[sync-yalidine] Error syncing municipalities:", e);
    }

    // 4. Sync Centers (Stop Desks)
    let centersApiCallSuccessful = false; // Flag to track API call success
    try {
      
      const rawCentersData = await fetchAllPaginatedData("/centers/", apiKey, apiToken);
      centersApiCallSuccessful = true; // API call was successful
      

      const centersToUpsert = rawCentersData.map((c: any) => {
        // Check for essential fields based on Yalidine's documentation for centers
        if (!c.center_id || !c.name || !c.commune_id || !c.wilaya_id) { 
            console.warn("[sync-yalidine] Center item missing center_id, name, commune_id, or wilaya_id:", c);
        }

        let lat: number | null = null;
        let lng: number | null = null;
        if (c.gps && typeof c.gps === 'string') {
          const parts = c.gps.split(',');
          if (parts.length === 2) {
            const parsedLat = parseFloat(parts[0].trim());
            const parsedLng = parseFloat(parts[1].trim());
            if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
              lat = parsedLat;
              lng = parsedLng;
            } else {
              // lat and lng remain null
              console.warn("[sync-yalidine] Could not parse lat/lng from GPS string:", c.gps, "for center_id:", c.center_id);
            }
          } else {
              console.warn("[sync-yalidine] GPS string does not appear to be a valid comma-separated lat,lng pair:", c.gps, "for center_id:", c.center_id);
          }
        }

        return {
            center_id: c.center_id, 
            name: c.name ? String(c.name).trim() : null, // Trim the name
            commune_id: c.commune_id,
            wilaya_id: c.wilaya_id,
            address: c.address || null, // Ensure address is null if not present
            lat: lat,
            lng: lng,
            commune_name: c.commune_name ? String(c.commune_name).trim() : null, 
            wilaya_name: c.wilaya_name ? String(c.wilaya_name).trim() : null,   
        };
      }).filter(c => {
        const hasRequiredFields = c.center_id && 
                                  c.name && 
                                  c.commune_id && // commune_id is also NOT NULL
                                  c.commune_name && 
                                  c.wilaya_id && // wilaya_id is also NOT NULL
                                  c.wilaya_name;
        if (!hasRequiredFields) {
          console.warn("[sync-yalidine] Filtering out center due to missing required (NOT NULL) fields after mapping. Center Data:", JSON.stringify(c));
        }
        return !!hasRequiredFields; // Ensure boolean return, and all checked fields are present
      });

      if (centersToUpsert.length > 0) {
        
        await upsertData(supabase, "yalidine_centers_global", "center_id", centersToUpsert, syncResults.centers);
        
      } else {
        
      }

    } catch (e) {
      syncResults.centers.message = e.message;
      syncResults.centers.errors++;
      console.error("[sync-yalidine] Error syncing centers:", e);
      // centersApiCallSuccessful remains false
    }

    // Update timestamp for centers if the API call was successful, even if no data was upserted
    if (centersApiCallSuccessful) {
      try {
        await supabase.from("global_yalidine_configuration").update({ last_global_centers_sync: new Date().toISOString() }).eq("id", 1);
        
      } catch (tsError) {
        console.error("[sync-yalidine] Error updating last_global_centers_sync timestamp:", tsError);
        // Optionally, you could add this to syncResults.centers.message or a general error message
        syncResults.centers.message = syncResults.centers.message ? `${syncResults.centers.message} | Failed to update sync timestamp.` : `Failed to update sync timestamp: ${tsError.message}`;
        syncResults.centers.errors++; 
      }
    }

    let status = 200;
    if (syncResults.provinces.errors > 0 || syncResults.municipalities.errors > 0 || syncResults.centers.errors > 0) {
        status = 207; // Multi-Status: some operations may have failed
        console.warn("[sync-yalidine] Global Yalidine Sync process completed with some errors.", syncResults);
    } else {
        
    }

    return new Response(JSON.stringify({ message: "Global Yalidine Sync process completed.", results: syncResults }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: status,
    });

  } catch (e) {
    console.error("[sync-yalidine] Fatal error in sync-global-yalidine-data function:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error: " + e.message, details: e.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
