/**
 * ⚡ PowerSync Diagnostics - v2.0 (Best Practices 2025)
 * ============================================================
 *
 * أداة تشخيص شاملة لـ PowerSync
 *
 * تساعد في:
 * - التحقق من التكوين
 * - تشخيص مشاكل الاتصال
 * - فحص JWT Token
 * - اختبار المزامنة
 * ============================================================
 */

import { powerSyncService } from './PowerSyncService';
import { supabase } from '@/lib/supabase-unified';

export interface DiagnosticResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
}

export interface FullDiagnosticsReport {
  timestamp: string;
  environment: DiagnosticResult;
  supabaseConnection: DiagnosticResult;
  powerSyncUrl: DiagnosticResult;
  jwtToken: DiagnosticResult;
  powerSyncConnection: DiagnosticResult;
  syncRules: DiagnosticResult;
  localDatabase: DiagnosticResult;
  recommendations: string[];
}

/**
 * ⚡ التحقق من متغيرات البيئة
 */
export async function checkEnvironment(): Promise<DiagnosticResult> {
  const powerSyncUrl = import.meta.env.VITE_POWERSYNC_URL;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!powerSyncUrl) missing.push('VITE_POWERSYNC_URL');
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    return {
      status: 'error',
      message: `متغيرات البيئة مفقودة: ${missing.join(', ')}`,
      details: {
        hasPowerSyncUrl: !!powerSyncUrl,
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        powerSyncUrl: powerSyncUrl ? `${powerSyncUrl.slice(0, 30)}...` : 'NOT SET'
      }
    };
  }

  return {
    status: 'success',
    message: 'جميع متغيرات البيئة مُهيأة',
    details: {
      powerSyncUrl: `${powerSyncUrl.slice(0, 30)}...`,
      supabaseUrl: `${supabaseUrl.slice(0, 30)}...`
    }
  };
}

/**
 * ⚡ التحقق من اتصال Supabase
 */
