import React from 'react';

interface SyncManagerProps {
  autoSync?: boolean;
  syncInterval?: number; // بالملي ثانية
  onSyncStatusChange?: (isSyncing: boolean) => void;
  showIndicator?: boolean;
  forceDisable?: boolean; // إضافة خيار لتعطيل المزامنة إجبارياً
}

const SyncManager: React.FC<SyncManagerProps> = ({
  autoSync = true,
  syncInterval = 60000, // افتراضياً كل دقيقة
  onSyncStatusChange,
  showIndicator = true,
  forceDisable = false,
}) => {
  // تعطيل المزامنة في بيئة الويب - لا نحتاج للمزامنة في الموقع
  return null;
};

export default SyncManager;
