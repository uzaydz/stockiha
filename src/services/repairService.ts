/**
 * repairService - خدمة موحدة لإدارة الإصلاحات
 *
 * ⚡ نمط Online-First مع Offline Fallback تلقائي
 *
 * - يحاول الاتصال بالسيرفر أولاً
 * - عند الفشل: ينتقل تلقائياً للبيانات المحلية
 * - يعمل بسلاسة أونلاين وأوفلاين
 * - يدعم Delta Sync الجديد
 * - مزامنة تلقائية عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import type { RepairOrder, RepairLocation, RepairImage, RepairHistory } from '@/types/repair';
import {
  createLocalRepairOrder,
  updateLocalRepairOrder,
  listLocalRepairOrders,
  getLocalRepairOrder,
  deleteLocalRepairOrder,
  updateRepairStatus,
  addRepairStatusHistory,
  addRepairImage,
  listRepairImages,
  deleteRepairImage,
  type RepairOrderCreateInput,
  type LocalRepairOrder,
  type LocalRepairImage,
  type LocalRepairStatusHistory,
  type LocalRepairLocation,
} from '@/api/localRepairService';
import { localRepairLocationsService } from '@/api/localRepairLocationsService';

// Re-export types
export type { RepairOrder, RepairLocation, RepairImage, RepairHistory, RepairOrderCreateInput };

/**
 * نتيجة عملية الحفظ
 */
export interface SaveRepairResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
  offline?: boolean;
}

/**
 * خدمة إدارة الإصلاحات - الموحدة
 */
