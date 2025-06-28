import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SubscriptionService } from '@/lib/subscription-service';

export const SubscriptionDebug: React.FC = () => {
  const { organization } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCalculation = async () => {
    if (!organization) return;
    
    setLoading(true);
    try {
      const result = await SubscriptionService.calculateTotalDaysLeft(organization, null);
      setDebugInfo({
        organization: {
          id: organization.id,
          name: organization.name,
          subscription_status: organization.subscription_status,
          subscription_tier: organization.subscription_tier,
          created_at: organization.created_at,
          settings: organization.settings
        },
        calculation: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setDebugInfo({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testCalculation();
  }, [organization]);

  if (!organization) {
    return <div className="p-4 bg-gray-100 rounded">لا توجد بيانات مؤسسة</div>;
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
      <h3 className="font-bold text-blue-800 mb-2">🔍 معلومات تشخيصية للاشتراك</h3>
      
      <button
        onClick={testCalculation}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'جاري الحساب...' : 'إعادة حساب الأيام المتبقية'}
      </button>

      {debugInfo && (
        <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  );
}; 