import { resolveAssetPath } from './assetPaths';

type FontConfig = {
  family: string;
  weight: string;
  style?: string;
  file: string;
};

const FONT_FILES: FontConfig[] = [
  { family: 'Tajawal', weight: '400', file: 'tajawal-regular.woff2' },
  { family: 'Tajawal', weight: '400', file: 'tajawal-latin-400.woff2' },
  { family: 'Tajawal', weight: '500', file: 'tajawal-medium.woff2' },
  { family: 'Tajawal', weight: '500', file: 'tajawal-latin-500.woff2' },
  { family: 'Tajawal', weight: '700', file: 'tajawal-bold.woff2' },
  { family: 'Tajawal', weight: '700', file: 'tajawal-latin-700.woff2' }
];

let fontsPromise: Promise<void> | null = null;

const loadFont = async (config: FontConfig): Promise<void> => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  if (!('fonts' in document) || typeof FontFace === 'undefined') {
    return;
  }

  const fontCheck = `${config.weight} 1em "${config.family}"`;
  if (document.fonts.check(fontCheck)) {
    return;
  }

  // استخدم مساراً يبدأ بـ "/" حتى لا ينكسر على المسارات العميقة مثل /dashboard/...
  // وحتى لو تغيّر سلوك resolveAssetPath، سيبقى المسار Root-relative صحيحاً في الويب.
  const resolvedUrl = resolveAssetPath(`/fonts/${config.file}`);
  const fontFace = new FontFace(
    config.family,
    `url(${resolvedUrl}) format('woff2')`,
    { weight: config.weight, style: config.style ?? 'normal' }
  );

  const loaded = await fontFace.load();
  document.fonts.add(loaded);
};

export const ensureCustomFontsLoaded = (): Promise<void> => {
  if (fontsPromise) {
    return fontsPromise;
  }

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (!('fonts' in document) || typeof FontFace === 'undefined') {
    return Promise.resolve();
  }

  fontsPromise = Promise.allSettled(FONT_FILES.map(loadFont)).then(() => undefined);
  return fontsPromise;
};
