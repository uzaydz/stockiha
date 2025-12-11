/**
 * ⚡ Style Constants - لتحسين أداء React
 *
 * استخدام هذه الثوابت بدلاً من inline styles لتجنب:
 * - إنشاء objects جديدة في كل render
 * - فشل React.memo و PureComponent
 * - Re-renders غير ضرورية
 *
 * @example
 * // ❌ سيء - inline style
 * <div style={{ contain: 'layout' }}>
 *
 * // ✅ جيد - constant
 * import { CONTAIN_LAYOUT } from '@/lib/styles/constants';
 * <div style={CONTAIN_LAYOUT}>
 */

import type { CSSProperties } from 'react';

// ========================================
// Layout Containment Styles
// ========================================

/** تحسين الأداء - يحد من إعادة الحساب للعناصر */
export const CONTAIN_LAYOUT: CSSProperties = { contain: 'layout' };

/** تحسين الأداء - يحد من إعادة حساب المحتوى */
export const CONTAIN_CONTENT: CSSProperties = { contain: 'content' };

/** تحسين الأداء للرسم */
export const CONTAIN_PAINT: CSSProperties = { contain: 'paint' };

/** تحسين الأداء الشامل */
export const CONTAIN_STRICT: CSSProperties = { contain: 'strict' };

// ========================================
// Table Styles
// ========================================

/** نمط TableBody المحسّن */
export const TABLE_BODY_OPTIMIZED: CSSProperties = {
  contain: 'content',
  contentVisibility: 'auto' as any,
};

/** فاصل مخفي للجداول */
export const TABLE_SPACER: CSSProperties = {
  height: 24,
  visibility: 'hidden',
};

// ========================================
// Visibility Styles
// ========================================

/** إخفاء العنصر مع الاحتفاظ بمكانه */
export const VISIBILITY_HIDDEN: CSSProperties = { visibility: 'hidden' };

/** إخفاء العنصر بالكامل */
export const DISPLAY_NONE: CSSProperties = { display: 'none' };

// ========================================
// Flex Styles
// ========================================

/** Flex مع توسيط */
export const FLEX_CENTER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** Flex عمودي */
export const FLEX_COL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

/** Flex أفقي */
export const FLEX_ROW: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
};

/** توسيع العنصر */
export const FLEX_1: CSSProperties = { flex: 1 };

// ========================================
// Position Styles
// ========================================

/** تثبيت العنصر */
export const POSITION_RELATIVE: CSSProperties = { position: 'relative' };
export const POSITION_ABSOLUTE: CSSProperties = { position: 'absolute' };
export const POSITION_FIXED: CSSProperties = { position: 'fixed' };

/** تغطية كاملة */
export const ABSOLUTE_FILL: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ========================================
// Safe Area Styles (للتطبيقات المحمولة)
// ========================================

/** حشوة آمنة للـ bottom */
export const SAFE_AREA_BOTTOM: CSSProperties = {
  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
};

/** حشوة آمنة للـ top */
export const SAFE_AREA_TOP: CSSProperties = {
  paddingTop: 'env(safe-area-inset-top, 0px)',
};

// ========================================
// Overflow Styles
// ========================================

export const OVERFLOW_HIDDEN: CSSProperties = { overflow: 'hidden' };
export const OVERFLOW_AUTO: CSSProperties = { overflow: 'auto' };
export const OVERFLOW_SCROLL: CSSProperties = { overflow: 'scroll' };

// ========================================
// Text Styles
// ========================================

/** منع التفاف النص */
export const TEXT_NOWRAP: CSSProperties = { whiteSpace: 'nowrap' };

/** قطع النص مع ... */
export const TEXT_ELLIPSIS: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// ========================================
// Z-Index Styles
// ========================================

export const Z_INDEX_DROPDOWN: CSSProperties = { zIndex: 50 };
export const Z_INDEX_MODAL: CSSProperties = { zIndex: 100 };
export const Z_INDEX_OVERLAY: CSSProperties = { zIndex: 200 };
export const Z_INDEX_TOAST: CSSProperties = { zIndex: 300 };

// ========================================
// Transition Styles
// ========================================

/** انتقال سلس */
export const TRANSITION_ALL: CSSProperties = {
  transition: 'all 0.2s ease-in-out',
};

/** انتقال الشفافية */
export const TRANSITION_OPACITY: CSSProperties = {
  transition: 'opacity 0.2s ease-in-out',
};

/** انتقال التحويل */
export const TRANSITION_TRANSFORM: CSSProperties = {
  transition: 'transform 0.2s ease-in-out',
};

// ========================================
// Helper Functions
// ========================================

/**
 * دمج عدة styles
 * @example
 * const myStyle = mergeStyles(FLEX_CENTER, CONTAIN_LAYOUT, { padding: 10 });
 */
export function mergeStyles(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

/**
 * إنشاء style ديناميكي مع caching
 * @example
 * const getHeightStyle = createDynamicStyle((height: number) => ({ height }));
 * <div style={getHeightStyle(100)} />
 */
export function createDynamicStyle<T extends (...args: any[]) => CSSProperties>(
  factory: T
): T {
  const cache = new Map<string, CSSProperties>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) {
      cache.set(key, factory(...args));
    }
    return cache.get(key)!;
  }) as T;
}

// ========================================
// Pre-cached Dynamic Styles
// ========================================

/** Width style مع caching */
export const getWidthStyle = createDynamicStyle((width: number | string) => ({
  width: typeof width === 'number' ? `${width}px` : width,
}));

/** Height style مع caching */
export const getHeightStyle = createDynamicStyle((height: number | string) => ({
  height: typeof height === 'number' ? `${height}px` : height,
}));

/** Background color مع caching */
export const getBgColorStyle = createDynamicStyle((color: string) => ({
  backgroundColor: color,
}));

/** Color style مع caching */
export const getColorStyle = createDynamicStyle((color: string) => ({
  color,
}));