export const repairService = {
  // =====================
  // Repair Orders
  // =====================

  /**
   * جلب جميع طلبات الإصلاح
   * ⚡ يدعم الأوفلاين: يجلب من SQLite إذا فشل الاتصال
   */
  async getAllOrders(organizationId: string): Promise<RepairOrder[]> {
    try {
      console.log('[repairService] 🔄 جلب طلبات الإصلاح من السيرفر...');

      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          repair_location:repair_locations(id, name, description),
          images:repair_images(*),
          history:repair_status_history(*, users(name))
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في جلب الطلبات من السيرفر:', error);

        // Fallback: الجلب من SQLite
        console.log('[repairService] 📱 استخدام البيانات المحلية (Offline Mode)');
        const localOrders = await listLocalRepairOrders(organizationId);
        return localOrders as unknown as RepairOrder[];
      }

      return data as RepairOrder[];
    } catch (error) {
      console.error('[repairService] ❌ خطأ في getAllOrders:', error);

      // Last fallback: محاولة الجلب محلياً
      try {
        console.log('[repairService] 🔄 محاولة أخيرة: الجلب من SQLite');
        const localOrders = await listLocalRepairOrders(organizationId);
        if (localOrders.length > 0) {
          console.log(`[repairService] ✅ تم جلب ${localOrders.length} طلب من SQLite`);
          return localOrders as unknown as RepairOrder[];
        }
      } catch (localError) {
        console.error('[repairService] ❌ فشل الجلب من SQLite:', localError);
      }

      throw error;
    }
  },

  /**
   * جلب طلب إصلاح محدد
   * ⚡ يدعم الأوفلاين
   */
  async getOrderById(id: string, organizationId?: string): Promise<RepairOrder | null> {
    try {
      console.log('[repairService] 🔍 جلب طلب:', id);

      const { data, error } = await supabase
        .from('repair_orders')
        .select(`
          *,
          repair_location:repair_locations(id, name, description),
          images:repair_images(*),
          history:repair_status_history(*, users(name))
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في جلب الطلب من السيرفر:', error);

        // Fallback: الجلب محلياً
        if (organizationId) {
          console.log('[repairService] 📱 جلب محلي (Offline Mode)');
          const localOrder = await getLocalRepairOrder(id);
          return localOrder as unknown as RepairOrder;
        }

        throw error;
      }

      return data as RepairOrder;
    } catch (error) {
      console.error('[repairService] ❌ خطأ في getOrderById:', error);

      // Last fallback
      if (organizationId) {
        try {
          const localOrder = await getLocalRepairOrder(id);
          if (localOrder) {
            console.log('[repairService] ✅ تم جلب الطلب من SQLite');
            return localOrder as unknown as RepairOrder;
          }
        } catch (localError) {
          console.error('[repairService] ❌ فشل الجلب من SQLite:', localError);
        }
      }

      return null;
    }
  },

  /**
   * إنشاء طلب إصلاح جديد
   * ⚡ يدعم الأوفلاين: يحفظ محلياً ويضيف للـ Outbox
   */
  async createOrder(input: RepairOrderCreateInput, organizationId: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 💾 إنشاء طلب إصلاح جديد...');

      // محاولة الإنشاء على السيرفر أولاً
      const { data, error } = await supabase
        .from('repair_orders')
        .insert({
          ...input,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في إنشاء الطلب على السيرفر:', error);

        // Fallback: الحفظ محلياً
        console.log('[repairService] 📱 حفظ محلي (Offline Mode)');
        const localOrder = await createLocalRepairOrder(input);

        return {
          success: true,
          id: localOrder.id,
          message: 'تم الحفظ محلياً - سيتم المزامنة لاحقاً',
          offline: true,
        };
      }

      return {
        success: true,
        id: data.id,
        message: 'تم إنشاء الطلب بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في createOrder:', error);

      // Last fallback: محاولة الحفظ محلياً
      try {
        console.log('[repairService] 🔄 محاولة أخيرة: الحفظ محلياً');
        const localOrder = await createLocalRepairOrder(input);

        return {
          success: true,
          id: localOrder.id,
          message: 'تم الحفظ محلياً - سيتم المزامنة عند عودة الاتصال',
          offline: true,
        };
      } catch (localError) {
        console.error('[repairService] ❌ فشل الحفظ المحلي:', localError);
        return {
          success: false,
          error: localError instanceof Error ? localError.message : 'فشل إنشاء الطلب',
        };
      }
    }
  },

  /**
   * تحديث طلب إصلاح
   * ⚡ يدعم الأوفلاين: يحدّث محلياً ويضيف للـ Outbox
   */
  async updateOrder(id: string, updates: Partial<RepairOrderCreateInput>, organizationId: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 🔄 تحديث طلب:', id);

      // محاولة التحديث على السيرفر
      const { data, error } = await supabase
        .from('repair_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في تحديث الطلب على السيرفر:', error);

        // Fallback: التحديث محلياً
        console.log('[repairService] 📱 تحديث محلي (Offline Mode)');
        const localOrder = await updateLocalRepairOrder(id, updates);

        if (localOrder) {
          return {
            success: true,
            id: localOrder.id,
            message: 'تم التحديث محلياً - سيتم المزامنة لاحقاً',
            offline: true,
          };
        }

        return {
          success: false,
          error: 'فشل التحديث المحلي',
        };
      }

      return {
        success: true,
        id: data.id,
        message: 'تم التحديث بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في updateOrder:', error);

      // Last fallback
      try {
        console.log('[repairService] 🔄 محاولة أخيرة: التحديث محلياً');
        const localOrder = await updateLocalRepairOrder(id, updates);

        if (localOrder) {
          return {
            success: true,
            id: localOrder.id,
            message: 'تم التحديث محلياً - سيتم المزامنة عند عودة الاتصال',
            offline: true,
          };
        }
      } catch (localError) {
        console.error('[repairService] ❌ فشل التحديث المحلي:', localError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل التحديث',
      };
    }
  },

  /**
   * حذف طلب إصلاح
   * ⚡ يدعم الأوفلاين: يحذف محلياً ويضيف للـ Outbox
   */
  async deleteOrder(id: string, organizationId: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 🗑️ حذف طلب:', id);

      // محاولة الحذف من السيرفر
      const { error } = await supabase
        .from('repair_orders')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في حذف الطلب من السيرفر:', error);

        // Fallback: الحذف محلياً
        console.log('[repairService] 📱 حذف محلي (Offline Mode)');
        await deleteLocalRepairOrder(id);

        return {
          success: true,
          message: 'تم الحذف محلياً - سيتم المزامنة لاحقاً',
          offline: true,
        };
      }

      return {
        success: true,
        message: 'تم الحذف بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في deleteOrder:', error);

      // Last fallback
      try {
        console.log('[repairService] 🔄 محاولة أخيرة: الحذف محلياً');
        await deleteLocalRepairOrder(id);

        return {
          success: true,
          message: 'تم الحذف محلياً - سيتم المزامنة عند عودة الاتصال',
          offline: true,
        };
      } catch (localError) {
        console.error('[repairService] ❌ فشل الحذف المحلي:', localError);
        return {
          success: false,
          error: localError instanceof Error ? localError.message : 'فشل الحذف',
        };
      }
    }
  },

  /**
   * تحديث حالة طلب الإصلاح
   * ⚡ يدعم الأوفلاين
   */
  async updateStatus(id: string, status: string, notes?: string, organizationId?: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 🔄 تحديث حالة الطلب:', id, status);

      // محاولة التحديث على السيرفر
      const { error } = await supabase
        .from('repair_orders')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في تحديث الحالة على السيرفر:', error);

        // Fallback: التحديث محلياً
        if (organizationId) {
          console.log('[repairService] 📱 تحديث محلي (Offline Mode)');
          await updateRepairStatus(id, status, notes);

          return {
            success: true,
            message: 'تم التحديث محلياً - سيتم المزامنة لاحقاً',
            offline: true,
          };
        }

        throw error;
      }

      return {
        success: true,
        message: 'تم تحديث الحالة بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في updateStatus:', error);

      // Last fallback
      if (organizationId) {
        try {
          await updateRepairStatus(id, status, notes);

          return {
            success: true,
            message: 'تم التحديث محلياً - سيتم المزامنة عند عودة الاتصال',
            offline: true,
          };
        } catch (localError) {
          console.error('[repairService] ❌ فشل التحديث المحلي:', localError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل تحديث الحالة',
      };
    }
  },

  // =====================
  // Repair Locations
  // =====================

  /**
   * جلب جميع مواقع الإصلاح
   * ⚡ يدعم الأوفلاين
   */
  async getAllLocations(organizationId: string): Promise<RepairLocation[]> {
    try {
      console.log('[repairService] 🔄 جلب مواقع الإصلاح من السيرفر...');

      const { data, error } = await supabase
        .from('repair_locations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في جلب المواقع من السيرفر:', error);

        // Fallback: الجلب محلياً
        console.log('[repairService] 📱 استخدام البيانات المحلية (Offline Mode)');
        const localLocations = await localRepairLocationsService.getAll(organizationId);
        return localLocations as unknown as RepairLocation[];
      }

      return data as RepairLocation[];
    } catch (error) {
      console.error('[repairService] ❌ خطأ في getAllLocations:', error);

      // Last fallback
      try {
        console.log('[repairService] 🔄 محاولة أخيرة: الجلب من SQLite');
        const localLocations = await localRepairLocationsService.getAll(organizationId);
        if (localLocations.length > 0) {
          console.log(`[repairService] ✅ تم جلب ${localLocations.length} موقع من SQLite`);
          return localLocations as unknown as RepairLocation[];
        }
      } catch (localError) {
        console.error('[repairService] ❌ فشل الجلب من SQLite:', localError);
      }

      return [];
    }
  },

  /**
   * إنشاء موقع إصلاح جديد
   * ⚡ يدعم الأوفلاين
   */
  async createLocation(location: Omit<RepairLocation, 'id'>, organizationId: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 💾 إنشاء موقع إصلاح جديد...');

      const { data, error } = await supabase
        .from('repair_locations')
        .insert({
          ...location,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في إنشاء الموقع على السيرفر:', error);

        // Fallback: الحفظ محلياً
        console.log('[repairService] 📱 حفظ محلي (Offline Mode)');
        const localLocation = await localRepairLocationsService.create(location, organizationId);

        return {
          success: true,
          id: localLocation.id,
          message: 'تم الحفظ محلياً - سيتم المزامنة لاحقاً',
          offline: true,
        };
      }

      return {
        success: true,
        id: data.id,
        message: 'تم إنشاء الموقع بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في createLocation:', error);

      // Last fallback
      try {
        const localLocation = await localRepairLocationsService.create(location, organizationId);

        return {
          success: true,
          id: localLocation.id,
          message: 'تم الحفظ محلياً - سيتم المزامنة عند عودة الاتصال',
          offline: true,
        };
      } catch (localError) {
        console.error('[repairService] ❌ فشل الحفظ المحلي:', localError);
        return {
          success: false,
          error: localError instanceof Error ? localError.message : 'فشل إنشاء الموقع',
        };
      }
    }
  },

  /**
   * تحديث موقع إصلاح
   * ⚡ يدعم الأوفلاين
   */
  async updateLocation(id: string, updates: Partial<RepairLocation>, organizationId: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 🔄 تحديث موقع:', id);

      const { error } = await supabase
        .from('repair_locations')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في تحديث الموقع على السيرفر:', error);

        // Fallback: التحديث محلياً
        console.log('[repairService] 📱 تحديث محلي (Offline Mode)');
        await localRepairLocationsService.update(id, updates, organizationId);

        return {
          success: true,
          message: 'تم التحديث محلياً - سيتم المزامنة لاحقاً',
          offline: true,
        };
      }

      return {
        success: true,
        message: 'تم التحديث بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في updateLocation:', error);

      // Last fallback
      try {
        await localRepairLocationsService.update(id, updates, organizationId);

        return {
          success: true,
          message: 'تم التحديث محلياً - سيتم المزامنة عند عودة الاتصال',
          offline: true,
        };
      } catch (localError) {
        console.error('[repairService] ❌ فشل التحديث المحلي:', localError);
        return {
          success: false,
          error: localError instanceof Error ? localError.message : 'فشل التحديث',
        };
      }
    }
  },

  /**
   * حذف موقع إصلاح
   * ⚡ يدعم الأوفلاين
   */
  async deleteLocation(id: string, organizationId: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 🗑️ حذف موقع:', id);

      const { error } = await supabase
        .from('repair_locations')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في حذف الموقع من السيرفر:', error);

        // Fallback: الحذف محلياً
        console.log('[repairService] 📱 حذف محلي (Offline Mode)');
        await localRepairLocationsService.delete(id, organizationId);

        return {
          success: true,
          message: 'تم الحذف محلياً - سيتم المزامنة لاحقاً',
          offline: true,
        };
      }

      return {
        success: true,
        message: 'تم الحذف بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في deleteLocation:', error);

      // Last fallback
      try {
        await localRepairLocationsService.delete(id, organizationId);

        return {
          success: true,
          message: 'تم الحذف محلياً - سيتم المزامنة عند عودة الاتصال',
          offline: true,
        };
      } catch (localError) {
        console.error('[repairService] ❌ فشل الحذف المحلي:', localError);
        return {
          success: false,
          error: localError instanceof Error ? localError.message : 'فشل الحذف',
        };
      }
    }
  },

  // =====================
  // Repair Images
  // =====================

  /**
   * إضافة صورة لطلب إصلاح
   * ⚡ يدعم الأوفلاين
   */
  async addImage(
    repairOrderId: string,
    imageUrl: string,
    imageType: 'before' | 'after',
    description?: string,
    organizationId?: string
  ): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 📸 إضافة صورة...');

      const { data, error } = await supabase
        .from('repair_images')
        .insert({
          repair_order_id: repairOrderId,
          image_url: imageUrl,
          image_type: imageType,
          description,
        })
        .select()
        .single();

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في إضافة الصورة على السيرفر:', error);

        // Fallback: الحفظ محلياً
        if (organizationId) {
          console.log('[repairService] 📱 حفظ محلي (Offline Mode)');
          const localImage = await addRepairImage({
            repairOrderId,
            imageUrl,
            imageType,
            description,
          });

          return {
            success: true,
            id: localImage.id,
            message: 'تم الحفظ محلياً - سيتم المزامنة لاحقاً',
            offline: true,
          };
        }

        throw error;
      }

      return {
        success: true,
        id: data.id,
        message: 'تمت إضافة الصورة بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في addImage:', error);

      // Last fallback
      if (organizationId) {
        try {
          const localImage = await addRepairImage({
            repairOrderId,
            imageUrl,
            imageType,
            description,
          });

          return {
            success: true,
            id: localImage.id,
            message: 'تم الحفظ محلياً - سيتم المزامنة عند عودة الاتصال',
            offline: true,
          };
        } catch (localError) {
          console.error('[repairService] ❌ فشل الحفظ المحلي:', localError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل إضافة الصورة',
      };
    }
  },

  /**
   * جلب صور طلب إصلاح
   * ⚡ يدعم الأوفلاين
   */
  async getImages(repairOrderId: string, organizationId?: string): Promise<RepairImage[]> {
    try {
      console.log('[repairService] 📸 جلب صور الطلب...');

      const { data, error } = await supabase
        .from('repair_images')
        .select('*')
        .eq('repair_order_id', repairOrderId);

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في جلب الصور من السيرفر:', error);

        // Fallback: الجلب محلياً
        if (organizationId) {
          console.log('[repairService] 📱 جلب محلي (Offline Mode)');
          const localImages = await listRepairImages(repairOrderId);
          return localImages as unknown as RepairImage[];
        }

        throw error;
      }

      return data as RepairImage[];
    } catch (error) {
      console.error('[repairService] ❌ خطأ في getImages:', error);

      // Last fallback
      if (organizationId) {
        try {
          const localImages = await listRepairImages(repairOrderId);
          return localImages as unknown as RepairImage[];
        } catch (localError) {
          console.error('[repairService] ❌ فشل الجلب من SQLite:', localError);
        }
      }

      return [];
    }
  },

  /**
   * حذف صورة
   * ⚡ يدعم الأوفلاين
   */
  async deleteImage(id: string, organizationId?: string): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 🗑️ حذف صورة:', id);

      const { error } = await supabase
        .from('repair_images')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في حذف الصورة من السيرفر:', error);

        // Fallback: الحذف محلياً
        if (organizationId) {
          console.log('[repairService] 📱 حذف محلي (Offline Mode)');
          await deleteRepairImage(id);

          return {
            success: true,
            message: 'تم الحذف محلياً - سيتم المزامنة لاحقاً',
            offline: true,
          };
        }

        throw error;
      }

      return {
        success: true,
        message: 'تم حذف الصورة بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في deleteImage:', error);

      // Last fallback
      if (organizationId) {
        try {
          await deleteRepairImage(id);

          return {
            success: true,
            message: 'تم الحذف محلياً - سيتم المزامنة عند عودة الاتصال',
            offline: true,
          };
        } catch (localError) {
          console.error('[repairService] ❌ فشل الحذف المحلي:', localError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل حذف الصورة',
      };
    }
  },

  // =====================
  // Repair History
  // =====================

  /**
   * إضافة سجل تاريخي لطلب إصلاح
   * ⚡ يدعم الأوفلاين
   */
  async addHistory(
    repairOrderId: string,
    status: string,
    notes?: string,
    createdBy?: string,
    organizationId?: string
  ): Promise<SaveRepairResponse> {
    try {
      console.log('[repairService] 📝 إضافة سجل تاريخي...');

      const { data, error } = await supabase
        .from('repair_status_history')
        .insert({
          repair_order_id: repairOrderId,
          status,
          notes,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        console.warn('[repairService] ⚠️ خطأ في إضافة السجل على السيرفر:', error);

        // Fallback: الحفظ محلياً
        if (organizationId) {
          console.log('[repairService] 📱 حفظ محلي (Offline Mode)');
          const localHistory = await addRepairStatusHistory(repairOrderId, status, notes, createdBy);

          return {
            success: true,
            id: localHistory.id,
            message: 'تم الحفظ محلياً - سيتم المزامنة لاحقاً',
            offline: true,
          };
        }

        throw error;
      }

      return {
        success: true,
        id: data.id,
        message: 'تمت إضافة السجل بنجاح',
      };
    } catch (error) {
      console.error('[repairService] ❌ خطأ في addHistory:', error);

      // Last fallback
      if (organizationId) {
        try {
          const localHistory = await addRepairStatusHistory(repairOrderId, status, notes, createdBy);

          return {
            success: true,
            id: localHistory.id,
            message: 'تم الحفظ محلياً - سيتم المزامنة عند عودة الاتصال',
            offline: true,
          };
        } catch (localError) {
          console.error('[repairService] ❌ فشل الحفظ المحلي:', localError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل إضافة السجل',
      };
    }
  },
};
