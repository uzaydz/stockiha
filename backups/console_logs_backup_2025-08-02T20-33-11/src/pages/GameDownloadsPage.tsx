import React from 'react';
import Layout from '@/components/Layout';
import { useIsAppEnabled, useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import EnhancedLoader from '@/components/EnhancedLoader';
import { GameDownloadsApp } from '@/components/apps/game-downloads';

const GameDownloadsPage: React.FC = () => {
  const { isLoading } = useSuperUnifiedData();
  const isAppEnabled = useIsAppEnabled('game-downloads');

  // انتظار تحميل البيانات
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader text="جاري تحميل تطبيق الألعاب..." />
        </div>
      </Layout>
    );
  }

  // التحقق من تفعيل التطبيق
  if (!isAppEnabled) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">تطبيق تحميل الألعاب غير مفعل</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <GameDownloadsApp />
    </Layout>
  );
};

export default GameDownloadsPage;
