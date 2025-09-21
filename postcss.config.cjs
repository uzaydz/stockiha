// PostCSS configuration with production minification
// PurgeCSS is left optional to avoid breaking dynamic class names. Enable via PURGE_CSS=1 if needed.

const isProd = process.env.NODE_ENV === 'production';
const enablePurge = process.env.PURGE_CSS === '1' || process.env.PURGE_CSS === 'true';

/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: [
    require('autoprefixer')(),
    // Optional: very conservative PurgeCSS, opt-in via env
    enablePurge && require('@fullhuman/postcss-purgecss')({
      content: [
        './index.html',
        './store.html',
        './src/**/*.{ts,tsx,js,jsx,html}',
      ],
      defaultExtractor: (content) => content.match(/[A-Za-z0-9-_:/.%\[\]"'=]+/g) || [],
      safelist: {
        standard: [
          // Keep Tailwind-like dynamic patterns and common utilities
          /^(dark|light)$/, /^(rtl|ltr)$/,
          /^(bg|text|border|ring|from|via|to|shadow|rounded|p|m|w|h|flex|grid|col|row|gap|justify|items|content|overflow|hidden|block|inline|absolute|relative|fixed|sticky|z-).*/,
          /^(hover:|group-hover:|focus:|active:|disabled:|data-\[.*\]:).*/,
          /lucide|icon|svg|kbd|btn|card|badge|navbar|sidebar|toast|dialog|popover|tooltip/,
          // App-specific tokens
          /tajawal|arabic|font|theme|primary|secondary|muted|foreground|background/,
        ],
        greedy: [/data-/, /aria-/],
      },
    }),
    isProd && require('cssnano')({ preset: 'default' }),
  ].filter(Boolean),
};


