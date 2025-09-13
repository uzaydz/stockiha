/**
 * 🔍 أداة تشخيص الرندر المتكرر
 * تساعد في تحديد أسباب الرندر المفرط في React components
 */

import React from 'react';

export const createRenderDiagnostics = (componentName: string) => {
  let renderCount = 0;
  let previousProps: any = {};
  let previousState: any = {};

  return {
    trackRender: (currentProps: any = {}, currentState: any = {}) => {
      renderCount++;

      const isDev = typeof import.meta !== 'undefined' ? import.meta.env.DEV : true;
      const isExcessiveRender = renderCount > 5;

      // تقليل الكلفة: في التطوير، لا تنفّذ تحليل عميق بعد أول تحذير
      if (isDev && isExcessiveRender && renderCount === 6) {
        // سطر واحد فقط بدون تحليل تفصيلي لتجنب حظر الخيط
        console.warn(`🚨 [${componentName}] تشخيص الرندر المتكرر - ${renderCount} مرات`);
      }

      // إيقاف الرندر المتكرر بعد عدد معين من المرات
      if (isExcessiveRender && renderCount > 10) {
        console.error(`🚫 [${componentName}] رندر متكرر مفرط تم إيقافه - ${renderCount} مرات`);
        return {
          renderCount,
          isExcessive: true,
          stopped: true
        };
      }

      // حفظ القيم الحالية بشكل سطحي فقط لتقليل الكلفة
      previousProps = currentProps;
      previousState = currentState;

      return {
        renderCount,
        isExcessive: isExcessiveRender
      };
    },
    
    getRenderCount: () => renderCount,
    reset: () => {
      renderCount = 0;
      previousProps = {};
      previousState = {};
    }
  };
};

const analyzeChanges = (previous: any, current: any, type: string) => {
  const changes: any[] = [];
  
  // فحص الخصائص المحذوفة
  Object.keys(previous).forEach(key => {
    if (!(key in current)) {
      changes.push({
        type: 'deleted',
        key,
        previousValue: previous[key]
      });
    }
  });
  
  // فحص الخصائص الجديدة والمتغيرة
  Object.keys(current).forEach(key => {
    if (!(key in previous)) {
      changes.push({
        type: 'added',
        key,
        currentValue: current[key]
      });
    } else if (previous[key] !== current[key]) {
      changes.push({
        type: 'changed',
        key,
        previousValue: previous[key],
        currentValue: current[key],
        typeChanged: typeof previous[key] !== typeof current[key]
      });
    }
  });
  
  if (changes.length > 0) {
    console.log(`🔄 تغييرات ${type}:`, changes);
  }
  
  return changes;
};

const deepClone = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned: any = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  
  return cloned;
};

// Hook للاستخدام المباشر في المكونات
export const useRenderDiagnostics = (componentName: string, props?: any, state?: any) => {
  const diagnostics = React.useRef(createRenderDiagnostics(componentName));
  
  React.useEffect(() => {
    const result = diagnostics.current.trackRender(props, state);

    if (result.isExcessive) {
      // تقليل التسجيل المفرط - فقط في التطوير وبعد 5 مرات فقط
      if (process.env.NODE_ENV === 'development' && result.renderCount >= 6 && result.renderCount % 3 === 0) {
        console.warn(`⚠️ [${componentName}] رندر مفرط مكتشف - ${result.renderCount} مرات`);
      }
    }
  });
  
  return {
    renderCount: diagnostics.current.getRenderCount(),
    reset: diagnostics.current.reset
  };
};
