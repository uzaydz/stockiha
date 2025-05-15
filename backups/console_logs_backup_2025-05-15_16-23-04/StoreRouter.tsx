import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getOrganizationByDomain, getOrganizationBySubdomain } from '@/lib/api/subdomain';
import { extractSubdomainFromHostname } from '@/lib/api/subdomain';
import StorePage from '@/components/store/StorePage';
import LandingPage from '@/pages/landing/LandingPage';
import { getFullStoreData } from '@/api/store';

/**
 * مكون للتوجيه المباشر إلى صفحة المتجر عند استخدام سابدومين أو دومين مخصص
 */
const StoreRouter = () => {
  const [isStore, setIsStore] = useState<boolean | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);

  useEffect(() => {
    const checkDomain = async () => {
      setIsLoading(true);
      const hostname = window.location.hostname;
      
      console.log('StoreRouter: التحقق من النطاق:', hostname);
      
      // تخطي الفحص للـ localhost بدون سابدومين
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('StoreRouter: الدومين هو localhost، عرض صفحة الهبوط');
        setIsStore(false);
        setIsLoading(false);
        return;
      }
      
      // 1. التحقق من السابدومين
      const subdomain = extractSubdomainFromHostname(hostname);
      
      if (subdomain && subdomain !== 'www') {
        console.log('StoreRouter: اكتشاف سابدومين:', subdomain);
        const organization = await getOrganizationBySubdomain(subdomain);
        
        if (organization) {
          console.log('StoreRouter: تم العثور على مؤسسة بالسابدومين:', organization.name);
          localStorage.setItem('bazaar_organization_id', organization.id);
          localStorage.setItem('bazaar_current_subdomain', subdomain);
          setOrganizationId(organization.id);
          
          // تحميل بيانات المتجر
          try {
            console.log('StoreRouter: تحميل بيانات المتجر للسابدومين:', subdomain);
            const data = await getFullStoreData(subdomain);
            if (data) {
              setStoreData(data);
              console.log('StoreRouter: تم تحميل بيانات المتجر بنجاح');
            }
          } catch (error) {
            console.error('StoreRouter: خطأ في تحميل بيانات المتجر:', error);
          }
          
          setIsStore(true);
          setIsLoading(false);
          return;
        }
      }
      
      // 2. التحقق من الدومين المخصص
      const organization = await getOrganizationByDomain(hostname);
      
      if (organization) {
        console.log('StoreRouter: تم العثور على مؤسسة بالدومين المخصص:', organization.name);
        localStorage.setItem('bazaar_organization_id', organization.id);
        localStorage.setItem('bazaar_current_subdomain', organization.subdomain || '');
        setOrganizationId(organization.id);
        
        // تحميل بيانات المتجر
        if (organization.subdomain) {
          try {
            console.log('StoreRouter: تحميل بيانات المتجر للسابدومين:', organization.subdomain);
            const data = await getFullStoreData(organization.subdomain);
            if (data) {
              setStoreData(data);
              console.log('StoreRouter: تم تحميل بيانات المتجر بنجاح');
            }
          } catch (error) {
            console.error('StoreRouter: خطأ في تحميل بيانات المتجر:', error);
          }
        }
        
        setIsStore(true);
        setIsLoading(false);
        return;
      }
      
      // 3. لم يتم العثور على مؤسسة، عرض صفحة الهبوط
      console.log('StoreRouter: لم يتم العثور على مؤسسة، عرض صفحة الهبوط');
      setIsStore(false);
      setIsLoading(false);
    };
    
    checkDomain();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold">جاري التحميل...</h2>
        </div>
      </div>
    );
  }
  
  // إذا كان دومين متجر، عرض صفحة المتجر مباشرة مع البيانات التي تم تحميلها
  if (isStore === true) {
    return <StorePage storeData={storeData}/>;
  }
  
  // وإلا، عرض صفحة الهبوط العادية
  return <LandingPage />;
};

export default StoreRouter;
