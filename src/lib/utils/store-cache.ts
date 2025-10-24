interface CachedSeoMeta {
  title?: string;
  description?: string;
  keywords?: string;
  og_image?: string;
}

export interface CachedStoreInfo {
  name?: string;
  description?: string;
  logo_url?: string;
  favicon_url?: string;
  seo?: CachedSeoMeta;
}

const parseJSON = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[store-cache] Failed to parse cached value', error);
    }
    return null;
  }
};

const buildStoreInfo = (data: any): CachedStoreInfo | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const name = data.name || data.site_name || data.store_name;
  const description = data.description || data.seo_meta_description;
  const logo = data.logo_url || data.thumbnail_image;
  const favicon = data.favicon_url || data.logo_url;
  const seoSource = data.seo || data.meta || data.seo_settings || {};

  const seo: CachedSeoMeta = {
    title: seoSource.title || data.seo_store_title || name,
    description: seoSource.description || description,
    keywords: seoSource.keywords,
    og_image: seoSource.og_image || logo
  };

  return {
    name,
    description,
    logo_url: logo,
    favicon_url: favicon,
    seo
  };
};

export const getStoreFromCache = (subdomain: string): CachedStoreInfo | null => {
  if (!subdomain) return null;
  if (typeof window === 'undefined') return null;

  const storageCandidates: Array<{ storage: Storage; keys: string[] }> = [
    {
      storage: window.sessionStorage,
      keys: [`store_${subdomain}`, `instant_store_${subdomain}`]
    },
    {
      storage: window.localStorage,
      keys: [
        `store_quick_${subdomain}`,
        `early_preload_${subdomain}`,
        `store_${subdomain}`,
        `instant_store_${subdomain}`
      ]
    }
  ];

  for (const candidate of storageCandidates) {
    for (const key of candidate.keys) {
      const parsed = parseJSON(candidate.storage.getItem(key));
      if (parsed) {
        const info = buildStoreInfo(parsed.organization_details || parsed.organization || parsed);
        if (info) {
          return info;
        }
      }
    }
  }

  return null;
};
