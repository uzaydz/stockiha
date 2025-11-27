-- =====================================================
-- Migration: Fix Yalidine Tracking RLS Policies
-- Date: 2025-01-14
-- Description: تصحيح سياسات RLS للسماح للمستخدمين بإضافة وتحديث سجلات التتبع
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Service role can insert delivery history" ON yalidine_delivery_history;
DROP POLICY IF EXISTS "Service role can update delivery history" ON yalidine_delivery_history;

-- سياسة جديدة للإضافة: المستخدمون يمكنهم إضافة سجلات لمؤسساتهم فقط
CREATE POLICY "Users can insert their org delivery history"
    ON yalidine_delivery_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    );

-- سياسة جديدة للتحديث: المستخدمون يمكنهم تحديث سجلات مؤسساتهم فقط
CREATE POLICY "Users can update their org delivery history"
    ON yalidine_delivery_history
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    );

-- تحديث سياسات الكاش
DROP POLICY IF EXISTS "Service role can manage tracking cache" ON yalidine_tracking_cache;

CREATE POLICY "Users can insert their org tracking cache"
    ON yalidine_tracking_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their org tracking cache"
    ON yalidine_tracking_cache
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- نهاية Migration
-- =====================================================
