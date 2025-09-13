import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { scheduleRead, scheduleWrite } from '@/utils/domOptimizer';

interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualizationResult<T> {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    item: T;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
  viewportProps: {
    style: React.CSSProperties;
  };
}

export function useVirtualization<T>(
  items: T[],
  config: VirtualizationConfig
): VirtualizationResult<T> {
  const { itemHeight, containerHeight, overscan = 5 } = config;
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const viewportStartIndex = Math.floor(scrollTop / itemHeight);
    const viewportEndIndex = Math.min(
      Math.ceil((scrollTop + containerHeight) / itemHeight),
      items.length - 1
    );

    const startIdx = Math.max(0, viewportStartIndex - overscan);
    const endIdx = Math.min(items.length - 1, viewportEndIndex + overscan);

    const visible = [];
    for (let i = startIdx; i <= endIdx; i++) {
      visible.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        item: items[i],
      });
    }

    return {
      startIndex: startIdx,
      endIndex: endIdx,
      visibleItems: visible,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (scrollElement) {
      const offset = index * itemHeight;
      scrollElement.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
    }
  }, [scrollElement, itemHeight]);

  const containerProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
    },
    onScroll: handleScroll,
    ref: (el: HTMLDivElement | null) => {
      setScrollElement(el);
    },
  }), [containerHeight, handleScroll]);

  const viewportProps = useMemo(() => ({
    style: {
      height: totalHeight,
      position: 'relative' as const,
    },
  }), [totalHeight]);

  return {
    virtualItems: visibleItems,
    totalHeight,
    scrollToIndex,
    containerProps,
    viewportProps,
  };
}

// Hook for dynamic item heights
interface DynamicVirtualizationConfig {
  estimatedItemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useDynamicVirtualization<T>(
  items: T[],
  config: DynamicVirtualizationConfig
) {
  const { estimatedItemHeight, containerHeight, overscan = 5 } = config;
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  const { offsets, totalHeight } = useMemo(() => {
    const offsetsArray: number[] = [0];
    let totalH = 0;

    for (let i = 0; i < items.length; i++) {
      const height = itemHeights.get(i) || estimatedItemHeight;
      totalH += height;
      offsetsArray.push(totalH);
    }

    return {
      offsets: offsetsArray,
      totalHeight: totalH,
    };
  }, [items.length, itemHeights, estimatedItemHeight]);

  const findStartIndex = useCallback((scrollTop: number) => {
    let low = 0;
    let high = offsets.length - 1;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (offsets[mid] < scrollTop) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return Math.max(0, low - 1);
  }, [offsets]);

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const startIdx = Math.max(0, findStartIndex(scrollTop) - overscan);
    let endIdx = startIdx;

    let accumulatedHeight = scrollTop;
    for (let i = startIdx; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + containerHeight + overscan * estimatedItemHeight) {
        break;
      }
      endIdx = i;
      accumulatedHeight += itemHeights.get(i) || estimatedItemHeight;
    }

    const visible = [];
    for (let i = startIdx; i <= endIdx; i++) {
      visible.push({
        index: i,
        start: offsets[i],
        end: offsets[i + 1] || totalHeight,
        item: items[i],
      });
    }

    return {
      startIndex: startIdx,
      endIndex: endIdx,
      visibleItems: visible,
    };
  }, [scrollTop, findStartIndex, overscan, containerHeight, estimatedItemHeight, items, itemHeights, offsets, totalHeight]);

  const setItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newMap = new Map(prev);
      if (newMap.get(index) !== height) {
        newMap.set(index, height);
      }
      return newMap;
    });
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (scrollElement && offsets[index] !== undefined) {
      scrollElement.scrollTo({
        top: offsets[index],
        behavior: 'smooth',
      });
    }
  }, [scrollElement, offsets]);

  const containerProps = useMemo(() => ({
    style: {
      height: containerHeight,
      overflow: 'auto' as const,
    },
    onScroll: handleScroll,
    ref: (el: HTMLDivElement | null) => {
      setScrollElement(el);
    },
  }), [containerHeight, handleScroll]);

  const viewportProps = useMemo(() => ({
    style: {
      height: totalHeight,
      position: 'relative' as const,
    },
  }), [totalHeight]);

  return {
    virtualItems: visibleItems,
    totalHeight,
    setItemHeight,
    scrollToIndex,
    containerProps,
    viewportProps,
  };
}
