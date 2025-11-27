/**
 * أداة تصحيح أخطاء لتتبع حلقات التحديث اللانهائية
 * استخدم هذه الأداة لتحديد المكون الذي يسبب "Maximum update depth exceeded"
 */

// تتبع عدد مرات render لكل مكون
const renderCounts: Map<string, { count: number; lastTime: number; stack: string[] }> = new Map();

// الحد الأقصى لعدد renders في الثانية قبل التحذير
const MAX_RENDERS_PER_SECOND = 50;

// تتبع آخر 100 render
const renderHistory: Array<{ component: string; time: number; props?: any }> = [];

/**
 * استخدم هذه الدالة في بداية كل مكون للتتبع
 * @example
 * function MyComponent() {
 *   trackRender('MyComponent');
 *   // ... rest of component
 * }
 */
export function trackRender(componentName: string, props?: any) {
  const now = Date.now();
  
  // تحديث السجل
  const entry = renderCounts.get(componentName) || { count: 0, lastTime: now, stack: [] };
  
  // إذا مر أكثر من ثانية، أعد تعيين العداد
  if (now - entry.lastTime > 1000) {
    entry.count = 0;
    entry.stack = [];
  }
  
  entry.count++;
  entry.lastTime = now;
  
  // حفظ stack trace
  try {
    throw new Error();
  } catch (e: any) {
    entry.stack.push(e.stack?.split('\n').slice(2, 5).join('\n') || '');
  }
  
  renderCounts.set(componentName, entry);
  
  // إضافة للتاريخ
  renderHistory.push({ component: componentName, time: now, props });
  if (renderHistory.length > 100) {
    renderHistory.shift();
  }
  
  // تحذير إذا تجاوز الحد
  if (entry.count > MAX_RENDERS_PER_SECOND) {
    console.error(
      `🔴 [RENDER LOOP DETECTED] Component "${componentName}" rendered ${entry.count} times in the last second!`,
      '\n📍 Recent stack traces:',
      entry.stack.slice(-3),
      '\n📦 Props:',
      props
    );
  } else if (entry.count > 10) {
    console.warn(
      `🟡 [HIGH RENDER COUNT] Component "${componentName}" rendered ${entry.count} times`,
    );
  }
}

/**
 * تتبع useEffect للكشف عن حلقات التحديث
 */
export function trackEffect(effectName: string, dependencies: any[]) {
  const depsString = JSON.stringify(dependencies, (key, value) => {
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Circular]';
      }
    }
    return value;
  });
  
  console.log(`🔵 [EFFECT RUN] ${effectName}`, '\nDependencies:', depsString);
}

/**
 * عرض تقرير عن حالة الـ renders
 */
export function getRenderReport() {
  console.group('📊 Render Report');
  
  // ترتيب حسب عدد مرات الـ render
  const sorted = Array.from(renderCounts.entries())
    .sort((a, b) => b[1].count - a[1].count);
  
  sorted.forEach(([name, data]) => {
    const status = data.count > MAX_RENDERS_PER_SECOND ? '🔴' : data.count > 10 ? '🟡' : '🟢';
    console.log(`${status} ${name}: ${data.count} renders`);
  });
  
  console.log('\n📜 Last 20 renders:');
  renderHistory.slice(-20).forEach(r => {
    console.log(`  - ${r.component} @ ${new Date(r.time).toISOString().slice(11, 23)}`);
  });
  
  console.groupEnd();
}

/**
 * إعادة تعيين العدادات
 */
export function resetRenderTracking() {
  renderCounts.clear();
  renderHistory.length = 0;
  console.log('🔄 Render tracking reset');
}

// إضافة للـ window للوصول من console
if (typeof window !== 'undefined') {
  (window as any).debugRender = {
    report: getRenderReport,
    reset: resetRenderTracking,
    history: renderHistory,
    counts: renderCounts,
  };
  
  console.log(
    '🔧 Debug render tools available:\n' +
    '  - window.debugRender.report() - عرض تقرير الـ renders\n' +
    '  - window.debugRender.reset() - إعادة تعيين التتبع\n' +
    '  - window.debugRender.history - سجل آخر 100 render\n' +
    '  - window.debugRender.counts - عدد renders لكل مكون'
  );
}

export default { trackRender, trackEffect, getRenderReport, resetRenderTracking };
