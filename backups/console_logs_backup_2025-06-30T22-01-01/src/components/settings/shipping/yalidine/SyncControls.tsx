import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface SyncControlsProps {
  isSyncing: boolean;
  isSyncingProvinces: boolean;
  onSyncClick: () => void;
  onSyncGlobalProvinces: () => void;
  onStopSync: () => void;
  onForceReset: () => void;
  isEnabled: boolean;
}

/**
 * مكون أزرار التحكم في المزامنة
 */
export const SyncControls: React.FC<SyncControlsProps> = ({
  isSyncing,
  isSyncingProvinces,
  onSyncClick,
  onSyncGlobalProvinces,
  onStopSync,
  onForceReset,
  isEnabled
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Button 
        onClick={onSyncClick} 
        disabled={isSyncing || isSyncingProvinces}
        size="sm"
      >
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('yalidine.sync.syncing', 'جاري المزامنة...')}
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('yalidine.sync.sync', 'مزامنة البيانات')}
          </>
        )}
      </Button>
      
      {isSyncing && (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={onStopSync}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          {t('yalidine.sync.stop', 'إيقاف المزامنة')}
        </Button>
      )}
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onSyncGlobalProvinces}
        disabled={isSyncingProvinces || isSyncing}
      >
        {isSyncingProvinces ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {t('yalidine.sync.updateProvinces', 'تحديث الولايات فقط')}
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={onForceReset}
        disabled={isSyncing}
      >
        {t('yalidine.sync.reset', 'إعادة تعيين')}
      </Button>
      
      <Button
        variant={!isEnabled ? "outline" : "default"}
        size="sm"
        disabled={true}
      >
        {isEnabled ? t('yalidine.status.enabled', 'مفعل') : t('yalidine.status.disabled', 'معطل')}
      </Button>
    </div>
  );
};
