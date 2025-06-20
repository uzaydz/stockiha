import React from 'react';
import Layout from '@/components/Layout';
import { useApps } from '@/context/AppsContext';
import EnhancedLoader from '@/components/EnhancedLoader';
import { GameDownloadsApp } from '@/components/apps/game-downloads';

const GameDownloadsPage: React.FC = () => {
  const { isAppEnabled } = useApps();

  // التحقق من تفعيل التطبيق
  if (!isAppEnabled('game-downloads')) {
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