// سكريبت مقارنة بين Cloudflare Workers المختلفة

import fs from 'fs';

function analyzeWorker(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+/g) || []).length;
    const asyncFunctions = (content.match(/async\s+function/g) || []).length;
    const regexPatterns = (content.match(/\/[^\/]*\//g) || []).length;

    // تحليل التعقيد
    const complexityIndicators = {
      webviewDetection: content.includes('FBAN') || content.includes('WebView'),
      htmlRewriting: content.includes('HTMLRewriter') || content.includes('rewrite'),
      imageResizing: content.includes('image') && content.includes('resize'),
      apiProxy: content.includes('api-proxy') || content.includes('proxy'),
      linkHints: content.includes('Link') && content.includes('preload'),
      performancePatterns: content.includes('PERFORMANCE_PATTERNS'),
      cacheLogic: content.includes('cache') || content.includes('Cache'),
    };

    const complexityScore = Object.values(complexityIndicators).filter(Boolean).length;

    return {
      file: filePath,
      lines,
      functions,
      asyncFunctions,
      regexPatterns,
      complexityScore,
      features: complexityIndicators
    };
  } catch (error) {
    return { file: filePath, error: error.message };
  }
}

// مقارنة الـ workers
const workers = [
  'cloudflare-worker.js',
  'cloudflare-worker-simplified.js',
  'cloudflare-worker-ultra-simple.js'
];

console.log('📊 مقارنة Cloudflare Workers\n');
console.log('=' .repeat(60));

workers.forEach(file => {
  const analysis = analyzeWorker(file);

  if (analysis.error) {
    console.log(`❌ ${file}: ${analysis.error}`);
    return;
  }

  console.log(`📁 ${file}:`);
  console.log(`   📏 الأسطر: ${analysis.lines}`);
  console.log(`   🔧 الدوال: ${analysis.functions} (${analysis.asyncFunctions} async)`);
  console.log(`   🎯 نمط Regex: ${analysis.regexPatterns}`);
  console.log(`   ⚡ نقاط التعقيد: ${analysis.complexityScore}/7`);

  const features = Object.entries(analysis.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);

  console.log(`   ✨ الميزات: ${features.length > 0 ? features.join(', ') : 'مبسط'}`);
  console.log('');
});

console.log('🎯 التوصية: استخدم cloudflare-worker-ultra-simple.js لأفضل أداء');
