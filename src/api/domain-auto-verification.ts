import { getSupabaseClient } from '@/lib/supabase';
import { verifyDomainDNS, updateDomainVerificationStatus } from './domain-verification-api';

/**
 * خدمة التحقق التلقائي من النطاقات
 * تقوم بفحص جميع النطاقات المعلقة وتحديث حالتها
 */
export class AutoDomainVerificationService {
  private supabase = getSupabaseClient();
  private isRunning = false;

  /**
   * بدء خدمة التحقق التلقائي
   */
  public async startAutoVerification(): Promise<void> {
    if (this.isRunning) {
      
      return;
    }

    this.isRunning = true;
    

    // تشغيل التحقق كل 10 دقائق
    setInterval(async () => {
      await this.verifyPendingDomains();
    }, 10 * 60 * 1000); // 10 دقائق

    // تشغيل فحص فوري
    await this.verifyPendingDomains();
  }

  /**
   * إيقاف خدمة التحقق التلقائي
   */
  public stopAutoVerification(): void {
    this.isRunning = false;
    
  }

  /**
   * التحقق من جميع النطاقات المعلقة
   */
  public async verifyPendingDomains(): Promise<{
    checked: number;
    verified: number;
    failed: number;
  }> {
    if (!this.isRunning) {
      return { checked: 0, verified: 0, failed: 0 };
    }

    

    try {
      // الحصول على جميع النطاقات التي في حالة pending أو error
      const { data: pendingDomains, error } = await this.supabase
        .from('domain_verifications')
        .select(`
          id,
          domain,
          organization_id,
          status,
          last_checked,
          organizations!inner(id, name, domain)
        `)
        .in('status', ['pending', 'error'])
        .not('domain', 'is', null);

      if (error) {
        console.error('خطأ في استرجاع النطاقات المعلقة:', error);
        return { checked: 0, verified: 0, failed: 0 };
      }

      if (!pendingDomains || pendingDomains.length === 0) {
        
        return { checked: 0, verified: 0, failed: 0 };
      }

      

      let checked = 0;
      let verified = 0;
      let failed = 0;

      // التحقق من كل نطاق
      for (const domainRecord of pendingDomains) {
        try {
          checked++;
          

          // التحقق من DNS
          const dnsResult = await verifyDomainDNS(domainRecord.domain);

          if (dnsResult.success) {
            // تحديث الحالة إلى verified
            await updateDomainVerificationStatus(
              domainRecord.organization_id,
              domainRecord.domain,
              'verified',
              dnsResult.message || 'تم التحقق من النطاق بنجاح'
            );

            // تحديث النطاق في جدول organizations
            await this.supabase
              .from('organizations')
              .update({
                domain_verified: true,
                domain_verified_at: new Date().toISOString()
              })
              .eq('id', domainRecord.organization_id);

            verified++;
            
          } else {
            // تحديث timestamp آخر فحص فقط
            await this.supabase
              .from('domain_verifications')
              .update({
                last_checked: new Date().toISOString(),
                error_message: dnsResult.message
              })
              .eq('id', domainRecord.id);

            failed++;
            
          }

          // انتظار قصير بين الطلبات لتجنب rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failed++;
          console.error(`خطأ في التحقق من النطاق ${domainRecord.domain}:`, error);
          
          // تحديث حالة الخطأ
          await updateDomainVerificationStatus(
            domainRecord.organization_id,
            domainRecord.domain,
            'error',
            'حدث خطأ أثناء التحقق من النطاق'
          );
        }
      }

      
      
      return { checked, verified, failed };

    } catch (error) {
      console.error('خطأ في خدمة التحقق التلقائي:', error);
      return { checked: 0, verified: 0, failed: 0 };
    }
  }

  /**
   * فحص نطاق محدد فوراً
   */
  public async verifySpecificDomain(domain: string, organizationId: string): Promise<boolean> {
    try {
      

      const dnsResult = await verifyDomainDNS(domain);

      if (dnsResult.success) {
        await updateDomainVerificationStatus(
          organizationId,
          domain,
          'verified',
          dnsResult.message || 'تم التحقق من النطاق بنجاح'
        );

        await this.supabase
          .from('organizations')
          .update({
            domain_verified: true,
            domain_verified_at: new Date().toISOString()
          })
          .eq('id', organizationId);

        
        return true;
      } else {
        await updateDomainVerificationStatus(
          organizationId,
          domain,
          'pending',
          dnsResult.message || 'فشل التحقق من النطاق'
        );

        
        return false;
      }

    } catch (error) {
      console.error(`خطأ في الفحص الفوري للنطاق ${domain}:`, error);
      return false;
    }
  }
}

// إنشاء instance واحد للخدمة
export const autoDomainVerification = new AutoDomainVerificationService();

// بدء الخدمة تلقائياً في بيئة الإنتاج
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  autoDomainVerification.startAutoVerification();
}
