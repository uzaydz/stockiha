// إعدادات محسنة لـ Intersection Observer لتحسين أداء السكرول

// إعدادات مُحسّنة للأداء
export const observerConfig = {
  // هامش أقل لتقليل التحميل المبكر
  rootMargin: '50px',
  // عتبة أقل لتشغيل الحدث
  threshold: 0.1,
  // تحسين الأداء
  trackVisibility: true,
  delay: 100
};

// فئة لإدارة تحميل المكونات بكفاءة
export class LazyComponentLoader {
  private static instance: LazyComponentLoader;
  private observer: IntersectionObserver | null = null;
  private loadedComponents = new Set<string>();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObserver();
    }
  }

  static getInstance(): LazyComponentLoader {
    if (!LazyComponentLoader.instance) {
      LazyComponentLoader.instance = new LazyComponentLoader();
    }
    return LazyComponentLoader.instance;
  }

  private initializeObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const componentId = entry.target.getAttribute('data-component-id');
            if (componentId && !this.loadedComponents.has(componentId)) {
              this.loadedComponents.add(componentId);
              // تشغيل تحميل المكون
              entry.target.dispatchEvent(new CustomEvent('load-component'));
              // إلغاء مراقبة العنصر بعد التحميل
              this.observer?.unobserve(entry.target);
            }
          }
        });
      },
      observerConfig
    );
  }

  observeElement(element: Element, componentId: string) {
    if (this.observer && !this.loadedComponents.has(componentId)) {
      element.setAttribute('data-component-id', componentId);
      this.observer.observe(element);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Hook مخصص لتحسين الأداء
export const useOptimizedIntersection = (componentId: string) => {
  const loader = LazyComponentLoader.getInstance();
  
  return {
    observeElement: (element: Element) => loader.observeElement(element, componentId),
    disconnect: () => loader.disconnect()
  };
};