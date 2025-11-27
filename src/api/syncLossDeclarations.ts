/**
 * ⚡ Loss Declarations Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import {
  saveRemoteLossDeclarations,
  saveRemoteLossItems,
  type LocalLossDeclaration
} from './localLossDeclarationService';
import { deltaWriteService } from '@/services/DeltaWriteService';

/**
 * ⚡ مزامنة تصريحات الخسائر المعلقة
 * ملاحظة: BatchSender يتعامل مع هذا تلقائياً
 */
export const syncPendingLossDeclarations = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncPendingLossDeclarations] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  return { success: 0, failed: 0 };
};

/**
 * ⚡ جلب تصريحات الخسائر من السيرفر وحفظها محلياً
 */
export const fetchLossDeclarationsFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[fetchLossDeclarationsFromServer] ⚡ جلب تصريحات الخسائر من السيرفر...');

    const { data: losses, error } = await supabase
      .from('losses')
      .select('*, loss_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    if (!losses || losses.length === 0) {
      console.log('[fetchLossDeclarationsFromServer] لا توجد تصريحات خسائر في السيرفر');
      return 0;
    }

    // حفظ التصريحات
    await saveRemoteLossDeclarations(losses);

    // حفظ عناصر كل تصريح
    for (const loss of losses) {
      if (loss.loss_items && Array.isArray(loss.loss_items)) {
        await saveRemoteLossItems(loss.id, loss.loss_items);
      }
    }

    console.log(`[fetchLossDeclarationsFromServer] ✅ تم جلب ${losses.length} تصريح`);
    return losses.length;
  } catch (error) {
    console.error('[fetchLossDeclarationsFromServer] ❌ خطأ:', error);
    return 0;
  }
};
