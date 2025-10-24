/**
 * API للتحقق من صحة رقم السجل التجاري (RC)
 * التحقق من موقع المركز الوطني للسجل التجاري (CNRC)
 * 
 * المسار: /api/etat104/verify-rc
 * الطريقة: POST
 * 
 * Body: { rc: "12345678", organizationId: "uuid" }
 * Response: { isValid: boolean, data: object, error: string }
 */

import { createClient } from '@supabase/supabase-js';

// تهيئة Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // السماح فقط بطلبات POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rc, organizationId, clientId } = req.body;

    // التحقق من البيانات المطلوبة
    if (!rc || !organizationId) {
      return res.status(400).json({ 
        error: 'RC and organizationId are required' 
      });
    }

    // التحقق من صيغة RC (يجب أن يكون أرقام فقط)
    if (!/^\d+$/.test(rc)) {
      return res.status(400).json({
        isValid: false,
        error: 'RC يجب أن يحتوي على أرقام فقط'
      });
    }

    // محاولة التحقق من RC عبر API الحكومي
    let verificationResult;
    let apiError = null;

    try {
      // TODO: استبدل هذا بـ API الفعلي من CNRC
      // const response = await fetch('https://cnrc.dz/api/verify-rc', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ rc })
      // });
      // verificationResult = await response.json();

      // حالياً: محاكاة التحقق
      verificationResult = await simulateRCVerification(rc);
      
    } catch (error) {
      console.error('Error calling CNRC API:', error);
      apiError = error.message;
      
      // في حالة فشل API، نستخدم التحقق الأساسي
      verificationResult = {
        isValid: await basicRCValidation(rc),
        source: 'basic_validation',
        error: apiError
      };
    }

    // حفظ نتيجة التحقق في قاعدة البيانات
    const { data: logData, error: logError } = await supabase
      .from('etat104_verification_log')
      .insert({
        client_id: clientId || null,
        organization_id: organizationId,
        verification_type: 'rc',
        identifier: rc,
        is_valid: verificationResult.isValid,
        response_data: verificationResult,
        error_message: apiError,
        api_source: 'cnrc',
        response_timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging verification:', logError);
    }

    // إذا كان هناك client_id، نحدث حالة التحقق
    if (clientId && verificationResult.isValid) {
      await supabase
        .from('etat104_clients')
        .update({ 
          rc_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
    }

    // إرجاع النتيجة
    return res.status(200).json({
      isValid: verificationResult.isValid,
      data: verificationResult.data || null,
      source: verificationResult.source || 'cnrc',
      verificationId: logData?.id,
      message: verificationResult.isValid 
        ? 'RC صالح ومسجل في المركز الوطني للسجل التجاري'
        : 'RC غير صالح أو غير مسجل',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in verify-rc API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

/**
 * محاكاة التحقق من RC (للاختبار فقط)
 * يجب استبدالها بـ API الفعلي من CNRC
 */
async function simulateRCVerification(rc) {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 1000));

  // محاكاة التحقق: RC صالح إذا كان طوله أكثر من 6 أرقام
  const isValid = rc.length >= 6;

  return {
    isValid,
    source: 'cnrc_simulation',
    data: isValid ? {
      rc,
      companyName: 'شركة تجريبية',
      legalForm: 'SARL',
      status: 'active',
      registrationDate: '2020-01-01',
      address: 'الجزائر العاصمة',
      capital: '100000 DZD'
    } : null
  };
}

/**
 * التحقق الأساسي من RC (بدون API)
 * يتحقق فقط من الصيغة
 */
async function basicRCValidation(rc) {
  // التحقق من أنه أرقام فقط
  if (!/^\d+$/.test(rc)) return false;
  
  // التحقق من الطول (عادة 6-10 أرقام)
  if (rc.length < 6 || rc.length > 10) return false;
  
  return true;
}

/**
 * ملاحظات مهمة:
 * 
 * 1. يجب استبدال simulateRCVerification بـ API الفعلي من CNRC
 * 2. موقع CNRC: https://cnrc.dz
 * 3. قد تحتاج إلى مفتاح API من CNRC
 * 4. يجب حفظ لقطة شاشة من نتيجة التحقق (مطلوب قانوناً حسب قانون المالية 2024)
 * 5. التحقق الأساسي يستخدم فقط في حالة فشل API
 * 6. جميع عمليات التحقق تُحفظ في جدول verification_log
 * 7. يمكن استخدام web scraping إذا لم يكن هناك API رسمي
 */
