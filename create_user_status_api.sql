-- إنشاء دالة لتحديث حالة المستخدم
CREATE OR REPLACE FUNCTION update_user_status(
  new_status text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  user_id := auth.uid();
  
  -- التحقق من أن المستخدم مصادق عليه
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المستخدم غير مصادق عليه'
    );
  END IF;
  
  -- التحقق من صحة الحالة
  IF new_status NOT IN ('online', 'offline', 'away', 'busy') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'حالة غير صالحة'
    );
  END IF;
  
  -- تحديث حالة المستخدم
  UPDATE users 
  SET 
    status = new_status,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE auth_user_id = user_id;
  
  -- التحقق من نجاح التحديث
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المستخدم غير موجود'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'status', new_status
  );
END;
$$;

-- منح الصلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION update_user_status(text) TO authenticated;

-- إنشاء Edge Function للتعامل مع طلبات تحديث الحالة
-- هذا الكود يجب أن يوضع في ملف منفصل في مجلد supabase/functions/user-status/index.ts
/*
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { status } = await req.json()

    const { data, error } = await supabaseClient.rpc('update_user_status', {
      new_status: status
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
*/ 