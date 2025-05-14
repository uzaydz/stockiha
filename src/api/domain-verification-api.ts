import { getSupabaseClient } from '@/lib/supabase';
import { DNSVerificationResult, DomainVerificationStatus } from '@/types/domain-verification';

/**
 * التحقق من سجلات DNS للنطاق المخصص
 * هذه الوظيفة تحاكي عملية التحقق من سجلات DNS، في الإنتاج يمكن استخدام خدمة فعلية للتحقق من السجلات
 */
export const verifyDomainDNS = async (domain: string): Promise<DNSVerificationResult> => {
  try {
    // تنظيف النطاق
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    
    // في الإنتاج الفعلي، هنا نقوم باستعلام DNS عن طريق خدمة مثل Vercel API أو AWS Route53
    // لأغراض العرض، نقوم بمحاكاة العملية
    
    // سجلات DNS المتوقعة
    const expectedRecords = [
      {
        name: '@',
        type: 'CNAME',
        expected: 'connect.ktobi.online'
      },
      {
        name: 'www',
        type: 'CNAME',
        expected: 'connect.ktobi.online'
      }
    ];
    
    // محاكاة التحقق من سجلات DNS
    // في الإنتاج الفعلي، ستكون هذه نتائج استعلامات DNS حقيقية
    const verificationResults = expectedRecords.map(record => {
      // محاكاة بعض النتائج العشوائية للأغراض التوضيحية
      const random = Math.random();
      const isValid = random > 0.3; // 70% فرصة أن تكون صالحة
      
      return {
        name: record.name,
        type: record.type,
        value: isValid ? record.expected : 'invalid-value.example.com',
        status: isValid ? 'valid' as const : 'invalid' as const,
        expected: record.expected
      };
    });
    
    // تحديد ما إذا كانت جميع السجلات صالحة
    const allValid = verificationResults.every(record => record.status === 'valid');
    
    return {
      success: allValid,
      records: verificationResults,
      message: allValid 
        ? 'تم التحقق من جميع سجلات DNS بنجاح' 
        : 'بعض سجلات DNS غير صحيحة، يرجى التحقق من الإعدادات'
    };
  } catch (error) {
    console.error('خطأ أثناء التحقق من سجلات DNS:', error);
    return {
      success: false,
      records: [],
      message: 'حدث خطأ أثناء التحقق من سجلات DNS'
    };
  }
};

/**
 * تحديث حالة النطاق في قاعدة البيانات
 */
export const updateDomainVerificationStatus = async (
  organizationId: string,
  domain: string,
  status: DomainVerificationStatus,
  errorMessage?: string
): Promise<boolean> => {
  try {
    const supabase = await getSupabaseClient();
    
    // البحث عن سجل التحقق الحالي
    const { data: existingVerification, error: selectError } = await supabase
      .from('domain_verifications')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('domain', domain)
      .maybeSingle();
    
    if (selectError) {
      console.error('خطأ في استعلام سجل التحقق:', selectError);
      return false;
    }
    
    const now = new Date().toISOString();
    
    if (existingVerification?.id) {
      // تحديث السجل الموجود
      const { error } = await supabase
        .from('domain_verifications')
        .update({
          status,
          error_message: errorMessage,
          verified_at: status === 'active' || status === 'verified' ? now : null,
          updated_at: now
        })
        .eq('id', existingVerification.id);
        
      return !error;
    } else {
      // إنشاء سجل جديد
      const { error } = await supabase
        .from('domain_verifications')
        .insert({
          organization_id: organizationId,
          domain,
          status,
          error_message: errorMessage,
          verified_at: status === 'active' || status === 'verified' ? now : null,
          created_at: now,
          updated_at: now
        });
        
      return !error;
    }
  } catch (error) {
    console.error('خطأ أثناء تحديث حالة التحقق من النطاق:', error);
    return false;
  }
};

/**
 * التحقق من حالة SSL للنطاق
 * هذه وظيفة محاكاة، في الإنتاج نستخدم خدمة مثل Vercel لفحص حالة SSL
 */
export const checkDomainSSL = async (domain: string): Promise<{
  valid: boolean;
  message?: string;
}> => {
  try {
    // محاكاة التحقق من SSL
    const random = Math.random();
    const isValid = random > 0.2; // 80% فرصة أن تكون صالحة
    
    return {
      valid: isValid,
      message: isValid 
        ? 'شهادة SSL نشطة وصالحة' 
        : 'لم يتم العثور على شهادة SSL صالحة'
    };
  } catch (error) {
    console.error('خطأ أثناء التحقق من حالة SSL:', error);
    return {
      valid: false,
      message: 'حدث خطأ أثناء التحقق من حالة SSL'
    };
  }
};

