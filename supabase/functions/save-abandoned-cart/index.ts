import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AbandonedCartData, CustomFieldData, corsHeaders, AbandonedCartItem } from '../_shared/types.ts';

console.log('Function save-abandoned-cart loaded. CORS Headers:', corsHeaders);

// Local enum definition for robustness, matching _shared/types.ts
enum AbandonedCartStatus { 
  PENDING = 'pending',
  CONTACTED = 'contacted',
  CONVERTED = 'converted',
  CLOSED = 'closed',
}

interface FrontendFlatPayload {
  organization_id: string;
  customer_name?: string | null;
  customer_phone: string;
  customer_email?: string | null;
  customer_address?: string | null;
  province?: string | null;
  municipality?: string | null;
  notes?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  calculated_delivery_fee?: number | null;
  total_amount?: number | null;
  product_id?: string;
  product_variant_id?: string | null;
  product_color_id?: string | null;
  product_size_id?: string | null;
  quantity?: number;
  product_name?: string;
  product_price?: number;
  custom_fields_data?: CustomFieldData[] | null;
  delivery_option?: string;
  payment_method?: string;
  status?: string; 
  items?: AbandonedCartItem[]; // This is the array of cart items from the payload
}

function determineVariantId(
  payloadVariantId?: string | null,
  colorId?: string | null,
  sizeId?: string | null
): string | null {
  if (payloadVariantId) return payloadVariantId;
  if (colorId && sizeId) return `${colorId}_${sizeId}`;
  if (colorId) return colorId;
  if (sizeId) return sizeId;
  return null;
}

