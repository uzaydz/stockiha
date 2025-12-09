/**
 * ⚡ usePowerSync - v2.0 (Best Practices 2025)
 * ============================================================
 *
 * 🚀 Wrapper للتوافق مع الكود القديم
 *    يستخدم usePowerSync من @powersync/react داخلياً
 *
 * ⚠️ هذا الملف للتوافق مع الكود القديم فقط!
 *    للمشاريع الجديدة، استخدم usePowerSync من @powersync/react مباشرة
 *
 * المصادر:
 * - https://powersync-ja.github.io/powersync-js/react-sdk
 * ============================================================
 */

import { usePowerSync as usePowerSyncFromLib } from '@powersync/react';
import { useAppPowerSync } from '@/context/PowerSyncProvider';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

/**
 * 🎣 usePowerSync - للتوافق مع الكود القديم
 *
 * @deprecated Use usePowerSync from @powersync/react instead
 */
export function usePowerSync() {
  // استخدام hook الرسمي
  const db = usePowerSyncFromLib();
  const { isInitialized, error } = useAppPowerSync();

  return {
    db,
    isReady: isInitialized && !!db,
    error,
    powerSyncService,
  };
}

export default usePowerSync;
