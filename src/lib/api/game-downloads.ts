import { supabase } from '@/lib/supabase';

export interface GameCategory {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  platform: string;
  size_gb?: number;
  requirements?: Record<string, any>;
  images?: string[];
  price: number;
  is_featured: boolean;
  is_active: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  category?: GameCategory;
}

export interface GameOrder {
  id: string;
  organization_id: string;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  game_id: string;
  device_type?: string;
  device_specs?: string;
  notes?: string;
  status: string;
  status_history: any[];
  assigned_to?: string;
  processing_started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  price: number;
  payment_status: string;
  payment_method?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  game?: Game;
  assigned_user?: { name: string };
}

export interface GameDownloadsSettings {
  id: string;
  organization_id: string;
  business_name?: string;
  business_logo?: string;
  welcome_message?: string;
  terms_conditions?: string;
  contact_info?: Record<string, any>;
  social_links?: Record<string, any>;
  order_prefix?: string;
  auto_assign_orders?: boolean;
  notification_settings?: Record<string, any>;
  working_hours?: Record<string, any>;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// Categories API
export const gameDownloadsAPI = {
  // Categories
  async getCategories(organizationId: string): Promise<GameCategory[]> {
    const { data, error } = await supabase
      .from('game_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createCategory(category: Omit<GameCategory, 'id' | 'created_at' | 'updated_at'>): Promise<GameCategory> {
    const { data, error } = await supabase
      .from('game_categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<GameCategory>): Promise<GameCategory> {
    const { data, error } = await supabase
      .from('game_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('game_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Games
  async getGames(organizationId: string, options?: {
    categoryId?: string;
    platform?: string;
    isActive?: boolean;
  }): Promise<Game[]> {
    let query = supabase
      .from('games_catalog')
      .select('*, category:game_categories(*)')
      .eq('organization_id', organizationId);

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    query = query.order('is_featured', { ascending: false })
                 .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getGame(id: string): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games_catalog')
      .select('*, category:game_categories(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async createGame(game: Omit<Game, 'id' | 'created_at' | 'updated_at' | 'download_count' | 'category'>): Promise<Game> {
    const { data, error } = await supabase
      .from('games_catalog')
      .insert([{ ...game, download_count: 0 }])
      .select('*, category:game_categories(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    const { data, error } = await supabase
      .from('games_catalog')
      .update(updates)
      .eq('id', id)
      .select('*, category:game_categories(*)')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteGame(id: string): Promise<void> {
    const { error } = await supabase
      .from('games_catalog')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Orders
  async getOrders(organizationId: string, options?: {
    status?: string;
    assignedTo?: string;
  }): Promise<GameOrder[]> {
    let query = supabase
      .from('game_download_orders')
      .select(`
        *,
        game:games_catalog(name, platform),
        assigned_user:users!assigned_to(name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.assignedTo) {
      query = query.eq('assigned_to', options.assignedTo);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getOrder(id: string): Promise<GameOrder | null> {
    const { data, error } = await supabase
      .from('game_download_orders')
      .select(`
        *,
        game:games_catalog(name, platform),
        assigned_user:users!assigned_to(name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async getOrderByTracking(trackingNumber: string, organizationId?: string): Promise<GameOrder | null> {
    let query = supabase
      .from('game_download_orders')
      .select(`
        *,
        game:games_catalog(name, platform),
        assigned_user:users!assigned_to(name)
      `)
      .eq('tracking_number', trackingNumber);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async createOrder(order: Omit<GameOrder, 'id' | 'tracking_number' | 'status' | 'status_history' | 'created_at' | 'updated_at' | 'game' | 'assigned_user'>): Promise<GameOrder> {
    const { data, error } = await supabase
      .from('game_download_orders')
      .insert([{
        ...order,
        status: 'pending',
        status_history: [],
        payment_status: order.payment_status || 'unpaid',
        amount_paid: order.amount_paid || 0,
      }])
      .select(`
        *,
        game:games_catalog(name, platform),
        assigned_user:users!assigned_to(name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId: string, newStatus: string, userId: string, notes?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('update_game_order_status', {
      order_id: orderId,
      new_status: newStatus,
      user_id: userId,
      notes: notes || null,
    });

    if (error) throw error;
    return data;
  },

  // Settings
  async getSettings(organizationId: string): Promise<GameDownloadsSettings | null> {
    const { data, error } = await supabase
      .from('game_downloads_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async updateSettings(organizationId: string, settings: Partial<GameDownloadsSettings>): Promise<GameDownloadsSettings> {
    const { data, error } = await supabase
      .from('game_downloads_settings')
      .upsert({
        ...settings,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Public API (for customers)
  async getPublicGames(organizationId: string): Promise<Game[]> {
    const { data, error } = await supabase
      .from('games_catalog')
      .select('*, category:game_categories(*)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPublicCategories(organizationId: string): Promise<GameCategory[]> {
    const { data, error } = await supabase
      .from('game_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getPublicSettings(organizationId: string): Promise<GameDownloadsSettings | null> {
    const { data, error } = await supabase
      .from('game_downloads_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Update download count
  async updateDownloadCount(gameId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('update-game-download-count', {
      body: { gameId },
    });

    if (error) throw error;
  },

  // Statistics
  async getStats(organizationId: string, period?: 'today' | 'week' | 'month' | '3months'): Promise<any> {
    let startDate: Date;
    const endDate = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3months':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }

    const { data: orders, error } = await supabase
      .from('game_download_orders')
      .select('*, game:games_catalog(name, platform)')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Process stats here
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
    const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
    const completedOrders = orders?.filter(order => order.status === 'delivered').length || 0;
    const cancelledOrders = orders?.filter(order => order.status === 'cancelled').length || 0;

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  },
};

export default gameDownloadsAPI;