import React, { useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';
import { Button } from '@/components/ui/button';

const OpenStoreRedirect: React.FC = () => {
  const { currentOrganization } = useTenant();

  const getStoreUrl = (): string => {
    const sub = currentOrganization?.subdomain;
    if (!sub) return '/';

    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';

    if (host.includes('localhost')) {
      return `http://${sub}.localhost${port}`;
    }
    if (host.includes('stockiha.com') || host.includes('stockiha.pages.dev')) {
      return `https://${sub}.stockiha.com`;
    }
    if (host.includes('ktobi.online')) {
      return `https://${sub}.ktobi.online`;
    }
    return '/';
  };

  useEffect(() => {
    const url = getStoreUrl();
    // افتح في نفس التبويب ليتصرف كرابط داخلي من لوحة التحكم
    window.location.assign(url);
  }, []);

  const fallbackUrl = getStoreUrl();

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-xl font-semibold mb-2">جاري فتح واجهة المتجر…</h1>
      <p className="text-muted-foreground mb-4">إذا لم يتم التحويل تلقائياً، اضغط على الزر أدناه.</p>
      <a href={fallbackUrl} target="_self" rel="noopener noreferrer">
        <Button>فتح المتجر الآن</Button>
      </a>
    </div>
  );
};

export default OpenStoreRedirect;


