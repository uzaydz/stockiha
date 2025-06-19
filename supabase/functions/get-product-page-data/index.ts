import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Define an interface for the expected product data structure for better type safety
// This should now match the structure returned by the get_complete_product_data RPC call
interface ProductPageData {
  product: any; // Replace 'any' with a more specific type if available
  colors: any[];
  sizes: any[];
  form_settings: any | null; // Can be an object or null
  marketing_settings: any | null; // Can be an object or null
  reviews: any[];
}

Deno.serve(async (req: Request) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Use the service role key to create a Supabase client with admin privileges
    // This is secure because this key is only available on the server-side
    const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: {
        // Automatically authenticate as a service role user
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // --- Extract slug and organization_id from request body ---
    let productSlug: string | undefined;
    let organizationId: string | undefined;

    try {
      const body = await req.json();
      productSlug = body.slug;
      organizationId = body.organization_id;
    } catch (jsonError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!productSlug) {
      const errorMsg = 'Product slug (slug) is required in body';
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!organizationId) {
      const errorMsg = 'Organization ID (organization_id) is required in body';
      return new Response(JSON.stringify({ error: errorMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // --- Call the RPC function ---
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_complete_product_data', {
      p_slug: productSlug,
      p_org_id: organizationId,
    });

    if (rpcError) {
      // Check for specific error codes if needed, e.g., P0001 for "Product not found" if you raise custom errors in SQL
      // For now, assume any RPC error means product not found or other critical issue.
      let statusCode = 500;
      let errorMessage = 'Failed to retrieve product data.';

      if (rpcError.message.includes('No data returned from CTE') || rpcError.message.includes('null value in column \"product\"')) {
        // This specific error might occur if the product_details subquery returns no rows (product not found)
        // and the outer SELECT tries to access properties of a NULL product_details.
        // Or if the product itself is null from the main query within the RPC
        statusCode = 404;
        errorMessage = 'Product not found or not available.';
      } else if (rpcError.details?.includes('limit_1')) { // Example custom error code check
          statusCode = 404;
          errorMessage = 'Product not found (CTE did not return a row).';
      }

      return new Response(JSON.stringify({ error: errorMessage, details: rpcError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      });
    }
    
    // The RPC function is designed to return NULL if the product itself is not found/active.
    // The top-level rpcData would be null in that case.
    if (rpcData === null || rpcData.product === null) {
        const errorMsg = 'Product not found or not available.';
        return new Response(JSON.stringify({ error: errorMsg }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        });
    }

    // --- Prepare the data to be returned ---
    // The rpcData should directly be the ProductPageData structure.
    // We might need to transform it slightly if the client expects a different top-level structure.
    // For now, assume rpcData is what the client (ProductDataLoader) expects.
    // The SQL function already structures it as: { product: {...}, colors: [], sizes: [], form_settings: {}, marketing_settings: {}, reviews: [] }
    
    const productPagePayload: ProductPageData = {
        product: rpcData.product || {}, // Ensure product is an object
        colors: rpcData.colors || [],
        sizes: rpcData.sizes || [],
        // The SQL now returns form_settings as a single object or null directly under 'form_settings_data'
        // and marketing_settings as a single object or null directly under 'marketing_settings_data'.
        // The main JSON object from SQL has keys 'form_settings', 'marketing_settings', etc.
        form_settings: rpcData.form_settings, // This should be the single form object or null
        marketing_settings: rpcData.marketing_settings, // This should be the single marketing settings object or null
        reviews: rpcData.reviews || [],
    };
    
    // The client-side getProductPageData in product-page.ts expects the whole payload directly.
    // The ProductDataLoader.tsx then accesses data.product, data.colors etc.
    // So, the structure productPagePayload should be compatible.

    let responseBodyString;
    try {
      responseBodyString = JSON.stringify(productPagePayload);
    } catch (stringifyError) {
      return new Response(JSON.stringify({ error: 'Failed to stringify product data on server', details: (stringifyError as Error).message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(responseBodyString, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMsg = (error as Error).message || 'Internal Server Error';
    // Avoid circular JSON stringify if error has complex properties
    const simpleError = { message: (error as Error).message, stack: (error as Error).stack, name: (error as Error).name }; 
    
    return new Response(JSON.stringify({ error: errorMsg, details: simpleError }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
