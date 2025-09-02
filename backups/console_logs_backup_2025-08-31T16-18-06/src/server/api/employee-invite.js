import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

/**
 * API endpoint آمن لإرسال دعوات الموظفين
 * يستخدم Service Role Key للوصول إلى Admin API
 */
router.post('/admin/invite-employee', async (req, res) => {
  try {
    const { employeeId, email, name, organizationId } = req.body;

    // التحقق من البيانات المطلوبة
    if (!employeeId || !email || !name || !organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employeeId, email, name, organizationId'
      });
    }

    // إنشاء Supabase client باستخدام Service Role Key
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'X-Admin-Request': 'true',
        }
      }
    });

    // إرسال دعوة للمستخدم باستخدام Admin API
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name,
        role: 'employee',
        employee_id: employeeId,
        organization_id: organizationId
      },
      redirectTo: `${process.env.VITE_INTERMEDIATE_DOMAIN || 'http://localhost:8080'}/auth/callback`
    });

    if (error) {
      console.error('Admin invite error:', error);
      return res.status(400).json({
        success: false,
        message: `Failed to send invitation: ${error.message}`,
        error: error.message
      });
    }

    // تحديث معرف المصادقة في قاعدة البيانات إذا تم إنشاء المستخدم
    if (data?.user?.id) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: data.user.id })
        .eq('id', employeeId);

      if (updateError) {
        console.warn('Failed to update auth_user_id:', updateError);
        // لا نعيد خطأ هنا لأن الدعوة تم إرسالها بنجاح
      }
    }

    return res.status(200).json({
      success: true,
      message: 'تم إرسال دعوة بالبريد الإلكتروني للموظف بنجاح',
      data: {
        user_id: data?.user?.id,
        email: data?.user?.email
      }
    });

  } catch (error) {
    console.error('Unexpected error in invite-employee API:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ غير متوقع في الخادم',
      error: error.message
    });
  }
});

export default router;



