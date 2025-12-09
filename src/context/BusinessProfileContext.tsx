/**
 * 🏪 Business Profile Context
 *
 * السياق الذكي لإدارة ملف تعريف العمل التجاري
 * يتكامل مع Supabase والتخزين المحلي للعمل أوفلاين
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import type {
  BusinessType,
  BusinessProfile,
  BusinessProfileContextType,
  ProductFeatures,
  POSFeatures,
  PurchaseFeatures,
  AnyFeatureKey,
} from '@/lib/business/types';

import {
  getBusinessProfile,
  mergeFeatures,
  DEFAULT_PRODUCT_FEATURES,
  DEFAULT_POS_FEATURES,
  DEFAULT_PURCHASE_FEATURES,
} from '@/lib/business/presets';

import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

// =====================================================
// ثوابت التخزين المحلي
// =====================================================

const STORAGE_KEY = 'bazaar_business_profile';
const STORAGE_VERSION = 1;

interface StoredProfile {
  version: number;
  organizationId: string;
  profile: BusinessProfile;
  isSelected: boolean;
  updatedAt: string;
}

// =====================================================
// دوال التخزين المحلي
// =====================================================

/**
 * حفظ الملف الشخصي محلياً
 */
function saveToLocalStorage(organizationId: string, profile: BusinessProfile, isSelected: boolean): void {
  try {
    const data: StoredProfile = {
      version: STORAGE_VERSION,
      organizationId,
      profile,
      isSelected,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${STORAGE_KEY}_${organizationId}`, JSON.stringify(data));
  } catch (error) {
    console.warn('[BusinessProfile] فشل في الحفظ المحلي:', error);
  }
}

/**
 * تحميل الملف الشخصي من التخزين المحلي
 */
function loadFromLocalStorage(organizationId: string): StoredProfile | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${organizationId}`);
    if (!stored) return null;

    const data: StoredProfile = JSON.parse(stored);

    // التحقق من الإصدار والمؤسسة
    if (data.version !== STORAGE_VERSION || data.organizationId !== organizationId) {
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[BusinessProfile] فشل في التحميل المحلي:', error);
    return null;
  }
}

/**
 * مسح التخزين المحلي
 */
function clearLocalStorage(organizationId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${organizationId}`);
  } catch (error) {
    // تجاهل
  }
}

// =====================================================
// إنشاء السياق
// =====================================================

const BusinessProfileContext = createContext<BusinessProfileContextType | undefined>(undefined);

// =====================================================
// مزود السياق
// =====================================================

export const BusinessProfileProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  // الحالة
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelected, setIsSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // مراجع
  const initializedRef = useRef(false);
  const lastOrgIdRef = useRef<string | null>(null);

  // الحصول على المؤسسة من AuthContext
  const { organization, authReady } = useAuth();
  const organizationId = organization?.id;

  // =====================================================
  // تحميل البيانات من Supabase
  // =====================================================

  const loadFromSupabase = useCallback(async (orgId: string): Promise<{
    profile: BusinessProfile | null;
    isSelected: boolean;
  }> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('business_type, business_features, business_type_selected')
        .eq('id', orgId)
        .single();

      if (fetchError) {
        console.warn('[BusinessProfile] خطأ في جلب البيانات:', fetchError.message);
        return { profile: null, isSelected: false };
      }

      if (!data) {
        return { profile: null, isSelected: false };
      }

      const businessType = (data.business_type as BusinessType) || 'general_retail';
      const businessFeatures = (data.business_features as Record<string, boolean>) || {};
      const typeSelected = data.business_type_selected || false;

      // بناء الملف الشخصي
      const fullProfile = mergeFeatures(businessType, businessFeatures);

      return { profile: fullProfile, isSelected: typeSelected };
    } catch (err) {
      console.error('[BusinessProfile] خطأ:', err);
      return { profile: null, isSelected: false };
    }
  }, []);

  // =====================================================
  // تحميل البيانات الأولية
  // =====================================================

  const loadProfile = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    // تجنب التحميل المتكرر لنفس المؤسسة
    if (lastOrgIdRef.current === organizationId && initializedRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. محاولة التحميل من التخزين المحلي أولاً (سريع)
      const localData = loadFromLocalStorage(organizationId);
      if (localData) {
        console.log('[BusinessProfile] تم التحميل من التخزين المحلي');
        setProfile(localData.profile);
        setIsSelected(localData.isSelected);
        setIsLoading(false);
        initializedRef.current = true;
        lastOrgIdRef.current = organizationId;
      }

      // 2. محاولة التحميل من Supabase (في الخلفية)
      const supabaseData = await loadFromSupabase(organizationId);

      if (supabaseData.profile) {
        console.log('[BusinessProfile] تم التحميل من Supabase');
        setProfile(supabaseData.profile);
        setIsSelected(supabaseData.isSelected);

        // حفظ محلياً للاستخدام أوفلاين
        saveToLocalStorage(organizationId, supabaseData.profile, supabaseData.isSelected);
      } else if (!localData) {
        // لا توجد بيانات - استخدام الافتراضي
        console.log('[BusinessProfile] استخدام الإعدادات الافتراضية');
        const defaultProfile = getBusinessProfile('general_retail');
        setProfile(defaultProfile);
        setIsSelected(false);
      }

      initializedRef.current = true;
      lastOrgIdRef.current = organizationId;

    } catch (err) {
      console.error('[BusinessProfile] خطأ في التحميل:', err);
      setError('فشل في تحميل إعدادات العمل');

      // استخدام الافتراضي في حالة الخطأ
      if (!profile) {
        const defaultProfile = getBusinessProfile('general_retail');
        setProfile(defaultProfile);
      }
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, loadFromSupabase, profile]);

  // =====================================================
  // تحديد نوع التجارة
  // =====================================================

  const setBusinessType = useCallback(async (type: BusinessType): Promise<void> => {
    if (!organizationId) {
      throw new Error('لا توجد مؤسسة محددة');
    }

    setError(null);

    try {
      // بناء الملف الشخصي الجديد
      const newProfile = getBusinessProfile(type);

      // تحديث الحالة فوراً (Optimistic Update)
      setProfile(newProfile);
      setIsSelected(true);

      // حفظ محلياً
      saveToLocalStorage(organizationId, newProfile, true);

      // حفظ في Supabase
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          business_type: type,
          business_features: {
            ...newProfile.product_features,
            ...newProfile.pos_features,
            ...newProfile.purchase_features,
          },
          business_type_selected: true,
          business_type_selected_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (updateError) {
        console.warn('[BusinessProfile] خطأ في حفظ النوع:', updateError.message);
        // لا نرجع الخطأ لأن البيانات محفوظة محلياً
      }

      console.log(`[BusinessProfile] ✅ تم تحديد نوع التجارة: ${type}`);

    } catch (err) {
      console.error('[BusinessProfile] خطأ في تحديد النوع:', err);
      setError('فشل في حفظ نوع التجارة');
      throw err;
    }
  }, [organizationId]);

  // =====================================================
  // تحديث ميزة واحدة
  // =====================================================

  const updateFeature = useCallback(async (key: string, value: boolean): Promise<void> => {
    if (!organizationId || !profile) {
      throw new Error('لا توجد مؤسسة أو ملف تعريف');
    }

    setError(null);

    try {
      // تحديد نوع الميزة
      const isProductFeature = key in DEFAULT_PRODUCT_FEATURES;
      const isPOSFeature = key in DEFAULT_POS_FEATURES;
      const isPurchaseFeature = key in DEFAULT_PURCHASE_FEATURES;

      // بناء الملف الشخصي المحدث
      const updatedProfile: BusinessProfile = {
        ...profile,
        product_features: isProductFeature
          ? { ...profile.product_features, [key]: value }
          : profile.product_features,
        pos_features: isPOSFeature
          ? { ...profile.pos_features, [key]: value }
          : profile.pos_features,
        purchase_features: isPurchaseFeature
          ? { ...profile.purchase_features, [key]: value }
          : profile.purchase_features,
        updated_at: new Date().toISOString(),
      };

      // تحديث الحالة فوراً
      setProfile(updatedProfile);

      // حفظ محلياً
      saveToLocalStorage(organizationId, updatedProfile, isSelected);

      // حفظ في Supabase
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          business_features: {
            ...updatedProfile.product_features,
            ...updatedProfile.pos_features,
            ...updatedProfile.purchase_features,
          },
        })
        .eq('id', organizationId);

      if (updateError) {
        console.warn('[BusinessProfile] خطأ في حفظ الميزة:', updateError.message);
      }

    } catch (err) {
      console.error('[BusinessProfile] خطأ في تحديث الميزة:', err);
      setError('فشل في حفظ الميزة');
      throw err;
    }
  }, [organizationId, profile, isSelected]);

  // =====================================================
  // تحديث مجموعة ميزات
  // =====================================================

  const updateFeatures = useCallback(async (
    features: Partial<ProductFeatures & POSFeatures & PurchaseFeatures>
  ): Promise<void> => {
    if (!organizationId || !profile) {
      throw new Error('لا توجد مؤسسة أو ملف تعريف');
    }

    setError(null);

    try {
      // فصل الميزات حسب النوع
      const productUpdates: Partial<ProductFeatures> = {};
      const posUpdates: Partial<POSFeatures> = {};
      const purchaseUpdates: Partial<PurchaseFeatures> = {};

      Object.entries(features).forEach(([key, value]) => {
        if (key in DEFAULT_PRODUCT_FEATURES) {
          productUpdates[key as keyof ProductFeatures] = value;
        } else if (key in DEFAULT_POS_FEATURES) {
          posUpdates[key as keyof POSFeatures] = value;
        } else if (key in DEFAULT_PURCHASE_FEATURES) {
          purchaseUpdates[key as keyof PurchaseFeatures] = value;
        }
      });

      // بناء الملف الشخصي المحدث
      const updatedProfile: BusinessProfile = {
        ...profile,
        product_features: { ...profile.product_features, ...productUpdates },
        pos_features: { ...profile.pos_features, ...posUpdates },
        purchase_features: { ...profile.purchase_features, ...purchaseUpdates },
        updated_at: new Date().toISOString(),
      };

      // تحديث الحالة فوراً
      setProfile(updatedProfile);

      // حفظ محلياً
      saveToLocalStorage(organizationId, updatedProfile, isSelected);

      // حفظ في Supabase
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          business_features: {
            ...updatedProfile.product_features,
            ...updatedProfile.pos_features,
            ...updatedProfile.purchase_features,
          },
        })
        .eq('id', organizationId);

      if (updateError) {
        console.warn('[BusinessProfile] خطأ في حفظ الميزات:', updateError.message);
      }

      console.log('[BusinessProfile] ✅ تم تحديث الميزات');

    } catch (err) {
      console.error('[BusinessProfile] خطأ في تحديث الميزات:', err);
      setError('فشل في حفظ الميزات');
      throw err;
    }
  }, [organizationId, profile, isSelected]);

  // =====================================================
  // إعادة تعيين للإعدادات الافتراضية
  // =====================================================

  const resetToDefaults = useCallback(async (type?: BusinessType): Promise<void> => {
    if (!organizationId) {
      throw new Error('لا توجد مؤسسة محددة');
    }

    const businessType = type || profile?.business_type || 'general_retail';
    await setBusinessType(businessType);

    console.log(`[BusinessProfile] ✅ تمت إعادة التعيين للإعدادات الافتراضية: ${businessType}`);
  }, [organizationId, profile?.business_type, setBusinessType]);

  // =====================================================
  // تحديث البيانات
  // =====================================================

  const refresh = useCallback(async (): Promise<void> => {
    initializedRef.current = false;
    lastOrgIdRef.current = null;
    await loadProfile();
  }, [loadProfile]);

  // =====================================================
  // تحميل البيانات عند تغيير المؤسسة
  // =====================================================

  useEffect(() => {
    if (authReady && organizationId) {
      loadProfile();
    } else if (authReady && !organizationId) {
      // لا توجد مؤسسة - إعادة تعيين
      setProfile(null);
      setIsSelected(false);
      setIsLoading(false);
      initializedRef.current = false;
    }
  }, [authReady, organizationId, loadProfile]);

  // =====================================================
  // تنظيف عند تغيير المؤسسة
  // =====================================================

  useEffect(() => {
    if (organizationId !== lastOrgIdRef.current && lastOrgIdRef.current !== null) {
      // تغيرت المؤسسة - إعادة تعيين
      setProfile(null);
      setIsSelected(false);
      setIsLoading(true);
      setError(null);
      initializedRef.current = false;
    }
  }, [organizationId]);

  // =====================================================
  // قيمة السياق
  // =====================================================

  const value = useMemo((): BusinessProfileContextType => ({
    // الحالة
    profile,
    isLoading,
    isSelected,
    error,

    // الأفعال
    setBusinessType,
    updateFeature,
    updateFeatures,
    resetToDefaults,
    refresh,
  }), [
    profile,
    isLoading,
    isSelected,
    error,
    setBusinessType,
    updateFeature,
    updateFeatures,
    resetToDefaults,
    refresh,
  ]);

  return (
    <BusinessProfileContext.Provider value={value}>
      {children}
    </BusinessProfileContext.Provider>
  );
});

BusinessProfileProvider.displayName = 'BusinessProfileProvider';

// =====================================================
// Hooks للاستخدام
// =====================================================

/**
 * Hook للوصول لكامل السياق
 */
export function useBusinessProfile(): BusinessProfileContextType {
  const context = useContext(BusinessProfileContext);
  if (context === undefined) {
    throw new Error('useBusinessProfile must be used within a BusinessProfileProvider');
  }
  return context;
}

/**
 * 🎯 Hook ذكي للتحقق من ميزة واحدة
 *
 * @example
 * const canUseColors = useBusinessFeature('use_colors');
 * const canSellByWeight = useBusinessFeature('sell_by_weight');
 */
export function useBusinessFeature(featureKey: AnyFeatureKey): boolean {
  const { profile, isLoading } = useBusinessProfile();

  return useMemo(() => {
    // أثناء التحميل - نرجع القيمة الافتراضية
    if (isLoading || !profile) {
      // القيم الافتراضية الآمنة
      if (featureKey === 'sell_by_unit') return true;
      if (featureKey === 'track_low_stock') return true;
      if (featureKey === 'show_barcode') return true;
      if (featureKey === 'show_sku') return true;
      if (featureKey === 'show_purchase_price') return true;
      if (featureKey === 'show_profit_margin') return true;
      if (featureKey === 'allow_price_editing') return true;
      if (featureKey === 'allow_credit_sales') return true;
      return false;
    }

    // البحث في ميزات المنتج
    if (featureKey in profile.product_features) {
      return profile.product_features[featureKey as keyof ProductFeatures];
    }

    // البحث في ميزات نقطة البيع
    if (featureKey in profile.pos_features) {
      return profile.pos_features[featureKey as keyof POSFeatures];
    }

    // البحث في ميزات المشتريات
    if (featureKey in profile.purchase_features) {
      return profile.purchase_features[featureKey as keyof PurchaseFeatures];
    }

    return false;
  }, [profile, isLoading, featureKey]);
}

/**
 * 🎯 Hook للتحقق من مجموعة ميزات
 *
 * @example
 * const features = useBusinessFeatures(['use_colors', 'use_sizes', 'track_expiry']);
 * // { use_colors: true, use_sizes: true, track_expiry: false }
 */
export function useBusinessFeatures<T extends AnyFeatureKey>(
  featureKeys: T[]
): Record<T, boolean> {
  const { profile, isLoading } = useBusinessProfile();

  return useMemo(() => {
    const result = {} as Record<T, boolean>;

    featureKeys.forEach((key) => {
      if (isLoading || !profile) {
        // القيم الافتراضية
        result[key] = false;
        return;
      }

      if (key in profile.product_features) {
        result[key] = profile.product_features[key as keyof ProductFeatures];
      } else if (key in profile.pos_features) {
        result[key] = profile.pos_features[key as keyof POSFeatures];
      } else if (key in profile.purchase_features) {
        result[key] = profile.purchase_features[key as keyof PurchaseFeatures];
      } else {
        result[key] = false;
      }
    });

    return result;
  }, [profile, isLoading, featureKeys.join(',')]);
}

/**
 * 🎯 Hook للحصول على نوع التجارة الحالي
 */
export function useBusinessType(): {
  type: BusinessType | null;
  isSelected: boolean;
  isLoading: boolean;
} {
  const { profile, isSelected, isLoading } = useBusinessProfile();

  return useMemo(() => ({
    type: profile?.business_type || null,
    isSelected,
    isLoading,
  }), [profile?.business_type, isSelected, isLoading]);
}

/**
 * 🎯 Hook للتحقق هل يجب إظهار صفحة اختيار نوع التجارة
 */
export function useNeedsBusinessTypeSelection(): boolean {
  const { isSelected, isLoading } = useBusinessProfile();

  return useMemo(() => {
    if (isLoading) return false; // لا نعرض حتى ينتهي التحميل
    return !isSelected;
  }, [isSelected, isLoading]);
}

// =====================================================
// تصدير الأنواع
// =====================================================

export type {
  BusinessType,
  BusinessProfile,
  ProductFeatures,
  POSFeatures,
  PurchaseFeatures,
  AnyFeatureKey,
} from '@/lib/business/types';
