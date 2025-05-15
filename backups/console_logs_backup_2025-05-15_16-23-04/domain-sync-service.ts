import { getSupabaseClient } from '@/lib/supabase';
import { verifyVercelDomainStatus, linkDomainToVercelProject } from './domain-verification-api';

/**
 * خدمة مزامنة حالة النطاقات المخصصة
 * هذه الخدمة تتحقق دوريًا من حالة النطاقات وتحدثها في قاعدة البيانات
 */
export class DomainSyncService {
  private vercelToken: string;
  private vercelProjectId: string;
  private supabase: any;
  private isSyncing: boolean = false;

  constructor(vercelToken: string, vercelProjectId: string) {
    this.vercelToken = vercelToken;
    this.vercelProjectId = vercelProjectId;
    this.supabase = getSupabaseClient();
  }

  /**
   * بدء عملية مزامنة النطاقات
   * يُفضل تشغيل هذه الوظيفة على فترات زمنية منتظمة (مثلاً كل ساعة)
   */
  public async syncAllDomains(): Promise<{
    success: boolean;
    processed: number;
    updated: number;
    errors: number;
  }> {
    if (this.isSyncing) {
      console.log('عملية مزامنة أخرى قيد التنفيذ، تخطي...');
      return {
        success: false,
        processed: 0,
        updated: 0,
        errors: 0
      };
    }

    this.isSyncing = true;
    let processed = 0;
    let updated = 0;
    let errors = 0;

    try {
      // استعلام عن جميع المنظمات التي لديها نطاقات
      const { data: organizations, error } = await this.supabase
        .from('organizations')
        .select('id, domain')
        .not('domain', 'is', null);

      if (error) {
        console.error('خطأ في استعلام المنظمات:', error);
        return {
          success: false,
          processed: 0,
          updated: 0,
          errors: 1
        };
      }

      // مزامنة كل نطاق
      for (const org of organizations) {
        if (!org.domain) continue;
        processed++;

        try {
          const domainStatus = await verifyVercelDomainStatus(
            org.domain,
            this.vercelProjectId,
            this.vercelToken
          );

          // تحديث حالة النطاق في قاعدة البيانات
          const { error: updateError } = await this.supabase
            .from('domain_verifications')
            .update({
              status: domainStatus.verified ? 'active' : 'pending',
              last_checked: new Date().toISOString(),
              verification_message: domainStatus.message
            })
            .eq('organization_id', org.id)
            .eq('domain', org.domain);

          if (updateError) {
            console.error(`خطأ في تحديث حالة النطاق ${org.domain}:`, updateError);
            errors++;
          } else {
            updated++;
          }

          // إذا لم يتم التحقق من النطاق، حاول إعادة ربطه
          if (!domainStatus.verified) {
            await this.reconnectDomain(org.domain, org.id);
          }
        } catch (err) {
          console.error(`خطأ في مزامنة النطاق ${org.domain}:`, err);
          errors++;
        }
      }

      return {
        success: true,
        processed,
        updated,
        errors
      };
    } catch (error) {
      console.error('خطأ في عملية المزامنة:', error);
      return {
        success: false,
        processed,
        updated,
        errors: errors + 1
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * إعادة ربط نطاق بمشروع Vercel
   */
  private async reconnectDomain(domain: string, organizationId: string): Promise<boolean> {
    try {
      const result = await linkDomainToVercelProject(
        domain,
        this.vercelProjectId,
        this.vercelToken
      );

      if (result.success) {
        // تحديث سجل التحقق
        const { error } = await this.supabase
          .from('domain_verifications')
          .update({
            verification_data: result.data?.verification || null,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', organizationId)
          .eq('domain', domain);

        if (error) {
          console.error(`خطأ في تحديث بيانات إعادة ربط النطاق ${domain}:`, error);
        }
      }

      return result.success;
    } catch (error) {
      console.error(`خطأ في إعادة ربط النطاق ${domain}:`, error);
      return false;
    }
  }
}

/**
 * وظيفة مساعدة لإنشاء نسخة من خدمة مزامنة النطاقات
 */
export const createDomainSyncService = (): DomainSyncService | null => {
  const vercelToken = process.env.VERCEL_API_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken || !vercelProjectId) {
    console.error('لم يتم تكوين متغيرات البيئة اللازمة لخدمة مزامنة النطاقات');
    return null;
  }

  return new DomainSyncService(vercelToken, vercelProjectId);
}; 