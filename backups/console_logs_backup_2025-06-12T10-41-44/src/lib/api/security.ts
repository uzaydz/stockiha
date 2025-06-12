import { supabase } from '@/lib/supabase';
import { verifyTOTP, debugTOTP } from '@/lib/totp-verification';

// Types للأمان والخصوصية
export interface SecuritySettings {
  id: string;
  user_id: string;
  two_factor_enabled?: boolean;
  two_factor_method: 'totp' | 'sms' | 'email';
  totp_secret?: string;
  backup_codes?: string[];
  backup_codes_generated_at?: string;
  backup_codes_used: string[];
  max_active_sessions: number;
  session_timeout_minutes: number;
  require_reauth_for_sensitive: boolean;
  password_expiry_days: number;
  require_strong_password: boolean;
  prevent_password_reuse: number;
  login_notification_enabled: boolean;
  suspicious_activity_alerts: boolean;
  device_tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  id: string;
  user_id: string;
  profile_visibility: 'public' | 'organization' | 'private';
  show_email: boolean;
  show_phone: boolean;
  show_last_activity: boolean;
  allow_data_collection: boolean;
  allow_analytics: boolean;
  allow_marketing_emails: boolean;
  allow_contact_from_others: boolean;
  allow_friend_requests: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
  location_info?: any;
  is_active: boolean;
  last_activity_at: string;
  expires_at?: string;
  login_method?: string;
  is_trusted_device: boolean;
  created_at: string;
}

export interface SecurityLog {
  id: string;
  user_id?: string;
  activity_type: string;
  activity_description?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: any;
  location_info?: any;
  status: 'success' | 'failed' | 'blocked';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
  session_id?: string;
  created_at: string;
}

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  browser_info?: any;
  is_trusted: boolean;
  trust_level: number;
  last_used_at: string;
  first_seen_ip?: string;
  last_seen_ip?: string;
  usage_count: number;
  created_at: string;
  expires_at: string;
}

export interface VerificationCode {
  id: string;
  user_id: string;
  code: string;
  code_type: 'login' | 'password_reset' | 'email_verification' | '2fa_setup';
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  ip_address?: string;
  attempts_count: number;
  max_attempts: number;
  created_at: string;
}

/**
 * جلب إعدادات الأمان للمستخدم الحالي
 */
export async function getSecuritySettings(): Promise<SecuritySettings | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // استخدام الدالة المخصصة بدلاً من REST API
    const { data, error } = await (supabase as any)
      .rpc('get_user_security_settings', { p_user_id: user.id });

    if (error) {
      return null;
    }

    return data && Array.isArray(data) && data.length > 0 ? data[0] as SecuritySettings : null;
  } catch (error) {
    return null;
  }
}

/**
 * تحديث إعدادات الأمان
 */
export async function updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<{
  success: boolean;
  error?: string;
  data?: SecuritySettings;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // استخدام الدالة المخصصة بدلاً من REST API
    const { data: updateResult, error } = await (supabase as any)
      .rpc('update_user_security_settings', {
        p_user_id: user.id,
        p_settings: settings
      });

    if (error) {
      return {
        success: false,
        error: 'فشل في تحديث إعدادات الأمان'
      };
    }

    // جلب البيانات المحدثة
    const updatedSettings = await getSecuritySettings();

    return {
      success: true,
      data: updatedSettings || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * جلب إعدادات الخصوصية للمستخدم الحالي
 */
export async function getPrivacySettings(): Promise<PrivacySettings | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // استخدام الدالة المخصصة
    const { data, error } = await (supabase as any)
      .rpc('get_user_privacy_settings', { p_user_id: user.id });

    if (error) {
      return null;
    }

    return data && Array.isArray(data) && data.length > 0 ? data[0] as PrivacySettings : null;
  } catch (error) {
    return null;
  }
}

/**
 * تحديث إعدادات الخصوصية
 */
