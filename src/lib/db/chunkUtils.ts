/**
 * 🚀 Chunk Utilities for SQLite Bulk Operations
 * أدوات مساعدة لتقسيم العمليات الكبيرة إلى أجزاء صغيرة
 * هذا يمنع تجميد واجهة المستخدم ويحسن الأداء
 */

/**
 * تقسيم مصفوفة إلى أجزاء صغيرة
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * تنفيذ عملية على مصفوفة بشكل متقطع مع فترات راحة
 * هذا يسمح للمتصفح بمعالجة أحداث أخرى بين الأجزاء
 */
export const processInChunks = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    chunkSize?: number;
    delayBetweenChunks?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<{ success: number; failed: number; results: R[] }> => {
  const {
    chunkSize = 50,
    delayBetweenChunks = 0,
    onProgress
  } = options;

  const results: R[] = [];
  let successCount = 0;
  let failedCount = 0;

  const chunks = chunkArray(items, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const chunkResults = await Promise.allSettled(
      chunk.map(item => processor(item))
    );

    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        successCount++;
      } else {
        failedCount++;
      }
    }

    // تقرير التقدم
    if (onProgress) {
      const processed = Math.min((i + 1) * chunkSize, items.length);
      onProgress(processed, items.length);
    }

    // فترة راحة بين الأجزاء (إذا كانت محددة)
    if (delayBetweenChunks > 0 && i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
    }
  }

  return { success: successCount, failed: failedCount, results };
};

/**
 * تنفيذ bulk insert/update بشكل متقطع
 * مفيد للعمليات الكبيرة على SQLite
 */
export const bulkProcessWithChunks = async <T>(
  items: T[],
  bulkOperation: (chunk: T[]) => Promise<void>,
  options: {
    chunkSize?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<{ success: boolean; processedCount: number; error?: string }> => {
  const { chunkSize = 100, onProgress } = options;

  if (!items || items.length === 0) {
    return { success: true, processedCount: 0 };
  }

  const chunks = chunkArray(items, chunkSize);
  let processedCount = 0;

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      await bulkOperation(chunk);
      processedCount += chunk.length;

      if (onProgress) {
        onProgress(processedCount, items.length);
      }

      // السماح للمتصفح بالتنفس بين الأجزاء الكبيرة
      if (i < chunks.length - 1 && chunks.length > 3) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return { success: true, processedCount };
  } catch (error) {
    console.error('[bulkProcessWithChunks] Error:', error);
    return {
      success: false,
      processedCount,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * تحسين: تجميع عمليات PUT المتعددة في معاملة واحدة
 */
export const batchedPut = async <T extends { id: string }>(
  table: { put: (item: T) => Promise<any> },
  items: T[],
  chunkSize: number = 50
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  const chunks = chunkArray(items, chunkSize);

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(item => table.put(item))
    );

    success += results.filter(r => r.status === 'fulfilled').length;
    failed += results.filter(r => r.status === 'rejected').length;
  }

  return { success, failed };
};

export default {
  chunkArray,
  processInChunks,
  bulkProcessWithChunks,
  batchedPut
};
