/**
 * 📦 PurchasesTabPage - صفحة تبويب المشتريات
 * ============================================================
 *
 * صفحة رئيسية للمشتريات تعرض:
 * - قائمة المشتريات (الوضع الافتراضي)
 * - نموذج إنشاء/تعديل فاتورة مشتريات
 *
 * ============================================================
 */

import React, { useState, useCallback } from 'react';
import { SupplierPurchasesList } from '@/components/suppliers/SupplierPurchasesList';
import { SmartPurchasePage } from './SmartPurchasePage';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';

interface PurchasesTabPageProps {
  /** معرف المشتريات للتعديل */
  purchaseId?: string;
}

export function PurchasesTabPage({ purchaseId }: PurchasesTabPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(purchaseId ? 'edit' : 'list');
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | undefined>(purchaseId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // الانتقال لإنشاء فاتورة جديدة
  const handleCreateNew = useCallback(() => {
    setEditingPurchaseId(undefined);
    setViewMode('create');
  }, []);

  // العودة للقائمة
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setEditingPurchaseId(undefined);
    // تحديث القائمة بعد الحفظ
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // عرض قائمة المشتريات
  if (viewMode === 'list') {
    return (
      <SupplierPurchasesList
        onAddNewPurchase={handleCreateNew}
        refreshTrigger={refreshTrigger}
      />
    );
  }

  // عرض نموذج إنشاء/تعديل
  return (
    <div className="space-y-4">
      {/* زر العودة */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToList}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للقائمة
        </Button>
      </div>

      {/* نموذج المشتريات */}
      <SmartPurchasePage
        purchaseId={editingPurchaseId}
        useStandaloneLayout={false}
        onSuccess={handleBackToList}
      />
    </div>
  );
}

export default PurchasesTabPage;
