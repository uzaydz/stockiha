import React, { useEffect } from 'react';
import Layout from '@/components/Layout';
import { useIsAppEnabled, useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import EnhancedLoader from '@/components/EnhancedLoader';
import { GameDownloadsApp } from '@/components/apps/game-downloads';
import { POSLayoutState, RefreshHandler } from '@/components/pos-layout/types';

interface GameDownloadsPageProps {
  useStandaloneLayout?: boolean;
  onRegisterRefresh?: (handler: RefreshHandler) => void;
  onLayoutStateChange?: (state: POSLayoutState) => void;
}

const GameDownloadsPage: React.FC<GameDownloadsPageProps> = ({ 
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange 
}) => {
  const { isLoading } = useSuperUnifiedData();
  const isAppEnabled = useIsAppEnabled('game-downloads');

  // تسجيل دالة التحديث للـ Layout
  useEffect(() => {
    if (onRegisterRefresh) {
      const refreshHandler = async () => {
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: true });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        if (onLayoutStateChange) {
          onLayoutStateChange({ isRefreshing: false });
        }
      };
      onRegisterRefresh(refreshHandler);
    }
  }, [onRegisterRefresh, onLayoutStateChange]);

  // تحديث حالة الـ Layout عند التحميل
  useEffect(() => {
    if (onLayoutStateChange) {
      onLayoutStateChange({
        connectionStatus: 'connected',
        isRefreshing: isLoading,
      });
    }
  }, [isLoading, onLayoutStateChange]);

  const content = (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader text="جاري تحميل تطبيق الألعاب..." />
        </div>
      ) : !isAppEnabled ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">تطبيق تحميل الألعاب غير مفعل</p>
          </div>
        </div>
      ) : (
        <GameDownloadsApp />
      )}
    </>
  );

  if (!useStandaloneLayout) {
    return content;
  }

  return <Layout>{content}</Layout>;
};

export default GameDownloadsPage;
