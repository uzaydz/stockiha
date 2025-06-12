import { supabase } from '@/lib/supabase';
import { ShippingProvider } from './shippingService';
import { withCache, LONG_CACHE_TTL } from '@/lib/cache/storeCache';

export interface ShippingProviderSettings {
  id?: number;
  provider_id: number;
  organization_id: string;
  is_enabled: boolean;
  api_token?: string;
  api_key?: string;
  auto_shipping: boolean;
  track_updates: boolean;
  settings?: Record<string, any>;
}

export interface ShippingProviderInfo {
  id: number;
  code: string;
  name: string;
  is_active: boolean | null;
  base_url?: string | null;
}

/**
 * Service for managing shipping provider settings in the database
 */
export class ShippingSettingsService {
  private tableInitialized = false;

  constructor() {
    // Initialize the shipping tables when service is created
    this.initShippingTables();
  }

  /**
   * Initialize shipping tables if they don't exist
   */
  private async initShippingTables() {
    if (this.tableInitialized) return;

    try {
      // Check if shipping_providers table exists
      const { data: checkData, error: checkError } = await supabase
        .from('shipping_providers')
        .select('id')
        .limit(1);

      // If table doesn't exist, create tables and insert default providers
      if (checkError && checkError.code === '42P01') { // 42P01 is PostgreSQL's error code for "table does not exist"

        // Create shipping_providers table
        await supabase.rpc('create_shipping_tables');
        
        // Insert default providers
        await supabase.from('shipping_providers').insert([
          { code: 'yalidine', name: 'ياليدين', base_url: 'https://api.yalidine.app/v1/' },
          { code: 'zrexpress', name: 'ZR Express', base_url: 'https://api.zrexpress.dz/' },
          { code: 'mayesto', name: 'مايستو', base_url: 'https://api.mayesto.com/' },
          { code: 'ecotrack', name: 'إيكوتراك', base_url: 'https://api.ecotrack.dz/' }
        ]);
      }

      this.tableInitialized = true;
    } catch (error) {
    }
  }

  /**
   * Get all available shipping providers
   */
  async getProviders(): Promise<ShippingProviderInfo[]> {
    try {
      // لا يزال من المهم التأكد من تهيئة الجداول، لكن جلب البيانات سيتم عبر ذاكرة التخزين المؤقت
      await this.initShippingTables(); 

      // استخدام withCache لجلب وتخزين قائمة مزودي الشحن
      const providers = await withCache<ShippingProviderInfo[]>(
        'all_shipping_providers_info', // مفتاح فريد لذاكرة التخزين المؤقت لهذه الدالة
        async () => {
          const { data, error } = await supabase
            .from('shipping_providers')
            .select('id, code, name, is_active, base_url') // تحديد الأعمدة المطلوبة فقط
            .order('id');
          
          if (error) {
            // لا تقم بإعادة المحاولة هنا بشكل مباشر إذا كان initShippingTables قد فشل
            // يجب أن يتعامل initShippingTables مع فشله الخاص أو يُلقي خطأً يتم التقاطه بالخارج
            throw error; // إعادة إلقاء الخطأ ليتم التعامل معه بواسطة withCache أو المستدعي
          }
          return (data || []) as ShippingProviderInfo[];
        },
        LONG_CACHE_TTL // استخدام TTL طويل لهذه البيانات
      );
      
      return providers;
    } catch (error) {
      // معالجة الأخطاء التي قد تحدث من initShippingTables أو إذا فشل withCache بشكل غير متوقع
      return []; 
    }
  }

