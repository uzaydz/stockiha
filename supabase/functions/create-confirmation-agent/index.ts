import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-client-version, x-instance-type, x-application-name, x-creation-time, apikey, content-type, x-requested-with, accept, origin, referer",
};

const DEFAULT_ACCESS_SCOPE = [
  "orders_v2",
  "orders_mobile",
  "blocked_customers",
  "abandoned_orders",
  "analytics",
  "settings",
];

const DEFAULT_COMPENSATION = {
  currency: "DZD",
  monthly_amount: 0,
  per_order_amount: 0,
  payment_cycle: "monthly",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
    if (verifyError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();

    const {
      email,
      password,
      full_name,
      phone,
      organization_id,
      access_scope,
      compensation_mode,
      compensation_settings,
      notes,
      created_by,
    } = body ?? {};

    if (!email || !password || !full_name || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const normalizedScope = Array.isArray(access_scope) && access_scope.length
      ? access_scope
      : DEFAULT_ACCESS_SCOPE;

    const normalizedCompensation = {
      ...DEFAULT_COMPENSATION,
      ...(typeof compensation_settings === "object" && compensation_settings !== null ? compensation_settings : {}),
    };

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: full_name,
        role: "confirmation_agent",
        organization_id,
      },
    });

    if (authError || !authData?.user) {
      throw new Error(`Failed to create auth user: ${authError?.message ?? "unknown error"}`);
    }

    const { data: userData, error: userInsertError } = await supabaseAdmin
      .from("users")
      .insert({
        auth_user_id: authData.user.id,
        email,
        name: full_name,
        phone,
        role: "confirmation_agent",
        organization_id,
        is_active: true,
        permissions: {
          confirmation: {
            can_view_orders: true,
            can_update_orders: true,
            can_view_reports: true,
          },
        },
      })
      .select()
      .single();

    if (userInsertError || !userData) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user record: ${userInsertError?.message ?? "unknown error"}`);
    }

    const { data: agentData, error: agentError } = await supabaseAdmin
      .from("confirmation_agents")
      .insert({
        organization_id,
        user_id: userData.id,
        full_name,
        email,
        phone,
        status: "active",
        access_scope: normalizedScope,
        compensation_mode: compensation_mode ?? "monthly",
        compensation_settings: normalizedCompensation,
        workload_settings: {
          daily_target: 30,
          max_queue_size: 50,
          rotation_mode: "fair",
        },
        notification_settings: {
          email: true,
          sms: false,
          in_app: true,
        },
        notes,
        created_by: created_by ?? user.id,
      })
      .select()
      .single();

    if (agentError || !agentData) {
      await supabaseAdmin.from("users").delete().eq("id", userData.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create confirmation agent: ${agentError?.message ?? "unknown error"}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          userId: userData.id,
          authUserId: authData.user.id,
          agent: agentData,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
