import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PublicGameStore } from '@/components/apps/game-downloads';
import { getOrganizationBySubdomain, getOrganizationByDomain, extractSubdomainFromHostname } from '@/lib/api/subdomain';

const PublicGameStorePage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [detectedOrgId, setDetectedOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectOrganization = async () => {
      try {
        // الأولوية 1: معرف المؤسسة من URL
        if (organizationId) {
          setDetectedOrgId(organizationId);
          setIsLoading(false);
          return;
        }

        // الأولوية 2: التخزين المحلي (من StoreRouter)
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        if (storedOrgId && storedOrgId !== 'default-organization-id') {
          setDetectedOrgId(storedOrgId);
          setIsLoading(false);
          return;
        }

        // الأولوية 3: اكتشاف النطاق
        const hostname = window.location.hostname;
        const subdomain = extractSubdomainFromHostname(hostname);
        
        let org = null;
        
        // محاولة النطاق الفرعي أولاً
        if (subdomain) {
          org = await getOrganizationBySubdomain(subdomain);
        }
        
        // محاولة النطاق المخصص إذا فشل النطاق الفرعي
        if (!org) {
          org = await getOrganizationByDomain(hostname);
        }
        
        if (org) {
          setDetectedOrgId(org.id);
          // حفظ للاستخدام المستقبلي
          localStorage.setItem('bazaar_organization_id', org.id);
          localStorage.setItem('bazaar_current_subdomain', subdomain || hostname);
        } else {
          setError('لم يتم العثور على المؤسسة المطلوبة');
        }
      } catch (error) {
        setError('حدث خطأ أثناء تحميل المتجر');
      } finally {
        setIsLoading(false);
      }
    };

    detectOrganization();
  }, [organizationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">جاري تحميل المتجر...</p>
        </div>
      </div>
    );
  }

  if (error || !detectedOrgId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-destructive/10 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-bold text-destructive mb-2">المتجر غير متاح</h2>
            <p className="text-muted-foreground">
              {error || 'لم يتم العثور على المؤسسة المطلوبة. تأكد من صحة الرابط أو اتصل بالدعم.'}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return <PublicGameStore organizationId={detectedOrgId} />;
};

export default PublicGameStorePage;