/**
 * عملية التحقق الكاملة من النطاق وتحديث حالته
 */
export const verifyAndUpdateDomainStatus = async (
  organizationId: string,
  domain: string
): Promise<{
  success: boolean;
  status: DomainVerificationStatus;
  message: string;
}> => {
  try {
    // 1. التحقق من سجلات DNS
    const dnsResult = await verifyDomainDNS(domain);
    
    // إذا فشل التحقق من DNS، قم بتحديث الحالة وإنهاء العملية
    if (!dnsResult.success) {
      await updateDomainVerificationStatus(
        organizationId,
        domain,
        'error',
        dnsResult.message
      );
      
      return {
        success: false,
        status: 'error',
        message: dnsResult.message || 'فشل التحقق من سجلات DNS'
      };
    }
    
    // 2. التحقق من SSL
    const sslResult = await checkDomainSSL(domain);
    
    // إذا فشل التحقق من SSL، حدد الحالة كـ 'pending'
    if (!sslResult.valid) {
      await updateDomainVerificationStatus(
        organizationId,
        domain,
        'pending',
        'سجلات DNS صحيحة، لكن لم يتم إصدار شهادة SSL بعد'
      );
      
      return {
        success: true,
        status: 'pending',
        message: 'سجلات DNS صحيحة، لكن لم يتم إصدار شهادة SSL بعد. قد يستغرق إصدار SSL حتى 24 ساعة.'
      };
    }
    
    // 3. كل شيء صحيح، حدد الحالة كـ 'active'
    await updateDomainVerificationStatus(
      organizationId,
      domain,
      'active'
    );
    
    return {
      success: true,
      status: 'active',
      message: 'تم التحقق من النطاق بنجاح وهو نشط الآن'
    };
  } catch (error) {
    console.error('خطأ أثناء عملية التحقق الكاملة من النطاق:', error);
    
    // تحديث الحالة في حالة حدوث خطأ
    await updateDomainVerificationStatus(
      organizationId,
      domain,
      'error',
      'حدث خطأ غير متوقع أثناء التحقق من النطاق'
    );
    
    return {
      success: false,
      status: 'error',
      message: 'حدث خطأ غير متوقع أثناء التحقق من النطاق'
    };
  }
};

/**
 * ربط نطاق مخصص بمشروع Vercel عبر واجهة برمجة التطبيقات
 * هذه الوظيفة تستخدم Vercel API لإضافة نطاق مخصص إلى مشروع محدد
 */
export const linkDomainToVercelProject = async (
  customDomain: string,
  projectId: string,
  vercelToken: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    // تنظيف النطاق
    const cleanDomain = customDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    
    // استدعاء Vercel API
    const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: cleanDomain })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('خطأ في ربط النطاق مع Vercel:', data);
      return {
        success: false,
        error: data.error?.message || 'حدث خطأ أثناء ربط النطاق'
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('خطأ في ربط النطاق مع Vercel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
};

/**
 * التحقق من حالة النطاق في Vercel
 * يستخدم Vercel API للتحقق من حالة النطاق ومعرفة إذا كان مكوّن بشكل صحيح
 */
export const verifyVercelDomainStatus = async (
  customDomain: string,
  projectId: string,
  vercelToken: string
): Promise<{
  verified: boolean;
  configured: boolean;
  message: string;
}> => {
  try {
    // تنظيف النطاق
    const cleanDomain = customDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    
    // استدعاء Vercel API
    const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${cleanDomain}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return {
        verified: false,
        configured: false,
        message: 'النطاق غير متصل بالمشروع'
      };
    }
    
    const data = await response.json();
    
    if (data.verified) {
      return {
        verified: true,
        configured: true,
        message: 'النطاق مفعّل ويعمل بشكل صحيح'
      };
    } else if (data.verification && data.verification.length > 0) {
      // هناك تحقق مطلوب
      return {
        verified: false,
        configured: false,
        message: 'النطاق يحتاج إلى التحقق من سجلات DNS'
      };
    } else {
      return {
        verified: false,
        configured: false,
        message: 'النطاق غير مكوّن بشكل صحيح'
      };
    }
  } catch (error) {
    console.error('خطأ في التحقق من حالة النطاق في Vercel:', error);
    return {
      verified: false,
      configured: false,
      message: 'حدث خطأ أثناء التحقق من حالة النطاق'
    };
  }
}; 