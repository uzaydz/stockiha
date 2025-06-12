import { supabase } from '@/lib/supabase';

export interface SEOSettings {
  id?: string;
  site_title: string;
  site_description?: string;
  site_keywords?: string[];
  default_og_image?: string;
  google_analytics_id?: string;
  google_search_console_key?: string;
  facebook_pixel_id?: string;
  twitter_handle?: string;
  enable_sitemap: boolean;
  enable_robots_txt: boolean;
}

export interface SEOPageMeta {
  id?: string;
  page_path: string;
  title?: string;
  description?: string;
  keywords?: string[];
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  twitter_card?: string;
  canonical_url?: string;
  no_index: boolean;
  no_follow: boolean;
}

export interface SEORobotsRule {
  id?: string;
  user_agent: string;
  allow_paths?: string[];
  disallow_paths?: string[];
  crawl_delay?: number;
  is_active: boolean;
  priority: number;
}

export interface SEOSitemapEntry {
  id?: string;
  url: string;
  last_modified?: string;
  change_frequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  include_in_sitemap: boolean;
}

export interface SEOStructuredData {
  id?: string;
  page_path?: string;
  schema_type: string;
  schema_data: any;
  is_active: boolean;
}

export interface SEOPerformanceMetric {
  id?: string;
  page_url: string;
  metric_date: string;
  page_views: number;
  unique_visitors: number;
  bounce_rate?: number;
  avg_time_on_page?: string;
  organic_traffic: number;
  click_through_rate?: number;
  impressions: number;
  position?: number;
}

export interface SEOKeyword {
  id?: string;
  keyword: string;
  search_volume?: number;
  difficulty?: number;
  current_position?: number;
  target_page?: string;
  notes?: string;
}

export interface SEORedirect {
  id?: string;
  from_path: string;
  to_path: string;
  redirect_type: 301 | 302 | 307 | 308;
  is_active: boolean;
}

export interface SEOCrawlLog {
  id?: string;
  crawler_name?: string;
  ip_address?: string;
  user_agent?: string;
  requested_url?: string;
  status_code?: number;
  response_time_ms?: number;
  crawled_at?: string;
}

class SEOService {
  // SEO Settings
  async getSettings() {
    const { data, error } = await supabase
      .from('seo_settings')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateSettings(settings: SEOSettings) {
    const { data, error } = await supabase
      .from('seo_settings')
      .upsert(settings)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Page Meta
  async getPageMeta(pagePath?: string) {
    let query = supabase.from('seo_page_meta').select('*');
    
    if (pagePath) {
      query = query.eq('page_path', pagePath);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return pagePath ? data?.[0] : data;
  }

  async upsertPageMeta(meta: SEOPageMeta) {
    const { data, error } = await supabase
      .from('seo_page_meta')
      .upsert(meta, { onConflict: 'page_path' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deletePageMeta(id: string) {
    const { error } = await supabase
      .from('seo_page_meta')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Robots Rules
  async getRobotsRules() {
    const { data, error } = await supabase
      .from('seo_robots_rules')
      .select('*')
      .order('priority', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async upsertRobotsRule(rule: SEORobotsRule) {
    const { data, error } = await supabase
      .from('seo_robots_rules')
      .upsert(rule)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteRobotsRule(id: string) {
    const { error } = await supabase
      .from('seo_robots_rules')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Sitemap
  async getSitemapEntries() {
    const { data, error } = await supabase
      .from('seo_sitemap_entries')
      .select('*')
      .eq('include_in_sitemap', true)
      .order('url');
    
    if (error) throw error;
    return data;
  }

  async upsertSitemapEntry(entry: SEOSitemapEntry) {
    const { data, error } = await supabase
      .from('seo_sitemap_entries')
      .upsert(entry, { onConflict: 'url' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteSitemapEntry(id: string) {
    const { error } = await supabase
      .from('seo_sitemap_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Structured Data
  async getStructuredData(pagePath?: string) {
    let query = supabase
      .from('seo_structured_data')
      .select('*')
      .eq('is_active', true);
    
    if (pagePath) {
      query = query.eq('page_path', pagePath);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async upsertStructuredData(data: SEOStructuredData) {
    const { data: result, error } = await supabase
      .from('seo_structured_data')
      .upsert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  async deleteStructuredData(id: string) {
    const { error } = await supabase
      .from('seo_structured_data')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Performance Metrics
  async getPerformanceMetrics(pageUrl?: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('seo_performance_metrics')
      .select('*');
    
    if (pageUrl) {
      query = query.eq('page_url', pageUrl);
    }
    
    if (startDate) {
      query = query.gte('metric_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('metric_date', endDate);
    }
    
    const { data, error } = await query.order('metric_date', { ascending: false });
    if (error) throw error;
    return data;
  }

  async upsertPerformanceMetric(metric: SEOPerformanceMetric) {
    const { data, error } = await supabase
      .from('seo_performance_metrics')
      .upsert(metric, { onConflict: 'page_url,metric_date' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Keywords
  async getKeywords() {
    const { data, error } = await supabase
      .from('seo_keywords')
      .select('*')
      .order('search_volume', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async upsertKeyword(keyword: SEOKeyword) {
    const { data, error } = await supabase
      .from('seo_keywords')
      .upsert(keyword)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteKeyword(id: string) {
    const { error } = await supabase
      .from('seo_keywords')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Redirects
  async getRedirects() {
    const { data, error } = await supabase
      .from('seo_redirects')
      .select('*')
      .eq('is_active', true)
      .order('from_path');
    
    if (error) throw error;
    return data;
  }

  async upsertRedirect(redirect: SEORedirect) {
    const { data, error } = await supabase
      .from('seo_redirects')
      .upsert(redirect, { onConflict: 'from_path' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteRedirect(id: string) {
    const { error } = await supabase
      .from('seo_redirects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Crawl Log
  async getCrawlLog(limit = 100) {
    const { data, error } = await supabase
      .from('seo_crawl_log')
      .select('*')
      .order('crawled_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  // Helper functions
  async generateSitemap() {
    const entries = await this.getSitemapEntries();
    const settings = await this.getSettings();
    
    if (!settings?.enable_sitemap) {
      return null;
    }
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries?.map(entry => `  <url>
    <loc>${entry.url}</loc>
    ${entry.last_modified ? `<lastmod>${new Date(entry.last_modified).toISOString()}</lastmod>` : ''}
    ${entry.change_frequency ? `<changefreq>${entry.change_frequency}</changefreq>` : ''}
    ${entry.priority ? `<priority>${entry.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;
    
    return sitemap;
  }

  async generateRobotsTxt() {
    const rules = await this.getRobotsRules();
    const settings = await this.getSettings();
    
    if (!settings?.enable_robots_txt) {
      return null;
    }
    
    let robotsTxt = '';
    
    for (const rule of rules || []) {
      if (!rule.is_active) continue;
      
      robotsTxt += `User-agent: ${rule.user_agent}\n`;
      
      if (rule.disallow_paths?.length) {
        rule.disallow_paths.forEach(path => {
          robotsTxt += `Disallow: ${path}\n`;
        });
      }
      
      if (rule.allow_paths?.length) {
        rule.allow_paths.forEach(path => {
          robotsTxt += `Allow: ${path}\n`;
        });
      }
      
      if (rule.crawl_delay) {
        robotsTxt += `Crawl-delay: ${rule.crawl_delay}\n`;
      }
      
      robotsTxt += '\n';
    }
    
    // Add sitemap
    robotsTxt += `Sitemap: ${window.location.origin}/sitemap.xml\n`;
    
    return robotsTxt;
  }
}

export const seoService = new SEOService();