  /**
   * Get shipping provider settings for an organization
   */
  async getProviderSettings(
    organizationId: string,
    providerCode: ShippingProvider
  ): Promise<ShippingProviderSettings | null> {
    try {
      await this.initShippingTables();
      
      // First, get the provider ID by code
      const { data: providerData, error: providerError } = await supabase
        .from('shipping_providers')
        .select('id')
        .eq('code', providerCode)
        .single();
      
      if (providerError) {
        
        // If table doesn't exist, initialize it
        if (providerError.code === '42P01') {
          await this.initShippingTables();
          return this.getProviderSettings(organizationId, providerCode); // Retry
        }
        
        // For "not found" errors, create the provider record
        if (providerError.code === 'PGRST116') {
          await this.ensureProviderExists(providerCode);
          return this.getProviderSettings(organizationId, providerCode); // Retry
        }
        
        return null;
      }
      
      if (!providerData) {
        return null;
      }
      
      // Now get the settings for this provider and organization
      const { data, error } = await supabase
        .from('shipping_provider_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('provider_id', providerData.id)
        .single();
      
      if (error) {
        // Not found error is expected when settings don't exist yet
        if (error.code === 'PGRST116') {
          // Return null to indicate no settings exist yet
          return null;
        }
        
        // Handle table not found error
        if (error.code === '42P01') {
          await this.initShippingTables();
          return this.getProviderSettings(organizationId, providerCode); // Retry
        }
        throw error;
      }
      
      // Ensure settings is an object
      if (data && typeof data.settings === 'string') {
        try {
          data.settings = JSON.parse(data.settings);
        } catch (e) {
          // Handle malformed JSON, perhaps by returning default or null
          data.settings = {}; // Default to empty object on parse error
        }
      }
      return data as ShippingProviderSettings;
    } catch (error) {
      // Return default settings instead of throwing
      return {
        provider_id: 1, // Default provider ID (should be Yalidine)
        organization_id: organizationId,
        is_enabled: false,
        api_token: '',
        api_key: '',
        auto_shipping: false,
        track_updates: false,
        settings: {}
      };
    }
  }

  /**
   * Ensure a provider exists in the database
   */
  private async ensureProviderExists(
    providerCode: ShippingProvider
  ): Promise<number> {
    try {
      // Check if provider already exists
      const { data: existingProvider } = await supabase
        .from('shipping_providers')
        .select('id')
        .eq('code', providerCode)
        .single();
      
      if (existingProvider) {
        return existingProvider.id;
      }
      
      // Create provider based on code
      let name = String(providerCode);
      let baseUrl = '';
      
      switch (providerCode) {
        case ShippingProvider.YALIDINE:
          name = 'ياليدين';
          baseUrl = 'https://api.yalidine.app/v1/';
          break;
        case ShippingProvider.ZREXPRESS:
          name = 'ZR Express';
          baseUrl = 'https://api.zrexpress.dz/';
          break;
        case ShippingProvider.MAYESTO:
          name = 'مايستو';
          baseUrl = 'https://api.mayesto.com/';
          break;
        case ShippingProvider.ECOTRACK:
          name = 'إيكوتراك';
          baseUrl = 'https://api.ecotrack.dz/';
          break;
        case ShippingProvider.ANDERSON_DELIVERY:
          name = 'Anderson Delivery';
          baseUrl = 'https://anderson.ecotrack.dz/';
          break;
        case ShippingProvider.AREEX:
          name = 'أريكس';
          baseUrl = 'https://areex.ecotrack.dz/';
          break;
        case ShippingProvider.BA_CONSULT:
          name = 'BA Consult';
          baseUrl = 'https://baconsult.ecotrack.dz/';
          break;
        case ShippingProvider.CONEXLOG:
          name = 'كونكسلوغ';
          baseUrl = 'https://conexlog.ecotrack.dz/';
          break;
        case ShippingProvider.COYOTE_EXPRESS:
          name = 'Coyote Express';
          baseUrl = 'https://coyote.ecotrack.dz/';
          break;
        case ShippingProvider.DHD:
          name = 'DHD';
          baseUrl = 'https://dhd.ecotrack.dz/';
          break;
        case ShippingProvider.DISTAZERO:
          name = 'ديستازيرو';
          baseUrl = 'https://distazero.ecotrack.dz/';
          break;
        case ShippingProvider.E48HR_LIVRAISON:
          name = 'E48HR Livraison';
          baseUrl = 'https://e48hr.ecotrack.dz/';
          break;
        case ShippingProvider.FRETDIRECT:
          name = 'فريت دايركت';
          baseUrl = 'https://fretdirect.ecotrack.dz/';
          break;
        case ShippingProvider.GOLIVRI:
          name = 'غوليفري';
          baseUrl = 'https://golivri.ecotrack.dz/';
          break;
        case ShippingProvider.MONO_HUB:
          name = 'Mono Hub';
          baseUrl = 'https://monohub.ecotrack.dz/';
          break;
        case ShippingProvider.MSM_GO:
          name = 'MSM Go';
          baseUrl = 'https://msmgo.ecotrack.dz/';
          break;
        case ShippingProvider.IMIR_EXPRESS:
                      name = 'إمير إكسبرس';
            baseUrl = 'https://imir.ecotrack.dz/';
          break;
        case ShippingProvider.PACKERS:
          name = 'باكرز';
          baseUrl = 'https://packers.ecotrack.dz/';
          break;
        case ShippingProvider.PREST:
          name = 'بريست';
          baseUrl = 'https://prest.ecotrack.dz/';
          break;
        case ShippingProvider.RB_LIVRAISON:
          name = 'RB Livraison';
          baseUrl = 'https://rb.ecotrack.dz/';
          break;
        case ShippingProvider.REX_LIVRAISON:
          name = 'ريكس ليفريزون';
          baseUrl = 'https://rex.ecotrack.dz/';
          break;
        case ShippingProvider.ROCKET_DELIVERY:
          name = 'Rocket Delivery';
          baseUrl = 'https://rocket.ecotrack.dz/';
          break;
        case ShippingProvider.SALVA_DELIVERY:
          name = 'سالفا ديليفري';
          baseUrl = 'https://salva.ecotrack.dz/';
          break;
        case ShippingProvider.SPEED_DELIVERY:
          name = 'سبيد ديليفري';
          baseUrl = 'https://speed.ecotrack.dz/';
          break;
        case ShippingProvider.TSL_EXPRESS:
          name = 'TSL Express';
          baseUrl = 'https://tsl.ecotrack.dz/';
          break;
        case ShippingProvider.WORLDEXPRESS:
          name = 'ورلد إكسبرس';
          baseUrl = 'https://worldexpress.ecotrack.dz/';
          break;
      }
      
      const { data, error } = await supabase
        .from('shipping_providers')
        .insert({ code: providerCode, name, base_url: baseUrl })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save shipping provider settings for an organization
   */
  async saveProviderSettings(
    organizationId: string,
    providerCode: ShippingProvider,
    settings: Partial<ShippingProviderSettings>
  ): Promise<ShippingProviderSettings> {
    try {
      await this.initShippingTables();
      
      // First, get the provider ID by code, or create if it doesn't exist
      let providerId: number;
      
      try {
        const { data, error } = await supabase
          .from('shipping_providers')
          .select('id')
          .eq('code', providerCode)
          .single();
        
        if (error) {
          // If provider doesn't exist, create it
          if (error.code === 'PGRST116') {
            providerId = await this.ensureProviderExists(providerCode);
          } else {
            throw error;
          }
        } else {
          providerId = data.id;
        }
      } catch (error) {
        throw new Error(`Failed to get provider ID for ${providerCode}`);
      }
      
      if (!providerId) {
        throw new Error(`Provider ${providerCode} not found and could not be created`);
      }
      
      // Check if settings already exist
      const existingSettings = await this.getProviderSettings(organizationId, providerCode);
      
      if (existingSettings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('shipping_provider_settings')
          .update({
            is_enabled: settings.is_enabled !== undefined ? settings.is_enabled : existingSettings.is_enabled,
            api_token: settings.api_token || existingSettings.api_token,
            api_key: settings.api_key || existingSettings.api_key,
            auto_shipping: settings.auto_shipping !== undefined ? settings.auto_shipping : existingSettings.auto_shipping,
            track_updates: settings.track_updates !== undefined ? settings.track_updates : existingSettings.track_updates,
            settings: settings.settings || existingSettings.settings,
            updated_at: new Date().toISOString() // Convert Date to ISO string
          })
          .eq('id', existingSettings.id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        return data as ShippingProviderSettings;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('shipping_provider_settings')
          .insert({
            organization_id: organizationId,
            provider_id: providerId,
            is_enabled: settings.is_enabled || false,
            api_token: settings.api_token || null,
            api_key: settings.api_key || null,
            auto_shipping: settings.auto_shipping || false,
            track_updates: settings.track_updates || false,
            settings: settings.settings || {}
          })
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        return data as ShippingProviderSettings;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get provider code from provider ID
   */
  async getProviderCodeById(providerId: number): Promise<ShippingProvider | null> {
    try {
      const { data, error } = await supabase
        .from('shipping_providers')
        .select('code')
        .eq('id', providerId)
        .single();
      
      if (error) {
        return null;
      }
      
      return data.code as ShippingProvider;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get credentials for a shipping provider
   */
  async getProviderCredentials(
    organizationId: string,
    providerCode: ShippingProvider
  ): Promise<{ token?: string; key?: string; id?: string }> {
    try {
      const settings = await this.getProviderSettings(organizationId, providerCode);
      
      if (!settings || !settings.is_enabled) {
        return {};
      }
      
      return {
        token: settings.api_token,
        key: settings.api_key
      };
    } catch (error) {
      return {};
    }
  }
}

export const shippingSettingsService = new ShippingSettingsService();
