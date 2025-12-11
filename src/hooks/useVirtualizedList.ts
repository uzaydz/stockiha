/**
 * ⚡ useVirtualizedList - Hook للقوائم الافتراضية المحسّنة
 * ========================================================
 *
 * يستخدم @tanstack/react-virtual لعرض القوائم الكبيرة بكفاءة
 * يعرض فقط العناصر المرئية في الشاشة
 *
 * التحسين المتوقع:
 * - 1000 عنصر → فقط 20-30 عنصر مُرندر
 * - تقليل الذاكرة بنسبة 80%+
 * - تقليل وقت الرندر بنسبة 90%+
 */

import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { useVirtualizer, VirtualizerOptions } from '@tanstack/react-virtual';

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface VirtualizedListOptions<T> {
  /** البيانات المراد عرضها */
  items: T[];
  /** ارتفاع كل عنصر (افتراضي: 50px) */
  estimatedItemSize?: number;
  /** عدد العناصر الإضافية خارج الشاشة (افتراضي: 5) */
  overscan?: number;
  /** تفعيل التحميل اللامتناهي */
  enableInfiniteScroll?: boolean;
  /** عدد العناصر للتحميل في كل مرة */
  loadMoreCount?: number;
  /** دالة تحميل المزيد */
  onLoadMore?: () => Promise<void>;
  /** هل يوجد المزيد للتحميل؟ */
  hasMore?: boolean;
  /** هل جاري التحميل؟ */
  isLoading?: boolean;
  /** اتجاه القائمة */
  horizontal?: boolean;
  /** تفعيل التمرير السلس */
  smoothScroll?: boolean;
}

export interface VirtualizedListResult<T> {
  /** المرجع للـ container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** الـ virtualizer instance */
  virtualizer: ReturnType<typeof useVirtualizer>;
  /** العناصر الافتراضية للرندر */
  virtualItems: ReturnType<typeof useVirtualizer>['getVirtualItems'];
  /** الارتفاع الكلي للقائمة */
  totalHeight: number;
  /** هل نحن قريبون من النهاية؟ */
  isNearEnd: boolean;
  /** الانتقال إلى عنصر معين */
  scrollToItem: (index: number, align?: 'start' | 'center' | 'end') => void;
  /** الانتقال إلى الأعلى */
  scrollToTop: () => void;
  /** الانتقال إلى الأسفل */
  scrollToBottom: () => void;
  /** البحث والانتقال إلى عنصر */
  scrollToItemByPredicate: (predicate: (item: T) => boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useVirtualizedList<T>(
  options: VirtualizedListOptions<T>
): VirtualizedListResult<T> {
  const {
    items,
    estimatedItemSize = 50,
    overscan = 5,
    enableInfiniteScroll = false,
    onLoadMore,
    hasMore = false,
    isLoading = false,
    horizontal = false,
    smoothScroll = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearEnd, setIsNearEnd] = useState(false);

  // إنشاء الـ virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimatedItemSize,
    overscan,
    horizontal,
    // تحسين الأداء
    measureElement: (element) => element.getBoundingClientRect()[horizontal ? 'width' : 'height'],
  });

  // الحصول على العناصر الافتراضية
  const virtualItems = virtualizer.getVirtualItems();

  // حساب الارتفاع الكلي
  const totalHeight = virtualizer.getTotalSize();

  // مراقبة الاقتراب من النهاية للـ infinite scroll
  useEffect(() => {
    if (!enableInfiniteScroll || !containerRef.current) return;

    const container = containerRef.current;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // نحن قريبون من النهاية إذا كان المتبقي أقل من 200px
      const nearEnd = scrollHeight - scrollTop - clientHeight < 200;
      setIsNearEnd(nearEnd);

      // تحميل المزيد إذا كنا قريبين من النهاية
      if (nearEnd && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [enableInfiniteScroll, hasMore, isLoading, onLoadMore]);

  // دوال التنقل
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    virtualizer.scrollToIndex(index, {
      align,
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [virtualizer, smoothScroll]);

  const scrollToTop = useCallback(() => {
    virtualizer.scrollToOffset(0, {
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [virtualizer, smoothScroll]);

  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToOffset(totalHeight, {
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [virtualizer, totalHeight, smoothScroll]);

  const scrollToItemByPredicate = useCallback((predicate: (item: T) => boolean) => {
    const index = items.findIndex(predicate);
    if (index !== -1) {
      scrollToItem(index, 'center');
    }
  }, [items, scrollToItem]);

  return {
    containerRef,
    virtualizer,
    virtualItems: () => virtualItems,
    totalHeight,
    isNearEnd,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    scrollToItemByPredicate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 SPECIALIZED HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook مخصص للجداول الافتراضية
 */
export interface VirtualizedTableOptions<T> extends VirtualizedListOptions<T> {
  /** ارتفاع الـ header */
  headerHeight?: number;
  /** ارتفاع صف البيانات */
  rowHeight?: number;
}

export function useVirtualizedTable<T>(
  options: VirtualizedTableOptions<T>
) {
  const {
    headerHeight = 48,
    rowHeight = 52,
    ...listOptions
  } = options;

  const result = useVirtualizedList({
    ...listOptions,
    estimatedItemSize: rowHeight,
  });

  // حساب paddingTop للـ header
  const headerOffset = headerHeight;

  return {
    ...result,
    headerHeight,
    rowHeight,
    headerOffset,
  };
}

/**
 * Hook للبحث في القائمة الافتراضية
 */
export function useVirtualizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
) {
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;

    const term = searchTerm.toLowerCase().trim();

    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(term);
        }
        if (typeof value === 'number') {
          return value.toString().includes(term);
        }
        return false;
      });
    });
  }, [items, searchTerm, searchFields]);

  return filteredItems;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 RENDER HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * إنشاء styles للـ virtual container
 */
export function getVirtualContainerStyles(
  totalHeight: number,
  horizontal = false
): React.CSSProperties {
  return {
    height: horizontal ? '100%' : `${totalHeight}px`,
    width: horizontal ? `${totalHeight}px` : '100%',
    position: 'relative',
  };
}

/**
 * إنشاء styles للعنصر الافتراضي
 */
export function getVirtualItemStyles(
  start: number,
  size: number,
  horizontal = false
): React.CSSProperties {
  return {
    position: 'absolute',
    top: horizontal ? 0 : start,
    left: horizontal ? start : 0,
    width: horizontal ? size : '100%',
    height: horizontal ? '100%' : size,
  };
}

export default useVirtualizedList;
