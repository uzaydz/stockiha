import { supabase } from '@/lib/supabase';
import { seoService } from './seoService';

export interface PageAnalysis {
  url: string;
  pageType: 'homepage' | 'category' | 'product' | 'content' | 'static' | 'service' | 'landing';
  priority: number;
  changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  lastModified?: string;
  title?: string;
  description?: string;
  importance: number; // 1-10 scale
  isPublic: boolean;
  hasContent: boolean;
}

export interface SitemapGenerationOptions {
  includeProducts: boolean;
  includeCategories: boolean;
  includeLandingPages: boolean;
  includeCustomPages: boolean;
  includeServices: boolean;
  baseUrl: string;
  maxUrls: number;
  minPriority: number;
}

class SitemapAnalysisService {
  private baseUrl = '';

  async analyzeSiteStructure(baseUrl: string): Promise<PageAnalysis[]> {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    const pages: PageAnalysis[] = [];

    try {
      // 1. Add homepage
      pages.push({
        url: this.baseUrl,
        pageType: 'homepage',
        priority: 1.0,
        changeFreq: 'daily',
        lastModified: new Date().toISOString(),
        title: 'الصفحة الرئيسية',
        importance: 10,
        isPublic: true,
        hasContent: true
      });

      // 2. Analyze static pages
      const staticPages = await this.getStaticPages();
      pages.push(...staticPages);

      // 3. Analyze dynamic content from database
      const dynamicPages = await this.getDynamicPages();
      pages.push(...dynamicPages);

      // 4. Analyze custom pages
      const customPages = await this.getCustomPages();
      pages.push(...customPages);

      // 5. Analyze landing pages
      const landingPages = await this.getLandingPages();
      pages.push(...landingPages);

      // 6. Sort by importance and filter
      return pages
        .filter(page => page.isPublic && page.hasContent)
        .sort((a, b) => b.importance - a.importance);

    } catch (error) {
      return pages;
    }
  }

  private async getStaticPages(): Promise<PageAnalysis[]> {
    const staticPages = [
      { path: '/about', title: 'من نحن', importance: 8, changeFreq: 'monthly' as const },
      { path: '/contact', title: 'اتصل بنا', importance: 7, changeFreq: 'monthly' as const },
      { path: '/privacy', title: 'سياسة الخصوصية', importance: 5, changeFreq: 'yearly' as const },
      { path: '/terms', title: 'شروط الاستخدام', importance: 5, changeFreq: 'yearly' as const },
      { path: '/pricing', title: 'الأسعار', importance: 9, changeFreq: 'weekly' as const },
      { path: '/features', title: 'الميزات', importance: 8, changeFreq: 'monthly' as const },
      { path: '/store', title: 'المتجر', importance: 9, changeFreq: 'daily' as const },
    ];

    return staticPages.map(page => ({
      url: `${this.baseUrl}${page.path}`,
      pageType: 'static' as const,
      priority: this.calculatePriority(page.importance),
      changeFreq: page.changeFreq,
      lastModified: new Date().toISOString(),
      title: page.title,
      importance: page.importance,
      isPublic: true,
      hasContent: true
    }));
  }

  private async getDynamicPages(): Promise<PageAnalysis[]> {
    const pages: PageAnalysis[] = [];

    try {
      // Products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, slug, updated_at, is_active')
        .eq('is_active', true)
        .limit(500);

      if (products) {
        pages.push(...products.map(product => ({
          url: `${this.baseUrl}/product/${product.slug || product.id}`,
          pageType: 'product' as const,
          priority: this.calculatePriority(7),
          changeFreq: 'weekly' as const,
          lastModified: product.updated_at || new Date().toISOString(),
          title: product.name,
          importance: 7,
          isPublic: true,
          hasContent: true
        })));
      }

      // Product Categories
      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name, slug, updated_at')
        .limit(100);

      if (categories) {
        pages.push(...categories.map(category => ({
          url: `${this.baseUrl}/category/${category.slug || category.id}`,
          pageType: 'category' as const,
          priority: this.calculatePriority(8),
          changeFreq: 'weekly' as const,
          lastModified: category.updated_at || new Date().toISOString(),
          title: category.name,
          importance: 8,
          isPublic: true,
          hasContent: true
        })));
      }

      // Services
      const { data: services } = await supabase
        .from('services')
        .select('id, name, slug, updated_at, is_active')
        .eq('is_active', true)
        .limit(100);

      if (services) {
        pages.push(...services.map(service => ({
          url: `${this.baseUrl}/service/${service.slug || service.id}`,
          pageType: 'service' as const,
          priority: this.calculatePriority(7),
          changeFreq: 'monthly' as const,
          lastModified: service.updated_at || new Date().toISOString(),
          title: service.name,
          importance: 7,
          isPublic: true,
          hasContent: true
        })));
      }

    } catch (error) {
    }

    return pages;
  }

  private async getCustomPages(): Promise<PageAnalysis[]> {
    try {
      const { data: customPages } = await supabase
        .from('custom_pages')
        .select('id, title, slug, updated_at, is_published')
        .eq('is_published', true)
        .limit(100);

      if (!customPages) return [];

      return customPages.map(page => ({
        url: `${this.baseUrl}/page/${page.slug || page.id}`,
        pageType: 'content' as const,
        priority: this.calculatePriority(6),
        changeFreq: 'monthly' as const,
        lastModified: page.updated_at || new Date().toISOString(),
        title: page.title,
        importance: 6,
        isPublic: true,
        hasContent: true
      }));
    } catch (error) {
      return [];
    }
  }