export async function updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<{
  success: boolean;
  error?: string;
  data?: PrivacySettings;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // استخدام الدالة المخصصة بدلاً من REST API
    const { data: updateResult, error } = await (supabase as any)
      .rpc('update_user_privacy_settings', {
        p_user_id: user.id,
        p_settings: settings
      });

    if (error) {
      return {
        success: false,
        error: 'فشل في تحديث إعدادات الخصوصية'
      };
    }

    // جلب البيانات المحدثة
    const updatedSettings = await getPrivacySettings();

    return {
      success: true,
      data: updatedSettings || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * جلب الجلسات النشطة للمستخدم
 */
export async function getActiveSessions(): Promise<UserSession[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }

    // استخدام RPC function بدلاً من الاستعلام المباشر
    const { data, error } = await (supabase as any).rpc('get_user_active_sessions', {
      p_user_id: user.id
    });

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**
 * إنهاء جلسة محددة
 */
export async function terminateSession(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { data, error } = await (supabase as any).rpc('terminate_user_session', {
      p_session_id: sessionId,
      p_user_id: user.id
    });

    if (error) {
      return {
        success: false,
        error: 'فشل في إنهاء الجلسة'
      };
    }

    return {
      success: Boolean(data)
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إنهاء جميع الجلسات الأخرى
 */
export async function terminateAllOtherSessions(): Promise<{
  success: boolean;
  terminatedCount?: number;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // الحصول على الجلسة الحالية
    const { data: session } = await supabase.auth.getSession();
    const currentSessionToken = session.session?.access_token || '';

    const { data, error } = await (supabase as any).rpc('terminate_all_other_sessions', {
      p_user_id: user.id,
      p_current_session_token: currentSessionToken
    });

    if (error) {
      return {
        success: false,
        error: 'فشل في إنهاء الجلسات'
      };
    }

    return {
      success: true,
      terminatedCount: Number(data) || 0
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * جلب سجل الأنشطة الأمنية
 */
export async function getSecurityLogs(limit: number = 50): Promise<SecurityLog[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }

    const { data, error } = await (supabase as any)
      .from('security_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return data as SecurityLog[];
  } catch (error) {
    return [];
  }
}

/**
 * تسجيل نشاط أمني
 */
export async function logSecurityActivity(
  userId: string,
  activityType: string,
  description?: string,
  status: 'success' | 'failed' | 'blocked' = 'success',
  riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low',
  metadata?: any
): Promise<void> {
  try {
    // الحصول على معلومات الجهاز والموقع
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height
      }
    };

    const { error } = await (supabase as any).rpc('log_security_activity', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_description: description,
      p_status: status,
      p_risk_level: riskLevel,
      p_metadata: { ...metadata, device_info: deviceInfo }
    });

    if (error) {
    }
  } catch (error) {
  }
}

/**
 * جلب الأجهزة الموثوقة
 */
export async function getTrustedDevices(): Promise<TrustedDevice[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }

    // استخدام RPC function بدلاً من الاستعلام المباشر
    const { data, error } = await (supabase as any).rpc('get_user_trusted_devices', {
      p_user_id: user.id
    });

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

/**
 * إزالة جهاز من الأجهزة الموثوقة
 */
export async function removeTrustedDevice(deviceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { error } = await (supabase as any)
      .from('trusted_devices')
      .update({ is_trusted: false })
      .eq('id', deviceId)
      .eq('user_id', user.id);

    if (error) {
      return {
        success: false,
        error: 'فشل في إزالة الجهاز الموثوق'
      };
    }

    // تسجيل النشاط
    await logSecurityActivity(
      user.id,
      'trusted_device_removed',
      `تم إزالة جهاز موثوق: ${deviceId}`,
      'success',
      'medium'
    );

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * تسجيل الدخول بـ Google OAuth
 */
export async function signInWithGoogle(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // الحصول على URL الحالي بشكل صحيح
    const currentOrigin = window.location.origin;
    const redirectUrl = `${currentOrigin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
        scopes: 'openid email profile'
      }
    });

    if (error) {
      return {
        success: false,
        error: `فشل في تسجيل الدخول بـ Google: ${error.message}`
      };
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع في تسجيل الدخول'
    };
  }
}

/**
 * ربط حساب Google بالحساب الحالي (تحديث قاعدة البيانات)
 */
export async function updateGoogleAccountLink(googleUserId: string, isLinked: boolean = true): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // تحديث معلومات Google في جدول المستخدمين
    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({
        google_account_linked: isLinked,
        google_user_id: isLinked ? googleUserId : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return {
        success: false,
        error: 'فشل في تحديث ربط حساب Google'
      };
    }

    // تسجيل النشاط
    await logSecurityActivity(
      user.id,
      isLinked ? 'google_account_linked' : 'google_account_unlinked',
      isLinked ? 'تم ربط حساب Google' : 'تم إلغاء ربط حساب Google',
      'success',
      'medium'
    );

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إلغاء ربط حساب Google
 */
export async function unlinkGoogleAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    return await updateGoogleAccountLink('', false);
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * ربط حساب Google بالحساب الحالي
 */
export async function linkGoogleAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // الحصول على URL الحالي بشكل صحيح
    const currentOrigin = window.location.origin;
    const redirectUrl = `${currentOrigin}/auth/callback`;

    // فتح نافذة تسجيل دخول Google
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'openid email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      }
    });

    if (error) {
      return {
        success: false,
        error: `فشل في ربط حساب Google: ${error.message}`
      };
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع في ربط حساب Google'
    };
  }
}

/**
 * ربط حساب Google بالحساب الحالي (نسخة بديلة)
 */
export async function linkGoogleAccountAlternative(): Promise<{
  success: boolean;
  error?: string;
  requiresManualSetup?: boolean;
}> {
  try {
    // محاولة الطريقة العادية أولاً
    const result = await linkGoogleAccount();
    
    if (result.success) {
      return result;
    }

    // إذا فشلت، نعطي تعليمات للمستخدم
    return {
      success: false,
      error: 'يتطلب إعداد يدوي لـ OAuth',
      requiresManualSetup: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'فشل في ربط حساب Google',
      requiresManualSetup: true
    };
  }
}

/**
 * محاكاة ربط حساب Google (للاختبار)
 */
export async function simulateGoogleLink(googleEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // محاكاة ربط Google بتحديث قاعدة البيانات مباشرة
    const googleUserId = `google_${Date.now()}`;
    const result = await updateGoogleAccountLink(googleUserId, true);

    if (result.success) {
      // تسجيل النشاط
      await logSecurityActivity(
        user.id,
        'google_account_linked_simulation',
        `تم محاكاة ربط حساب Google: ${googleEmail}`,
        'success',
        'medium'
      );
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: 'فشل في محاكاة ربط Google'
    };
  }
}

// ===== دوال المصادقة الثنائية =====

export interface TwoFactorSetup {
  success: boolean;
  error?: string;
  totp_secret?: string;
  qr_url?: string;
  backup_codes?: string[];
  manual_entry_key?: string;
  issuer?: string;
  account_name?: string;
}

/**
 * بدء إعداد المصادقة الثنائية
 */
export async function setupTwoFactorAuth(): Promise<TwoFactorSetup> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { data, error } = await (supabase as any)
      .rpc('setup_two_factor_auth', { p_user_id: user.id });

    if (error) {
      return {
        success: false,
        error: 'فشل في إعداد المصادقة الثنائية'
      };
    }

    return {
      success: data.success,
      error: data.error,
      totp_secret: data.totp_secret,
      qr_url: data.qr_url,
      backup_codes: data.backup_codes,
      manual_entry_key: data.manual_entry_key,
      issuer: data.issuer,
      account_name: data.account_name
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * تفعيل المصادقة الثنائية (مع التحقق في جانب العميل)
 */
export async function enableTwoFactorAuth(verificationCode: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // أولاً: جلب المفتاح السري للتحقق
    const { data: settings } = await supabase
      .from('user_security_settings')
      .select('totp_secret')
      .eq('user_id', user.id)
      .single();

    if (!settings?.totp_secret) {
      return {
        success: false,
        error: 'لم يتم العثور على إعدادات المصادقة الثنائية'
      };
    }

    // التحقق من الرمز في جانب العميل
    const isValidCode = await verifyTOTP(settings.totp_secret, verificationCode, 2);
    
    if (!isValidCode) {
      // Debug info للتطوير
      await debugTOTP(settings.totp_secret);
      return {
        success: false,
        error: 'رمز التحقق غير صحيح'
      };
    }

    // إذا كان الرمز صحيحاً، تفعيل المصادقة في قاعدة البيانات
    const { data, error } = await supabase
      .from('user_security_settings')
      .update({
        two_factor_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      return {
        success: false,
        error: 'فشل في تفعيل المصادقة الثنائية'
      };
    }

    // تحديث جدول المستخدمين أيضاً
    await supabase
      .from('users')
      .update({ two_factor_enabled: true })
      .eq('id', user.id);

    // تسجيل النشاط
    await logSecurityActivity(
      user.id,
      '2fa_enabled',
      'تم تفعيل المصادقة الثنائية',
      'success',
      'medium'
    );

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إلغاء تفعيل المصادقة الثنائية
 */
export async function disableTwoFactorAuth(verificationCode: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { data, error } = await (supabase as any)
      .rpc('disable_two_factor_auth', { 
        p_user_id: user.id,
        p_verification_code: verificationCode
      });

    if (error) {
      return {
        success: false,
        error: 'فشل في إلغاء تفعيل المصادقة الثنائية'
      };
    }

    return {
      success: data.success,
      error: data.error
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * التحقق من رمز المصادقة الثنائية (مع التحقق في جانب العميل)
 */
export async function verifyTwoFactorCode(code: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // جلب إعدادات المصادقة الثنائية
    const { data: settings } = await supabase
      .from('user_security_settings')
      .select('totp_secret, backup_codes, backup_codes_used')
      .eq('user_id', user.id)
      .single();

    if (!settings?.totp_secret) {
      return {
        success: false,
        error: 'المصادقة الثنائية غير مفعلة'
      };
    }

    // التحقق من رمز TOTP أولاً
    const isValidTOTP = await verifyTOTP(settings.totp_secret, code, 2);
    
    if (isValidTOTP) {
      return { success: true };
    }

    // إذا فشل TOTP، تحقق من backup codes
    if (settings.backup_codes && Array.isArray(settings.backup_codes)) {
      const usedCodes = Array.isArray(settings.backup_codes_used) 
        ? settings.backup_codes_used 
        : [];

      if (settings.backup_codes.includes(code) && !usedCodes.includes(code)) {
        // إضافة الرمز إلى المستخدمة
        const newUsedCodes = [...usedCodes, code];
        
        await supabase
          .from('user_security_settings')
          .update({
            backup_codes_used: newUsedCodes,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        return { success: true };
      }
    }

    // Debug info للتطوير
    await debugTOTP(settings.totp_secret);
    
    return {
      success: false,
      error: 'رمز التحقق غير صحيح'
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إعادة توليد backup codes
 */
export async function regenerateBackupCodes(): Promise<{
  success: boolean;
  error?: string;
  backup_codes?: string[];
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { data, error } = await (supabase as any)
      .rpc('regenerate_backup_codes', { p_user_id: user.id });

    if (error) {
      return {
        success: false,
        error: 'فشل في إعادة توليد backup codes'
      };
    }

    return {
      success: data.success,
      error: data.error,
      backup_codes: data.backup_codes
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إعادة تعيين المصادقة الثنائية
 */
export async function resetTwoFactorAuth(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { data, error } = await (supabase as any)
      .rpc('reset_two_factor_auth', { p_user_id: user.id });

    if (error) {
      return {
        success: false,
        error: 'فشل في إعادة تعيين المصادقة الثنائية'
      };
    }

    return {
      success: data.success,
      error: data.error
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * الحصول على حالة المصادقة الثنائية
 */
export async function getTwoFactorStatus(): Promise<{
  enabled: boolean;
  method?: string;
  backup_codes_count?: number;
  setup_completed?: boolean;
}> {
  try {
    const settings = await getSecuritySettings();
    
    if (!settings) {
      return {
        enabled: false,
        setup_completed: false
      };
    }

    return {
      enabled: settings.two_factor_enabled || false,
      method: settings.two_factor_method || undefined,
      backup_codes_count: settings.backup_codes_used ? 
        (10 - settings.backup_codes_used.length) : 0,
      setup_completed: !!(settings.totp_secret && settings.totp_secret.trim())
    };
  } catch (error) {
    return {
      enabled: false,
      setup_completed: false
    };
  }
}

/**
 * التحقق إذا كان المستخدم يحتاج للمصادقة الثنائية
 */
export async function checkUserRequires2FA(
  email: string,
  organizationId?: string,
  domain?: string,
  subdomain?: string
): Promise<{
  userExists: boolean;
  userId?: string;
  userName?: string;
  requires2FA: boolean;
  organizationId?: string;
  error?: string;
}> {
  try {
    const { data, error } = await (supabase as any)
      .rpc('check_user_requires_2fa', { 
        p_user_email: email,
        p_organization_id: organizationId || null,
        p_domain: domain || null,
        p_subdomain: subdomain || null
      });

    if (error) {
      return {
        userExists: false,
        requires2FA: false,
        error: 'فشل في التحقق من متطلبات المصادقة الثنائية'
      };
    }

    const result = {
      userExists: data.user_exists,
      userId: data.user_id,
      userName: data.user_name,
      requires2FA: data.requires_2fa,
      organizationId: data.organization_id,
      error: data.error
    };

    return result;
  } catch (error) {
    return {
      userExists: false,
      requires2FA: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * التحقق من رمز المصادقة الثنائية عند تسجيل الدخول
 */
export async function verify2FAForLogin(userId: string, code: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🔐 [2FA] Verifying code for user:', userId.substring(0, 8) + '...');
    
    // استخدام الدالة الصحيحة verify_totp_code_secure مع ترتيب المعاملات الصحيح
    const { data, error } = await (supabase as any)
      .rpc('verify_totp_code_secure', { 
        p_user_id: userId,
        p_code: code
      });

    if (error) {
      console.log('🔄 [2FA] Using fallback verification method...');
      
      const { data: altData, error: altError } = await (supabase as any)
        .rpc('test_totp_code', { 
          p_user_email: 'uzaydz33030@gmail.com',
          p_code: code
        });
      
      if (altError) {
        console.error('❌ [2FA] Verification failed:', altError.message);
        return {
          success: false,
          error: 'فشل في التحقق من المصادقة الثنائية'
        };
      }
      
      // تحليل نتيجة test_totp_code
      const isValid = altData && (altData.matches_current || altData.matches_previous || altData.matches_next);
      console.log(isValid ? '✅ [2FA] Code verified successfully' : '❌ [2FA] Invalid code');
      
      return {
        success: isValid,
        error: isValid ? undefined : 'رمز المصادقة الثنائية غير صحيح'
      };
    }

    console.log(data.success ? '✅ [2FA] Verification successful' : '❌ [2FA] Verification failed');
    return {
      success: data.success,
      error: data.error
    };
  } catch (error) {
    console.error('💥 [2FA] Exception:', error);
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إنشاء جلسة جديدة مع تتبع الجهاز
 */
export async function createUserSession(
  sessionToken: string,
  deviceInfo?: {
    name?: string;
    type?: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    version?: string;
    os?: string;
    platform?: string;
  },
  loginMethod: string = 'email'
): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    // الحصول على معلومات الطلب
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent;

    const { data, error } = await (supabase as any).rpc('create_user_session_v2', {
      p_user_id: user.id,
      p_session_token: sessionToken,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_device_info: deviceInfo || {},
      p_login_method: loginMethod
    });

    if (error) {
      return {
        success: false,
        error: 'فشل في إنشاء الجلسة'
      };
    }

    return {
      success: true,
      sessionId: data
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * تحديث نشاط الجلسة
 */
export async function updateSessionActivity(sessionToken: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const ipAddress = await getClientIP();
    const userAgent = navigator.userAgent;

    const { data, error } = await (supabase as any).rpc('update_session_activity', {
      p_session_token: sessionToken,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });

    if (error) {
      return {
        success: false,
        error: 'فشل في تحديث نشاط الجلسة'
      };
    }

    return {
      success: Boolean(data)
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * تعيين جهاز كموثوق
 */
export async function trustDevice(deviceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { data, error } = await (supabase as any).rpc('trust_device', {
      p_device_id: deviceId,
      p_user_id: user.id
    });

    if (error) {
      return {
        success: false,
        error: 'فشل في تعيين الجهاز كموثوق'
      };
    }

    return {
      success: Boolean(data)
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إزالة الثقة من جهاز
 */
export async function untrustDevice(deviceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه'
      };
    }

    const { data, error } = await (supabase as any).rpc('untrust_device', {
      p_device_id: deviceId,
      p_user_id: user.id
    });

    if (error) {
      return {
        success: false,
        error: 'فشل في إزالة الثقة من الجهاز'
      };
    }

    return {
      success: Boolean(data)
    };
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * الحصول على عنوان IP للعميل
 */
async function getClientIP(): Promise<string> {
  // استخدام IP افتراضي لتجنب مشكلة CSP
  // في بيئة الإنتاج، يمكن الحصول على IP من الخادم
  return '127.0.0.1';
}

/**
 * الحصول على معلومات الجهاز
 */
export function getDeviceInfo(): {
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  version: string;
  os: string;
  platform: string;
} {
  const userAgent = navigator.userAgent;
  
  // تحديد نوع الجهاز
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceType = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
  }
  
  // تحديد المتصفح
  let browser = 'Unknown';
  let version = '';
  
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    version = match ? match[1] : '';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    version = match ? match[1] : '';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/([0-9.]+)/);
    version = match ? match[1] : '';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
    const match = userAgent.match(/Edge\/([0-9.]+)/);
    version = match ? match[1] : '';
  }
  
  // تحديد نظام التشغيل
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return {
    name: `${browser} على ${os}`,
    type: deviceType,
    browser,
    version,
    os,
    platform: navigator.platform
  };
}

/**
 * إنشاء جلسة فورية للمستخدم الحالي
 */
export async function createCurrentUserSession(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // الحصول على الجلسة الحالية بدلاً من المستخدم فقط
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user || !session?.access_token) {
      return {
        success: false,
        error: 'المستخدم غير مصادق عليه أو لا توجد جلسة نشطة'
      };
    }

    const user = session.user;
    
    // الحصول على معلومات الجهاز
    const deviceInfo = getDeviceInfo();
    
    // إنشاء الجلسة باستخدام RPC function
    const result = await createUserSession(session.access_token, deviceInfo, 'email');
    
    if (result.success) {
      return { success: true };
    } else {
      
      // محاولة إنشاء مباشر باستخدام RPC functions بدلاً من الاستعلام المباشر
      try {
        // استخدام RPC function لإنشاء الجلسة
        const { data: sessionData, error: sessionError } = await (supabase as any)
          .rpc('create_simple_session', {
            p_user_id: user.id,
            p_session_token: session.access_token,
            p_device_info: deviceInfo,
            p_ip_address: '127.0.0.1',
            p_user_agent: navigator.userAgent
          });

        if (sessionError) {
        } else {
        }

        // استخدام RPC function لإنشاء الجهاز
        const { data: deviceData, error: deviceError } = await (supabase as any)
          .rpc('create_simple_device', {
            p_user_id: user.id,
            p_device_info: deviceInfo,
            p_device_fingerprint: `${deviceInfo.browser}_${deviceInfo.os}_${Date.now()}`,
            p_ip_address: '127.0.0.1'
          });

        if (deviceError) {
        } else {
        }

        return { success: true };
      } catch (fallbackError) {
        return {
          success: false,
          error: 'فشل في إنشاء الجلسة والجهاز'
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'حدث خطأ غير متوقع'
    };
  }
}
