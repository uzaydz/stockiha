import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user's JWT token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const { 
      email, 
      password, 
      name, 
      phone, 
      role, 
      first_name, 
      last_name, 
      job_title,
      organization_id,
      assigned_regions,
      assigned_stores,
      max_daily_orders,
      specializations,
      work_schedule
    } = await req.json()

    // 1. Create user in auth.users
    const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        organization_id
      }
    })

    if (authError2) {
      throw new Error(`Failed to create auth user: ${authError2.message}`)
    }

    // 2. Create user record in public.users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email,
        name,
        phone,
        role,
        organization_id,
        first_name,
        last_name,
        job_title: job_title || 'وكيل مركز اتصال',
        is_active: true,
        permissions: {
          call_center: {
            can_make_calls: true,
            can_view_orders: true,
            can_update_orders: true,
            can_view_reports: role === 'admin'
          }
        }
      })
      .select()
      .single()

    if (userError) {
      // Cleanup: delete auth user if user record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create user record: ${userError.message}`)
    }

    // 3. Create call center agent record
    const { data: agentData, error: agentError } = await supabaseAdmin
      .from('call_center_agents')
      .insert({
        user_id: userData.id,
        organization_id,
        assigned_regions: assigned_regions || [],
        assigned_stores: assigned_stores || [],
        max_daily_orders: max_daily_orders || 50,
        is_available: true,
        is_active: true,
        last_activity: new Date().toISOString(),
        performance_metrics: {
          failed_calls: 0,
          successful_calls: 0,
          avg_call_duration: 0,
          total_orders_handled: 0,
          customer_satisfaction: 0,
          last_performance_update: null
        },
        specializations: specializations || [],
        work_schedule: work_schedule || {
          sunday: { start: '09:00', end: '17:00', active: true },
          monday: { start: '09:00', end: '17:00', active: true },
          tuesday: { start: '09:00', end: '17:00', active: true },
          wednesday: { start: '09:00', end: '17:00', active: true },
          thursday: { start: '09:00', end: '17:00', active: true },
          friday: { start: '09:00', end: '17:00', active: false },
          saturday: { start: '09:00', end: '17:00', active: false }
        }
      })
      .select()
      .single()

    if (agentError) {
      // Cleanup: delete user and auth user if agent creation fails
      await supabaseAdmin.from('users').delete().eq('id', userData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create agent record: ${agentError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          userId: userData.id,
          agentId: agentData.id,
          authUserId: authData.user.id
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