  private async getLandingPages(): Promise<PageAnalysis[]> {
    try {
      const { data: landingPages } = await supabase
        .from('landing_pages')
        .select('id, title, slug, updated_at, is_published')
        .eq('is_published', true)
        .limit(50);

      if (!landingPages) return [];

      return landingPages.map(page => ({
        url: `${this.baseUrl}/landing/${page.slug || page.id}`,
        pageType: 'landing' as const,
        priority: this.calculatePriority(8),
        changeFreq: 'weekly' as const,
        lastModified: page.updated_at || new Date().toISOString(),
        title: page.title,
        importance: 8,
        isPublic: true,
        hasContent: true
      }));
    } catch (error) {
      return [];
    }
  }

  private calculatePriority(importance: number): number {
    // Convert importance (1-10) to priority (0.0-1.0)
    return Math.min(Math.max(importance / 10, 0.1), 1.0);
  }

  async generateSitemapFromAnalysis(
    analysis: PageAnalysis[],
    options: Partial<SitemapGenerationOptions> = {}
  ): Promise<void> {
    const defaultOptions: SitemapGenerationOptions = {
      includeProducts: true,
      includeCategories: true,
      includeLandingPages: true,
      includeCustomPages: true,
      includeServices: true,
      baseUrl: this.baseUrl,
      maxUrls: 1000,
      minPriority: 0.3
    };

    const config = { ...defaultOptions, ...options };

    // Filter based on options
    const filteredPages = analysis.filter(page => {
      if (page.priority < config.minPriority) return false;

      switch (page.pageType) {
        case 'product':
          return config.includeProducts;
        case 'category':
          return config.includeCategories;
        case 'landing':
          return config.includeLandingPages;
        case 'content':
          return config.includeCustomPages;
        case 'service':
          return config.includeServices;
        default:
          return true;
      }
    }).slice(0, config.maxUrls);

    // Clear existing sitemap entries
    await supabase.from('seo_sitemap_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new entries
    const sitemapEntries = filteredPages.map(page => ({
      url: page.url,
      last_modified: page.lastModified || new Date().toISOString(),
      change_frequency: page.changeFreq,
      priority: page.priority,
      include_in_sitemap: true
    }));

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < sitemapEntries.length; i += batchSize) {
      const batch = sitemapEntries.slice(i, i + batchSize);
      await supabase.from('seo_sitemap_entries').insert(batch);
    }
  }

  async getContentStatistics(): Promise<{
    totalPages: number;
    pageTypes: Record<string, number>;
    priorityDistribution: Record<string, number>;
    lastAnalysis: string;
  }> {
    try {
      const { data: entries } = await supabase
        .from('seo_sitemap_entries')
        .select('url, priority, created_at');

      if (!entries) {
        return {
          totalPages: 0,
          pageTypes: {},
          priorityDistribution: {},
          lastAnalysis: new Date().toISOString()
        };
      }

      const pageTypes: Record<string, number> = {};
      const priorityDistribution: Record<string, number> = {
        'عالية (0.8-1.0)': 0,
        'متوسطة (0.5-0.7)': 0,
        'منخفضة (0.1-0.4)': 0
      };

      entries.forEach(entry => {
        // Analyze page type from URL
        let type = 'أخرى';
        if (entry.url.includes('/product/')) type = 'منتجات';
        else if (entry.url.includes('/category/')) type = 'فئات';
        else if (entry.url.includes('/service/')) type = 'خدمات';
        else if (entry.url.includes('/landing/')) type = 'صفحات الهبوط';
        else if (entry.url.includes('/page/')) type = 'صفحات مخصصة';
        else if (entry.url === this.baseUrl) type = 'الرئيسية';
        else type = 'صفحات ثابتة';

        pageTypes[type] = (pageTypes[type] || 0) + 1;

        // Priority distribution
        if (entry.priority >= 0.8) priorityDistribution['عالية (0.8-1.0)']++;
        else if (entry.priority >= 0.5) priorityDistribution['متوسطة (0.5-0.7)']++;
        else priorityDistribution['منخفضة (0.1-0.4)']++;
      });

      return {
        totalPages: entries.length,
        pageTypes,
        priorityDistribution,
        lastAnalysis: entries[0]?.created_at || new Date().toISOString()
      };
    } catch (error) {
      return {
        totalPages: 0,
        pageTypes: {},
        priorityDistribution: {},
        lastAnalysis: new Date().toISOString()
      };
    }
  }

  async updateSitemapEntry(url: string, updates: Partial<{
    priority: number;
    changeFreq: string;
    include: boolean;
  }>): Promise<void> {
    const updateData: any = {};
    
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.changeFreq !== undefined) updateData.change_frequency = updates.changeFreq;
    if (updates.include !== undefined) updateData.include_in_sitemap = updates.include;
    
    updateData.last_modified = new Date().toISOString();

    await supabase
      .from('seo_sitemap_entries')
      .update(updateData)
      .eq('url', url);
  }

  async validateUrls(urls: string[]): Promise<{
    valid: string[];
    invalid: string[];
    errors: Record<string, string>;
  }> {
    const valid: string[] = [];
    const invalid: string[] = [];
    const errors: Record<string, string> = {};

    for (const url of urls) {
      try {
        new URL(url); // Basic URL validation
        
        // Additional validation could be added here
        // like checking if the URL responds with 200
        
        valid.push(url);
      } catch (error) {
        invalid.push(url);
        errors[url] = 'URL غير صالح';
      }
    }

    return { valid, invalid, errors };
  }
}

export const sitemapAnalysisService = new SitemapAnalysisService();
