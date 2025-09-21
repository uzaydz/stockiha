/* أداة خفيفة لتتبّع الأداء - تعمل فقط في التطوير أو عند تمكين العلم */

const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : true;
const isEnabled = () => {
  try {
    return isDev || (typeof window !== 'undefined' && (window as any).__PERF_DEBUG__ === true);
  } catch {
    return isDev;
  }
};

export function mark(name: string): void {
  if (!isEnabled()) return;
  try { performance.mark(name); } catch {}
}

export function measure(name: string, startMark: string, endMark?: string): void {
  if (!isEnabled()) return;
  try {
    if (endMark) performance.mark(endMark);
    const measureName = endMark ? `${name}` : `${name}`;
    performance.measure(measureName, startMark, endMark);
    const entries = performance.getEntriesByName(measureName);
    const last = entries[entries.length - 1] as PerformanceMeasure | undefined;
    if (last) {
      console.log(`⏱️ [PERF] ${measureName}: ${last.duration.toFixed(1)}ms`);
    }
  } catch {}
}

const timers = new Map<string, number>();

export function time(name: string): void {
  if (!isEnabled()) return;
  timers.set(name, performance.now());
}

export function timeEnd(name: string, extra?: Record<string, any>): void {
  if (!isEnabled()) return;
  const start = timers.get(name);
  if (start !== undefined) {
    const dur = performance.now() - start;
    timers.delete(name);
    try { console.log(`⏱️ [PERF] ${name}: ${dur.toFixed(1)}ms`, extra || {}); } catch {}
  }
}

export function log(stage: string, info?: Record<string, any>): void {
  if (!isEnabled()) return;
  try { console.log(`🧭 [PERF] ${stage}`, info || {}); } catch {}
}

export default { mark, measure, time, timeEnd, log };


