// PostCSS config محسن للأداء
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          // تحسينات متقدمة للإنتاج
          reduceIdents: false, // منع كسر CSS variables
          mergeIdents: false,
          discardUnused: false, // اترك هذا لـ Tailwind
          autoprefixer: false, // تجنب التكرار مع autoprefixer
          // تحسينات آمنة
          normalizeWhitespace: true,
          colormin: true,
          convertValues: true,
          discardComments: { removeAll: true },
          discardDuplicates: true,
          discardEmpty: true,
          mergeLonghand: true,
          mergeRules: true,
          minifyFontValues: true,
          minifyGradients: true,
          minifyParams: true,
          minifySelectors: true,
          normalizeCharset: true,
          normalizeDisplayValues: true,
          normalizePositions: true,
          normalizeRepeatStyle: true,
          normalizeString: true,
          normalizeTimingFunctions: true,
          normalizeUnicode: true,
          normalizeUrl: true,
          orderedValues: true,
          reduceInitial: true,
          reduceTransforms: true,
          svgo: true,
          uniqueSelectors: true
        }]
      }
    })
  }
}