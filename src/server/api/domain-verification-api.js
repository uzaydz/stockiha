import express from 'express';
import dns from 'dns';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// تحويل وظائف DNS إلى وعود
const resolveCname = promisify(dns.resolveCname);

// إنشاء عميل Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// إنشاء موجه لـ API
const router = express.Router();

// القيمة الوسيطة المتوقعة لـ CNAME
const INTERMEDIATE_DOMAIN = 'connect.ktobi.online';

/**
 * واجهة برمجة للتحقق من صحة إعدادات DNS للنطاق المخصص
 * POST /api/check-domain
 */
router.post('/check-domain', async (req, res) => {
  try {
    // استخراج البيانات من طلب API
    const { domain, organizationId } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain.'
      });
    }

    // تنظيف النطاق
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    
    // النتائج
    const results = {
      apex: {
        valid: false,
        expected: INTERMEDIATE_DOMAIN,
        actual: null,
        error: null
      },
      www: {
        valid: false,
        expected: INTERMEDIATE_DOMAIN,
        actual: null,
        error: null
      }
    };
    
    // التحقق من سجل النطاق الأساسي (@)
    try {
      const cnameRecords = await resolveCname(cleanDomain);
      results.apex.actual = cnameRecords[0].toLowerCase();
      results.apex.valid = cnameRecords[0].toLowerCase() === INTERMEDIATE_DOMAIN.toLowerCase();
    } catch (error) {
      results.apex.error = error instanceof Error ? error.message : 'خطأ غير معروف';
    }
    
    // التحقق من سجل www
    try {
      const wwwDomain = `www.${cleanDomain}`;
      const cnameRecordsWww = await resolveCname(wwwDomain);
      results.www.actual = cnameRecordsWww[0].toLowerCase();
      results.www.valid = cnameRecordsWww[0].toLowerCase() === INTERMEDIATE_DOMAIN.toLowerCase();
    } catch (error) {
      results.www.error = error instanceof Error ? error.message : 'خطأ غير معروف';
    }
    
    // حساب النتيجة الإجمالية
    const isValid = results.apex.valid || results.www.valid;
    
    // تحديث جدول domain_verifications إذا تم ربط النطاق بمؤسسة
    if (organizationId) {
      const { error: updateError } = await supabase
        .from('domain_verifications')
        .upsert([
          {
            organization_id: organizationId,
            domain: cleanDomain,
            status: isValid ? 'verified' : 'pending',
            verification_data: results,
            last_checked: new Date().toISOString()
          }
        ]);
      
      if (updateError) {
        console.error('خطأ في تحديث حالة التحقق:', updateError);
      }
    }
    
    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      domain: cleanDomain,
      isValid,
      results
    });
  } catch (error) {
    console.error('خطأ أثناء التحقق من النطاق:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
});

/**
 * واجهة برمجة لربط نطاق مخصص بمشروع Vercel
 * POST /api/link-domain
 */
router.post('/link-domain', async (req, res) => {
  try {
    // استخراج البيانات من طلب API
    const { customDomain, organizationId } = req.body;

    if (!customDomain || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير customDomain و organizationId.'
      });
    }

    // تنظيف النطاق
    const cleanDomain = customDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();

    // الحصول على معلومات المشروع و token من البيئة
    const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return res.status(500).json({
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Vercel API.'
      });
    }

    // ربط النطاق بمشروع Vercel
    const response = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: cleanDomain })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('خطأ في ربط النطاق مع Vercel:', data);
      return res.status(400).json({
        success: false,
        error: data.error?.message || 'حدث خطأ أثناء ربط النطاق'
      });
    }

    // تحديث النطاق في قاعدة البيانات
    const { error: dbError } = await supabase
      .from('organizations')
      .update({ domain: cleanDomain })
      .eq('id', organizationId);

    if (dbError) {
      console.error('حدث خطأ أثناء تحديث النطاق في قاعدة البيانات:', dbError);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء تحديث النطاق في قاعدة البيانات'
      });
    }

    // إنشاء سجل في جدول domain_verifications لتتبع حالة النطاق
    const { error: verificationError } = await supabase
      .from('domain_verifications')
      .insert([
        {
          organization_id: organizationId,
          domain: cleanDomain,
          status: data.verified ? 'verified' : 'pending',
          verification_data: data.verification || null,
          last_checked: new Date().toISOString()
        }
      ]);

    if (verificationError) {
      console.error('حدث خطأ أثناء إنشاء سجل التحقق:', verificationError);
    }

    // إرجاع النتيجة
    return res.status(200).json({
      success: true,
      data: {
        domain: cleanDomain,
        verified: data.verified,
        verificationData: data.verification || null
      }
    });
  } catch (error) {
    console.error('خطأ غير متوقع أثناء ربط النطاق:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    });
  }
});

export default router; 