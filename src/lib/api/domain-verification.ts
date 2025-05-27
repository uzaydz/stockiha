import { getSupabaseClient } from '@/lib/supabase';
import axios from 'axios';
import { DomainVerificationStatus } from '@/types/domain-verification';

// استخراج رابط API من البيئة أو استخدام الافتراضي
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// النطاق الوسيط المستخدم للـ CNAME
export const INTERMEDIATE_DOMAIN = import.meta.env.VITE_INTERMEDIATE_DOMAIN || 'connect.ktobi.online';

interface DomainStatus {
  status: 'unconfigured' | 'pending' | 'active' | 'error';
  message?: string;
  domainDetails?: {
    domain: string;
    verifiedAt?: string;
    errorCode?: string;
    errorMessage?: string;
  };
}

/**
 * التحقق من حالة اتصال النطاق بالمتجر
 * 
 * ملاحظة: هذه الوظيفة تُستخدم فقط من الواجهة الأمامية، وتعتمد على الخدمة الخلفية للتحقق الفعلي
 */
export const checkDomainStatus = async (organizationId: string, domain: string): Promise<DomainStatus> => {
  if (!organizationId || !domain) {
    return { status: 'unconfigured', message: 'بيانات غير كافية للتحقق من النطاق' };
  }
  
  try {
    // تنظيف النطاق من أي بروتوكول أو مسارات
    const cleanDomain = domain.replace(/^https?:\/\//i, '').split('/')[0];
    
    // استدعاء API المحلي للتحقق من سجلات DNS
    const response = await axios.post(`${API_URL}/check-domain`, {
      domain: cleanDomain,
      organizationId
    });
    
    if (!response.data.success) {
      return { 
        status: 'error', 
        message: 'خطأ في التحقق من سجلات DNS',
        domainDetails: {
          domain: cleanDomain,
          errorCode: 'API_ERROR',
          errorMessage: response.data.error
        }
      };
    }
    
    // التحقق من صحة الإعداد
    const isValid = response.data.isValid;
    
    // الحصول من قاعدة البيانات على آخر تحديث للنطاق
    const supabase = getSupabaseClient();
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('domain, updated_at')
      .eq('id', organizationId)
      .single();
      
    if (orgError || !orgData) {
      return { 
        status: 'error', 
        message: 'خطأ في التحقق من حالة النطاق',
        domainDetails: {
          domain: cleanDomain,
          errorCode: 'DB_ERROR',
          errorMessage: orgError?.message
        }
      };
    }
    
    // التحقق من أن النطاق في قاعدة البيانات يطابق النطاق المطلوب
    if (orgData.domain !== cleanDomain) {
      return { 
        status: 'unconfigured', 
        message: 'هذا النطاق غير مكوّن بعد',
        domainDetails: {
          domain: cleanDomain
        }
      };
    }
    
    // تحليل نتائج التحقق من DNS
    if (isValid) {
      return { 
        status: 'active', 
        message: 'النطاق نشط ويعمل بشكل صحيح',
        domainDetails: {
          domain: cleanDomain,
          verifiedAt: new Date().toISOString()
        }
      };
    } else {
      return { 
        status: 'pending', 
        message: 'النطاق قيد التفعيل، يرجى التأكد من تكوين سجلات DNS بشكل صحيح',
        domainDetails: {
          domain: cleanDomain
        }
      };
    }
    
  } catch (error) {
    return { 
      status: 'error', 
      message: 'حدث خطأ غير متوقع أثناء التحقق من النطاق',
      domainDetails: {
        domain,
        errorMessage: error instanceof Error ? error.message : 'خطأ غير معروف'
      }
    };
  }
};

/**
 * تحديث النطاق الرئيسي للمنظمة
 */
export const updateOrganizationDomain = async (organizationId: string, domain: string | null): Promise<{success: boolean, message?: string, error?: any}> => {
  try {
    if (!organizationId) {
      return { success: false, message: 'معرف المنظمة غير موجود' };
    }
    
    // تنظيف النطاق من البروتوكولات وإزالة الشرطة في النهاية
    const cleanDomain = domain ? domain.replace(/^https?:\/\//i, '').replace(/\/$/, '') : null;
    
    // التحقق من توفر النطاق إذا كان موجودًا
    if (cleanDomain) {
      const availabilityCheck = await checkDomainAvailability(cleanDomain, organizationId);
      if (!availabilityCheck.available) {
        return { 
          success: false, 
          message: availabilityCheck.message || 'هذا النطاق غير متاح'
        };
      }
      
      // استدعاء API لربط النطاق بمشروع Vercel
      try {
        const linkResponse = await axios.post(`${API_URL}/link-domain`, {
          customDomain: cleanDomain,
          organizationId
        });
        
        if (!linkResponse.data.success) {
          return { 
            success: false, 
            message: linkResponse.data.error || 'حدث خطأ أثناء ربط النطاق مع خادم الاستضافة'
          };
        }
      } catch (apiError) {
        // نستمر رغم الخطأ لتحديث قاعدة البيانات على الأقل
      }
    }
    
    const supabase = await getSupabaseClient();
    const updateData = { 
      domain: cleanDomain,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId);
      
    if (error) {
      return { 
        success: false, 
        message: 'حدث خطأ أثناء تحديث النطاق', 
        error 
      };
    }
    
    // إعادة رسالة مناسبة بناءً على العملية
    return { 
      success: true,
      message: cleanDomain 
        ? 'تم تحديث النطاق المخصص بنجاح. قد يستغرق التفعيل حتى 24 ساعة.'
        : 'تم إزالة النطاق المخصص بنجاح.'
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'حدث خطأ غير متوقع أثناء تحديث النطاق',
      error 
    };
  }
};

/**
 * التحقق من توفر النطاق (غير مستخدم بالفعل)
 */
export const checkDomainAvailability = async (domain: string, currentOrganizationId?: string): Promise<{ available: boolean; message?: string }> => {
  if (!domain) {
    return { available: false, message: 'الرجاء إدخال نطاق صالح' };
  }
  
  try {
    // تنظيف النطاق من أي بروتوكول أو مسارات
    const cleanDomain = domain.replace(/^https?:\/\//i, '').split('/')[0];
    
    const supabase = await getSupabaseClient();
    
    // إنشاء استعلام للتحقق من وجود النطاق
    let query = supabase
      .from('organizations')
      .select('id')
      .eq('domain', cleanDomain);
    
    // إذا كان هناك معرف منظمة حالي، استبعده من البحث
    if (currentOrganizationId) {
      query = query.neq('id', currentOrganizationId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      return { available: false, message: 'حدث خطأ أثناء التحقق من توفر النطاق' };
    }
    
    // إذا وجدنا بيانات، فهذا يعني أن النطاق مستخدم بالفعل
    if (data) {
      return { available: false, message: 'هذا النطاق مستخدم بالفعل من قبل متجر آخر' };
    }
    
    return { available: true };
    
  } catch (error) {
    return { available: false, message: 'حدث خطأ غير متوقع أثناء التحقق من توفر النطاق' };
  }
};
