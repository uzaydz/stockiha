/**
 * Fix for Yalidine API's direction swapping issue
 * This script addresses the problem where from_wilaya_id and to_wilaya_id parameters
 * are being swapped during API calls and data processing
 */

const { createClient } = require('@supabase/supabase-js');

// Configure Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main fix function to correct the direction swapping issue
 */
async function fixYalidineDirectionSwap() {
  console.log('Starting Yalidine direction swap fix...');
  
  try {
    // 1. Ensure the triggers are disabled
    await disableRedirectTrigger();
    
    // 2. Get the organization ID and origin wilaya
    const orgId = 'fed872f9-1ade-4351-b020-5598fda976fe';
    const originWilayaId = await getOrganizationOriginWilaya(orgId);
    
    if (!originWilayaId) {
      console.error('Could not determine origin wilaya for organization.');
      return false;
    }
    
    // 3. Correct existing data by swapping directions
    await swapDirectionsInExistingData(orgId, originWilayaId);
    
    console.log('Yalidine direction swap fix completed successfully.');
    return true;
  } catch (error) {
    console.error('Error fixing Yalidine direction swap:', error);
    return false;
  }
}

/**
 * Disable the redirect trigger to prevent data from being moved to yalidine_fees_new
 */
async function disableRedirectTrigger() {
  console.log('Disabling yalidine_fees_redirect_trigger...');
  
  try {
    await supabase.rpc('disable_yalidine_redirect_trigger');
    console.log('Redirect trigger disabled successfully.');
    return true;
  } catch (error) {
    console.error('Error disabling redirect trigger:', error);
    
    // Try direct SQL approach as fallback
    try {
      const { error: sqlError } = await supabase.query(`
        ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;
      `);
      
      if (sqlError) throw sqlError;
      console.log('Redirect trigger disabled using direct SQL.');
      return true;
    } catch (sqlError) {
      console.error('Failed to disable trigger using direct SQL:', sqlError);
      throw new Error('Could not disable redirect trigger.');
    }
  }
}

/**
 * Get the origin wilaya ID for an organization from settings
 */
async function getOrganizationOriginWilaya(organizationId) {
  console.log(`Getting origin wilaya for organization ${organizationId}...`);
  
  try {
    // Try to get the origin wilaya from settings
    const { data: settings, error } = await supabase
      .from('shipping_provider_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('provider_id', 5) // Yalidine provider ID
      .single();
    
    if (error) throw error;
    
    const originWilayaId = settings?.settings?.origin_wilaya_id;
    
    if (originWilayaId) {
      console.log(`Found origin wilaya ID: ${originWilayaId}`);
      return originWilayaId;
    }
    
    // If not found, try to get from RPC function
    const { data: origin, error: originError } = await supabase
      .rpc('get_yalidine_origin_wilaya', { org_id: organizationId });
    
    if (originError) throw originError;
    
    if (origin) {
      console.log(`Found origin wilaya ID from RPC: ${origin}`);
      return origin;
    }
    
    // Default to Algiers (16) if no other option works
    console.log('No origin wilaya found, defaulting to Algiers (16)');
    return 16;
  } catch (error) {
    console.error('Error getting origin wilaya:', error);
    // Default to Algiers (16) in case of error
    return 16;
  }
}

/**
 * Swap the direction in existing data to correct the issue
 */
async function swapDirectionsInExistingData(organizationId, originWilayaId) {
  console.log(`Swapping directions in existing data for organization ${organizationId}...`);
  
  try {
    // Get current data
    const { data: currentFees, error } = await supabase
      .from('yalidine_fees')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    if (!currentFees || currentFees.length === 0) {
      console.log('No existing fees data found to swap.');
      return;
    }
    
    console.log(`Found ${currentFees.length} fee records to process.`);
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < currentFees.length; i += batchSize) {
      batches.push(currentFees.slice(i, i + batchSize));
    }
    
    console.log(`Processing in ${batches.length} batches of max ${batchSize} records.`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1} of ${batches.length}...`);
      
      // First, delete the existing records
      const idsToDelete = batch.map(fee => fee.id);
      
      const { error: deleteError } = await supabase
        .from('yalidine_fees')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) throw deleteError;
      
      // Now insert the corrected records
      const correctedFees = batch.map(fee => {
        // Swap from_wilaya_id and to_wilaya_id if needed
        // We only swap if from_wilaya_id is NOT the origin wilaya
        const needsSwap = fee.from_wilaya_id !== originWilayaId;
        
        if (needsSwap) {
          return {
            ...fee,
            id: undefined, // Let the database assign a new ID
            from_wilaya_id: fee.to_wilaya_id,
            to_wilaya_id: fee.from_wilaya_id,
            from_wilaya_name: fee.to_wilaya_name,
            to_wilaya_name: fee.from_wilaya_name,
            last_updated_at: new Date().toISOString()
          };
        } else {
          // No swap needed, just update the timestamp
          return {
            ...fee,
            id: undefined, // Let the database assign a new ID
            last_updated_at: new Date().toISOString()
          };
        }
      });
      
      const { error: insertError } = await supabase
        .from('yalidine_fees')
        .insert(correctedFees);
      
      if (insertError) throw insertError;
      
      console.log(`Batch ${i + 1} processed successfully.`);
    }
    
    console.log('All data direction swaps completed successfully.');
  } catch (error) {
    console.error('Error swapping directions in existing data:', error);
    throw error;
  }
}

// Execute the fix if this script is run directly
if (require.main === module) {
  fixYalidineDirectionSwap()
    .then(success => {
      if (success) {
        console.log('✅ Yalidine direction swap fix completed successfully.');
        process.exit(0);
      } else {
        console.error('❌ Yalidine direction swap fix failed.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Uncaught error in Yalidine direction swap fix:', error);
      process.exit(1);
    });
}

module.exports = {
  fixYalidineDirectionSwap,
  disableRedirectTrigger,
  getOrganizationOriginWilaya,
  swapDirectionsInExistingData
}; 