serve(async (req: Request) => {
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Received request: ${req.method} ${req.url}`);
  console.log('Request headers:');
  for (const [key, value] of req.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  console.log(`Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Server config error: Missing Supabase URL or Service Key');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    let flatPayload: FrontendFlatPayload;
    let requestBodyAsText: string = ''; // Variable to store the raw text
    try {
      console.log('Attempting to read request body as text...');
      requestBodyAsText = await req.text();
      console.log('Request body as text:', requestBodyAsText);

      if (!requestBodyAsText || requestBodyAsText.trim() === '') {
        console.error('Request body is empty after reading as text.');
        return new Response(JSON.stringify({
          error: 'Request body is empty.',
          details: 'The server received an empty request body.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400, 
        });
      }

      console.log('Attempting to parse the read text body with JSON.parse()...');
      flatPayload = JSON.parse(requestBodyAsText);
      console.log('Successfully parsed flatPayload from text:', flatPayload);
    } catch (parsingError: any) {
      console.error('Error during JSON.parse(requestBodyAsText):', parsingError.message);
      console.error('JSON.parse() stack trace:', parsingError.stack);
      console.error('The text that failed to parse was:', requestBodyAsText); // Log the problematic text
      return new Response(JSON.stringify({
        error: `Failed to parse JSON body. Error: ${parsingError.message}`,
        details: 'The request body could not be parsed as JSON after being read as text. It might be malformed or contain encoding issues.',
        problematic_text_snippet: requestBodyAsText.substring(0, 200) + (requestBodyAsText.length > 200 ? '...' : '') // Send a snippet to client
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, 
      });
    }

    // Transform flatPayload to AbandonedCartData
    const cartData: AbandonedCartData = {
      organization_id: flatPayload.organization_id,
      customer_name: flatPayload.customer_name,
      customer_phone: flatPayload.customer_phone,
      customer_email: flatPayload.customer_email,
      customer_address: flatPayload.customer_address,
      province: flatPayload.province,
      municipality: flatPayload.municipality,
      // Map root-level product details if present in payload
      product_id: flatPayload.product_id, 
      product_color_id: flatPayload.product_color_id,
      product_size_id: flatPayload.product_size_id,
      quantity: flatPayload.quantity,
      // cart_items will handle the array of items, including potentially this single product below
      notes: flatPayload.notes,
      currency: flatPayload.currency,
      subtotal: flatPayload.subtotal,
      calculated_delivery_fee: flatPayload.calculated_delivery_fee,
      total_amount: flatPayload.total_amount,
      delivery_option: flatPayload.delivery_option,
      payment_method: flatPayload.payment_method,
      cart_items: [], // Initialize and then populate based on conditions
      custom_fields_data: Array.isArray(flatPayload.custom_fields_data) ? flatPayload.custom_fields_data : [],
      status: flatPayload.status ? flatPayload.status as AbandonedCartStatus : AbandonedCartStatus.PENDING,
      // id, created_at, updated_at are not set here, handled by DB or later logic
    };

    // Populate cart_items based on the new logic
    if (flatPayload.items && Array.isArray(flatPayload.items) && flatPayload.items.length > 0) {
      cartData.cart_items = flatPayload.items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        product_color_id: item.product_color_id,
        product_size_id: item.product_size_id,
        variant_id: item.variant_id,
        name: item.name,
        price: item.price === null ? undefined : item.price, // Handle null price
        image_url: item.image_url,
      }));
    } else if (cartData.product_id && typeof cartData.quantity !== 'undefined') {
      cartData.cart_items = [{
        product_id: cartData.product_id,
        quantity: cartData.quantity,
        product_color_id: cartData.product_color_id,
        product_size_id: cartData.product_size_id,
        // variant_id can be omitted if not applicable or derived elsewhere if needed
      }];
    } else {
      cartData.cart_items = []; // Ensure it's an empty array if no items and no root product
    }

    // VALIDATION (now on the transformed cartData)
    if (!cartData.organization_id || !cartData.customer_phone) {
      console.warn('Validation failed: organization_id or customer_phone missing. Data:', cartData);
      return new Response(JSON.stringify({ error: 'organization_id and customer_phone are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log(`Processing cart for org: ${cartData.organization_id}, phone: ${cartData.customer_phone}`);

    // DATABASE OPERATIONS (using transformed cartData)
    const { data: existingCart, error: fetchError } = await supabaseAdmin
      .from('abandoned_carts')
      .select('id, cart_items, custom_fields_data, status')
      .eq('organization_id', cartData.organization_id)
      .eq('customer_phone', cartData.customer_phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing cart:', fetchError);
      throw fetchError;
    }

    if (existingCart && existingCart.status === AbandonedCartStatus.PENDING) {
      console.log(`Existing PENDING cart found (ID: ${existingCart.id}). Merging and updating.`);
      
      const existingCartItems = Array.isArray(existingCart.cart_items) ? existingCart.cart_items : [];
      const currentCartItems = Array.isArray(cartData.cart_items) ? cartData.cart_items : [];
      const mergedItems = mergeCartItems(existingCartItems, currentCartItems);

      const existingCustomFields = Array.isArray(existingCart.custom_fields_data) ? existingCart.custom_fields_data : [];
      const currentCustomFields = Array.isArray(cartData.custom_fields_data) ? cartData.custom_fields_data : [];
      const mergedCustomFields = mergeCustomFields(existingCustomFields, currentCustomFields);
      
      const updatePayload: Partial<AbandonedCartData> = {
        ...cartData, // Base new data on transformed cartData
        cart_items: mergedItems,
        custom_fields_data: mergedCustomFields,
        updated_at: new Date().toISOString(),
      };
      delete updatePayload.created_at; // Should not be updated
      delete updatePayload.id;         // id is used in .eq(), not in payload

      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('abandoned_carts')
        .update(updatePayload)
        .eq('id', existingCart.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating abandoned cart:', updateError);
        throw updateError;
      }
      console.log('Abandoned cart updated successfully:', updatedData);
      return new Response(JSON.stringify(updatedData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else {
      console.log('No existing PENDING cart found or status not PENDING. Creating new cart.');
      const insertPayload: AbandonedCartData = {
        ...cartData, // Base new data on transformed cartData
        status: AbandonedCartStatus.PENDING, // Ensure status is PENDING for new cart
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      delete insertPayload.id; // DB will generate ID

      const { data: newData, error: insertError } = await supabaseAdmin
        .from('abandoned_carts')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting new abandoned cart:', insertError);
        throw insertError;
      }
      console.log('Abandoned cart saved successfully:', newData);
      return new Response(JSON.stringify(newData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 });
    }

  } catch (error: any) {
    // Enhanced general error logging
    console.error('Caught in general error processing block. Raw error object:', error);
    let errorResponseMessage = 'An unexpected error occurred';
    let stackPreview = 'No stack trace available';
    let errorDetails: string | null = null; // Initialize as string | null

    if (error instanceof Error) {
      console.error('Error Type: Standard Error');
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      errorResponseMessage = error.message;
      if (error.stack) {
        stackPreview = error.stack.split('\n').slice(0, 7).join(' ||| '); // First 7 lines of stack, joined
      }
    } else if (typeof error === 'object' && error !== null) {
      console.error('Error Type: Object (not Error instance)');
      console.error('Error Properties:', Object.keys(error));
      try {
        // Attempt to get a meaningful message from common error object structures
        const potentialMessage = (error as any).message || (error as any).error || (error as any).details;
        if (potentialMessage) errorResponseMessage = String(potentialMessage);
        
        const errorString = JSON.stringify(error);
        console.error('Error as JSON string (first 500 chars):', errorString.substring(0, 500));
        if (!potentialMessage) errorResponseMessage = errorString.substring(0, 200); // Fallback to snippet if no clear message
        errorDetails = errorString.substring(0, 500); // Assign string here
      } catch (stringifyError) {
        console.error('Could not stringify error object:', stringifyError);
        errorResponseMessage = 'Error object could not be stringified.';
        errorDetails = 'Could not stringify error object.'; // Assign string here
      }
    } else {
      console.error('Error Type: Primitive or unknown');
      const errorString = String(error);
      console.error('Error Value:', errorString);
      errorResponseMessage = errorString.substring(0,200);
      errorDetails = errorString.substring(0, 500); // Assign string here
    }

    return new Response(JSON.stringify({ 
      error: `General error processing request: ${errorResponseMessage}`,
      details: errorDetails, // Now compatible with string | null
      stack_preview: stackPreview,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }); // Standardized
  }
});

function mergeCartItems(existingItems: AbandonedCartItem[], newItems: AbandonedCartItem[]): AbandonedCartItem[] {
    const itemMap = new Map<string, AbandonedCartItem>();
    (existingItems || []).forEach(item => {
        if (item && typeof item.product_id !== 'undefined') {
            itemMap.set(String(item.product_id) + (item.variant_id || ''), item);
        }
    });
    (newItems || []).forEach(item => {
        if (item && typeof item.product_id !== 'undefined') {
            const key = String(item.product_id) + (item.variant_id || '');
            if (itemMap.has(key)) {
                const existing = itemMap.get(key)!;
                const existingQuantity = typeof existing.quantity === 'number' ? existing.quantity : 0;
                const itemQuantity = typeof item.quantity === 'number' ? item.quantity : 0;
                itemMap.set(key, { ...existing, ...item, quantity: existingQuantity + itemQuantity });
            } else {
                itemMap.set(key, item);
            }
        }
    });
    return Array.from(itemMap.values());
}

function mergeCustomFields(existingFields: CustomFieldData[], newFields: CustomFieldData[]): CustomFieldData[] {
    const fieldMap = new Map<string, CustomFieldData>();
    (existingFields || []).forEach(field => {
        if (field && typeof field.name !== 'undefined') {
            fieldMap.set(String(field.name), field);
        }
    });
    (newFields || []).forEach(field => {
        if (field && typeof field.name !== 'undefined') {
            fieldMap.set(String(field.name), field); 
        }
    });
    return Array.from(fieldMap.values());
}

console.log('Function save-abandoned-cart ready.');