export async function checkSupabaseConnection(): Promise<DiagnosticResult> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return {
        status: 'error',
        message: `خطأ في جلسة Supabase: ${error.message}`,
        details: { error }
      };
    }

    if (!data.session) {
      return {
        status: 'warning',
        message: 'لا توجد جلسة نشطة - يجب تسجيل الدخول أولاً',
        details: { hasSession: false }
      };
    }

    return {
      status: 'success',
      message: 'اتصال Supabase يعمل بشكل صحيح',
      details: {
        hasSession: true,
        userId: data.session.user.id.slice(0, 8) + '...',
        email: data.session.user.email
      }
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `فشل الاتصال بـ Supabase: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * ⚡ التحقق من JWT Token
 */
export async function checkJwtToken(): Promise<DiagnosticResult> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return {
        status: 'error',
        message: 'لا يمكن الحصول على JWT Token - لا توجد جلسة',
        details: { error: error?.message }
      };
    }

    const token = data.session.access_token;

    // فك تشفير JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        status: 'error',
        message: 'JWT Token غير صالح',
        details: { tokenParts: parts.length }
      };
    }

    try {
      const payload = JSON.parse(atob(parts[1]));

      // التحقق من وجود user_id
      const userId = payload.sub;
      if (!userId) {
        return {
          status: 'error',
          message: 'JWT Token لا يحتوي على user_id (sub)',
          details: { payload }
        };
      }

      // التحقق من organization_id في مواقع مختلفة
      const orgId = payload.organization_id ||
                    payload.user_metadata?.organization_id ||
                    payload.app_metadata?.organization_id;

      if (!orgId) {
        return {
          status: 'warning',
          message: 'JWT Token لا يحتوي على organization_id - قد يسبب مشاكل في المزامنة',
          details: {
            hasUserId: true,
            hasOrgId: false,
            payloadKeys: Object.keys(payload),
            userMetadataKeys: Object.keys(payload.user_metadata || {}),
            appMetadataKeys: Object.keys(payload.app_metadata || {})
          }
        };
      }

      return {
        status: 'success',
        message: 'JWT Token يحتوي على جميع البيانات المطلوبة',
        details: {
          hasUserId: true,
          userId: userId.slice(0, 8) + '...',
          hasOrgId: true,
          orgId: orgId.slice(0, 8) + '...',
          expiresAt: new Date(payload.exp * 1000).toISOString()
        }
      };
    } catch (decodeError: any) {
      return {
        status: 'error',
        message: `فشل فك تشفير JWT: ${decodeError.message}`,
        details: { error: decodeError.message }
      };
    }
  } catch (error: any) {
    return {
      status: 'error',
      message: `خطأ في فحص JWT: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * ⚡ التحقق من اتصال PowerSync
 */
export async function checkPowerSyncConnection(): Promise<DiagnosticResult> {
  try {
    const powerSyncUrl = import.meta.env.VITE_POWERSYNC_URL;

    if (!powerSyncUrl) {
      return {
        status: 'error',
        message: 'VITE_POWERSYNC_URL غير مُهيأ',
        details: { url: 'NOT SET' }
      };
    }

    // التحقق من تهيئة PowerSync Service
    if (!powerSyncService.isInitialized) {
      try {
        await powerSyncService.initialize();
      } catch (initError: any) {
        return {
          status: 'error',
          message: `فشل تهيئة PowerSync: ${initError.message}`,
          details: { error: initError.message }
        };
      }
    }

    const status = powerSyncService.syncStatus;

    return {
      status: status?.connected ? 'success' : 'warning',
      message: status?.connected
        ? 'PowerSync متصل ويعمل'
        : 'PowerSync مُهيأ لكن غير متصل بالخادم',
      details: {
        isInitialized: powerSyncService.isInitialized,
        isConnected: status?.connected || false,
        hasSynced: status?.hasSynced || false,
        lastSyncedAt: status?.lastSyncedAt || null
      }
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `خطأ في فحص PowerSync: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * ⚡ التحقق من Sync Rules
 */
export async function checkSyncRules(): Promise<DiagnosticResult> {
  try {
    if (!powerSyncService.isInitialized) {
      return {
        status: 'warning',
        message: 'PowerSync غير مُهيأ - لا يمكن فحص Sync Rules',
        details: {}
      };
    }

    const status = powerSyncService.syncStatus;

    // إذا كانت المزامنة قد اكتملت، فإن Sync Rules تعمل
    if (status?.hasSynced) {
      return {
        status: 'success',
        message: 'Sync Rules مُنشرة وتعمل',
        details: { hasSynced: true }
      };
    }

    // إذا كان متصلاً لكن لم يُزامن بعد
    if (status?.connected) {
      return {
        status: 'warning',
        message: 'PowerSync متصل لكن لم تكتمل المزامنة الأولى بعد',
        details: { connected: true, hasSynced: false }
      };
    }

    return {
      status: 'warning',
      message: 'لا يمكن التحقق من Sync Rules - غير متصل',
      details: {}
    };
  } catch (error: any) {
    return {
      status: 'warning',
      message: `لا يمكن التحقق من Sync Rules: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * ⚡ التحقق من قاعدة البيانات المحلية
 */
export async function checkLocalDatabase(): Promise<DiagnosticResult> {
  try {
    if (!powerSyncService.isInitialized || !powerSyncService.db) {
      return {
        status: 'warning',
        message: 'قاعدة البيانات المحلية غير مُهيأة',
        details: {}
      };
    }

    // فحص عدد السجلات في بعض الجداول
    const tableCounts: Record<string, number> = {};
    const tables = ['products', 'product_categories', 'orders', 'customers'];

    for (const table of tables) {
      try {
        const result = await powerSyncService.query<{ count: number }>({
          sql: `SELECT COUNT(*) as count FROM ${table}`,
          params: []
        });
        tableCounts[table] = result[0]?.count || 0;
      } catch {
        tableCounts[table] = -1; // خطأ
      }
    }

    const hasPendingUploads = await powerSyncService.hasPendingUploads();

    return {
      status: 'success',
      message: 'قاعدة البيانات المحلية تعمل',
      details: {
        tableCounts,
        hasPendingUploads
      }
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `خطأ في قاعدة البيانات المحلية: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * ⚡ تشخيص شامل
 */
export async function runFullDiagnostics(): Promise<FullDiagnosticsReport> {
  console.log('🔍 [PowerSync Diagnostics] بدء التشخيص الشامل...');

  const [
    environment,
    supabaseConnection,
    jwtToken,
    powerSyncConnection,
    syncRules,
    localDatabase
  ] = await Promise.all([
    checkEnvironment(),
    checkSupabaseConnection(),
    checkJwtToken(),
    checkPowerSyncConnection(),
    checkSyncRules(),
    checkLocalDatabase()
  ]);

  // تحديد التوصيات
  const recommendations: string[] = [];

  if (environment.status === 'error') {
    recommendations.push('أضف VITE_POWERSYNC_URL إلى ملف .env أو .env.local');
  }

  if (supabaseConnection.status !== 'success') {
    recommendations.push('تأكد من تسجيل الدخول وصحة بيانات Supabase');
  }

  if (jwtToken.status === 'warning') {
    recommendations.push('قم بتفعيل Custom Access Token Hook في Supabase Dashboard لإضافة organization_id إلى JWT');
  }

  if (powerSyncConnection.status !== 'success') {
    recommendations.push('تأكد من صحة VITE_POWERSYNC_URL وأن PowerSync Instance يعمل');
  }

  if (syncRules.status !== 'success') {
    recommendations.push('قم بنشر Sync Rules من PowerSync Dashboard');
  }

  const report: FullDiagnosticsReport = {
    timestamp: new Date().toISOString(),
    environment,
    supabaseConnection,
    powerSyncUrl: {
      status: environment.details?.hasPowerSyncUrl ? 'success' : 'error',
      message: environment.details?.hasPowerSyncUrl
        ? `PowerSync URL: ${environment.details?.powerSyncUrl}`
        : 'VITE_POWERSYNC_URL غير مُهيأ',
      details: { url: environment.details?.powerSyncUrl }
    },
    jwtToken,
    powerSyncConnection,
    syncRules,
    localDatabase,
    recommendations
  };

  console.log('✅ [PowerSync Diagnostics] اكتمل التشخيص:', report);

  return report;
}

/**
 * ⚡ طباعة تقرير التشخيص في Console
 */
export async function printDiagnosticsReport(): Promise<void> {
  const report = await runFullDiagnostics();

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           📊 PowerSync Diagnostics Report v2.0               ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const printResult = (name: string, result: DiagnosticResult) => {
    const icon = result.status === 'success' ? '✅' :
                 result.status === 'warning' ? '⚠️' : '❌';
    console.log(`║ ${icon} ${name.padEnd(20)} │ ${result.message.slice(0, 35).padEnd(35)} ║`);
  };

  printResult('Environment', report.environment);
  printResult('Supabase', report.supabaseConnection);
  printResult('PowerSync URL', report.powerSyncUrl);
  printResult('JWT Token', report.jwtToken);
  printResult('PowerSync Connection', report.powerSyncConnection);
  printResult('Sync Rules', report.syncRules);
  printResult('Local Database', report.localDatabase);

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ 📋 التوصيات:                                                 ║');

  if (report.recommendations.length === 0) {
    console.log('║   ✅ كل شيء يعمل بشكل صحيح!                                   ║');
  } else {
    report.recommendations.forEach((rec, i) => {
      console.log(`║   ${i + 1}. ${rec.slice(0, 55).padEnd(55)} ║`);
    });
  }

  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

/**
 * ⚡ إعادة تهيئة PowerSync
 */
export async function reinitializePowerSync(): Promise<DiagnosticResult> {
  try {
    console.log('🔄 [PowerSync] إعادة تهيئة PowerSync...');

    // قطع الاتصال إذا كان موجوداً
    if (powerSyncService.isInitialized) {
      await powerSyncService.disconnect();
    }

    // إعادة التهيئة
    await powerSyncService.initialize();

    // فرض المزامنة
    await powerSyncService.forceSync();

    return {
      status: 'success',
      message: 'تم إعادة تهيئة PowerSync بنجاح',
      details: {
        isInitialized: powerSyncService.isInitialized,
        isConnected: powerSyncService.syncStatus?.connected
      }
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `فشل إعادة التهيئة: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// تصدير للاستخدام في Console للتشخيص
if (typeof window !== 'undefined') {
  (window as any).__POWERSYNC_DIAGNOSTICS__ = {
    runFullDiagnostics,
    printDiagnosticsReport,
    checkEnvironment,
    checkSupabaseConnection,
    checkJwtToken,
    checkPowerSyncConnection,
    checkSyncRules,
    checkLocalDatabase,
    reinitializePowerSync
  };
}

export default {
  runFullDiagnostics,
  printDiagnosticsReport,
  checkEnvironment,
  checkSupabaseConnection,
  checkJwtToken,
  checkPowerSyncConnection,
  checkSyncRules,
  checkLocalDatabase,
  reinitializePowerSync
};
