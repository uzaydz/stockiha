/**
 * API للتحقق من صحة رقم التعريف الجبائي (NIF)
 * التحقق من موقع المديرية العامة للضرائب (DGI)
 * 
 * المسار: /api/etat104/verify-nif
 * الطريقة: POST
 * 
 * Body: { nif: "123456789012345" }
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
    const { nif, organizationId, clientId } = req.body;

    // التحقق من البيانات المطلوبة
    if (!nif || !organizationId) {
      return res.status(400).json({ 
        error: 'NIF and organizationId are required' 
      });
    }

    // التحقق من طول NIF (يجب أن يكون 15 رقم)
    if (nif.length !== 15 || !/^\d+$/.test(nif)) {
      return res.status(400).json({
        isValid: false,
        error: 'NIF يجب أن يكون 15 رقم بالضبط'
      });
    }

    // محاولة التحقق من NIF عبر API الحكومي
    // ملاحظة: هذا مثال - يجب استبداله بـ API الفعلي من DGI
    let verificationResult;
    let apiError = null;

    try {
      // TODO: استبدل هذا بـ API الفعلي من DGI
      // const response = await fetch('https://dgi.gov.dz/api/verify-nif', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ nif })
      // });
      // verificationResult = await response.json();

      // حالياً: محاكاة التحقق
      verificationResult = await simulateNIFVerification(nif);
      
    } catch (error) {
      console.error('Error calling DGI API:', error);
      apiError = error.message;
      
      // في حالة فشل API، نستخدم التحقق الأساسي
      verificationResult = {
        isValid: await basicNIFValidation(nif),
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
        verification_type: 'nif',
        identifier: nif,
        is_valid: verificationResult.isValid,
        response_data: verificationResult,
        error_message: apiError,
        api_source: 'dgi',
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
          nif_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
    }

    // إرجاع النتيجة
    return res.status(200).json({
      isValid: verificationResult.isValid,
      data: verificationResult.data || null,
      source: verificationResult.source || 'dgi',
      verificationId: logData?.id,
      message: verificationResult.isValid 
        ? 'NIF صالح ومسجل في المديرية العامة للضرائب'
        : 'NIF غير صالح أو غير مسجل',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in verify-nif API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

/**
 * محاكاة التحقق من NIF (للاختبار فقط)
 * يجب استبدالها بـ API الفعلي من DGI
 */
async function simulateNIFVerification(nif) {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 1000));

  // محاكاة التحقق: NIF صالح إذا كان يبدأ بـ 1 أو 2
  const isValid = nif.startsWith('1') || nif.startsWith('2');

  return {
    isValid,
    source: 'dgi_simulation',
    data: isValid ? {
      nif,
      companyName: 'شركة تجريبية',
      status: 'active',
      registrationDate: '2020-01-01'
    } : null
  };
}

/**
 * التحقق الأساسي من NIF (بدون API)
 * يتحقق فقط من الصيغة والطول
 */
async function basicNIFValidation(nif) {
  // التحقق من الطول
  if (nif.length !== 15) return false;
  
  // التحقق من أنه أرقام فقط
  if (!/^\d+$/.test(nif)) return false;
  
  // التحقق من checksum (إذا كان معروف)
  // TODO: إضافة خوارزمية checksum إذا كانت متوفرة
  
  return true;
}

/**
 * ملاحظات مهمة:
 * 
 * 1. يجب استبدال simulateNIFVerification بـ API الفعلي من DGI
 * 2. قد تحتاج إلى مفتاح API من DGI
 * 3. يجب حفظ لقطة شاشة من نتيجة التحقق (مطلوب قانوناً)
 * 4. التحقق الأساسي يستخدم فقط في حالة فشل API
 * 5. جميع عمليات التحقق تُحفظ في جدول verification_log
 */
