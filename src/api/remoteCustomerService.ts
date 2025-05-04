import { apiClient } from '@/lib/api/client';
import { LocalCustomer, LocalAddress, inventoryDB, customersStore, addressesStore } from '@/database/localDb';
import { v4 as uuidv4 } from 'uuid';

/**
 * خدمة العملاء البعيدة
 * المسؤولة عن إجراء عمليات CRUD للعملاء مع خادم API
 */

// الحصول على معرف المؤسسة الحالية
const getCurrentOrganizationId = (): string => {
  return localStorage.getItem('bazaar_organization_id') || '';
};

/**
 * وظيفة لجلب قائمة العملاء من الخادم البعيد
 */
export async function fetchCustomers(options: {
  page?: number;
  limit?: number;
  search?: string;
  organization_id: string;
}) {
  try {
    const { page = 1, limit = 20, search = '', organization_id } = options;
    
    const response = await apiClient.get('/customers', {
      params: {
        page,
        limit,
        search,
        organization_id,
      }
    });
    
    return {
      customers: response.data.data,
      pagination: response.data.pagination
    };
  } catch (error) {
    console.error('خطأ في جلب العملاء:', error);
    throw error;
  }
}

/**
 * وظيفة لإنشاء عميل جديد على الخادم البعيد
 */
export async function createRemoteCustomer(customer: LocalCustomer) {
  try {
    const customerData = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      organization_id: customer.organization_id,
    };
    
    const response = await apiClient.post('/customers', customerData);
    
    // تحديث العميل المحلي مع معرف العميل البعيد ومعلومات المزامنة
    const updatedCustomer: LocalCustomer = {
      ...customer,
      synced: true,
      syncStatus: 'synced',
      lastSyncAttempt: new Date().toISOString(),
      localUpdatedAt: new Date().toISOString(),
      pendingOperation: undefined,
    };
    
    await customersStore.setItem(customer.id, updatedCustomer);
    
    return response.data;
  } catch (error) {
    console.error('خطأ في إنشاء العميل على الخادم البعيد:', error);
    
    // تحديث حالة المزامنة إلى خطأ
    const errorCustomer: LocalCustomer = {
      ...customer,
      synced: false,
      syncStatus: 'error',
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: 'create',
    };
    
    await customersStore.setItem(customer.id, errorCustomer);
    
    throw error;
  }
}

/**
 * وظيفة لتحديث عميل موجود على الخادم البعيد
 */
export async function updateRemoteCustomer(customer: LocalCustomer) {
  try {
    const customerData = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    };
    
    const customerId = customer.id;
    const response = await apiClient.put(`/customers/${customerId}`, customerData);
    
    // تحديث العميل المحلي مع معلومات المزامنة
    const updatedCustomer: LocalCustomer = {
      ...customer,
      synced: true,
      syncStatus: 'synced',
      lastSyncAttempt: new Date().toISOString(),
      localUpdatedAt: new Date().toISOString(),
      pendingOperation: undefined,
    };
    
    await customersStore.setItem(customer.id, updatedCustomer);
    
    return response.data;
  } catch (error) {
    console.error('خطأ في تحديث العميل على الخادم البعيد:', error);
    
    // تحديث حالة المزامنة إلى خطأ
    const errorCustomer: LocalCustomer = {
      ...customer,
      synced: false,
      syncStatus: 'error',
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: 'update',
    };
    
    await customersStore.setItem(customer.id, errorCustomer);
    
    throw error;
  }
}

/**
 * وظيفة لحذف عميل من الخادم البعيد
 */
export async function deleteRemoteCustomer(customerId: string) {
  try {
    await apiClient.delete(`/customers/${customerId}`);
    
    // حذف العميل من قاعدة البيانات المحلية
    await customersStore.removeItem(customerId);
    
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف العميل من الخادم البعيد:', error);
    
    // تحديث حالة المزامنة إلى خطأ للعميل المحلي إذا كان لا يزال موجودًا
    const customer = await customersStore.getItem<LocalCustomer>(customerId);
    if (customer) {
      const errorCustomer: LocalCustomer = {
        ...customer,
        synced: false,
        syncStatus: 'error',
        lastSyncAttempt: new Date().toISOString(),
        pendingOperation: 'delete',
      };
      
      await customersStore.setItem(customerId, errorCustomer);
    }
    
    throw error;
  }
}

/**
 * وظيفة لجلب عميل واحد بواسطة المعرف من الخادم البعيد
 */
export async function fetchCustomerById(customerId: string) {
  try {
    const response = await apiClient.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    console.error(`خطأ في جلب العميل بالمعرف ${customerId}:`, error);
    throw error;
  }
}

/**
 * وظيفة لإنشاء عنوان جديد للعميل على الخادم البعيد
 */
export async function createRemoteAddress(address: LocalAddress) {
  try {
    const addressData = {
      customer_id: address.customer_id,
      name: address.name,
      street_address: address.street_address,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone,
      is_default: address.is_default,
      organization_id: address.organization_id,
    };
    
    const response = await apiClient.post('/addresses', addressData);
    
    // تحديث العنوان المحلي مع معرف العنوان البعيد ومعلومات المزامنة
    const updatedAddress: LocalAddress = {
      ...address,
      synced: true,
      syncStatus: 'synced',
      lastSyncAttempt: new Date().toISOString(),
      localUpdatedAt: new Date().toISOString(),
      pendingOperation: undefined,
    };
    
    await addressesStore.setItem(address.id, updatedAddress);
    
    return response.data;
  } catch (error) {
    console.error('خطأ في إنشاء العنوان على الخادم البعيد:', error);
    
    // تحديث حالة المزامنة إلى خطأ
    const errorAddress: LocalAddress = {
      ...address,
      synced: false,
      syncStatus: 'error',
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: 'create',
    };
    
    await addressesStore.setItem(address.id, errorAddress);
    
    throw error;
  }
}

/**
 * وظيفة لجلب عناوين العميل من الخادم البعيد
 */
export async function fetchCustomerAddresses(customerId: string) {
  try {
    const response = await apiClient.get(`/customers/${customerId}/addresses`);
    return response.data;
  } catch (error) {
    console.error(`خطأ في جلب عناوين العميل ${customerId}:`, error);
    throw error;
  }
}

/**
 * وظيفة لتحديث عنوان العميل على الخادم البعيد
 */
export async function updateRemoteAddress(address: LocalAddress) {
  try {
    const addressData = {
      name: address.name,
      street_address: address.street_address,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone,
      is_default: address.is_default,
    };
    
    const addressId = address.id;
    const response = await apiClient.put(`/addresses/${addressId}`, addressData);
    
    // تحديث العنوان المحلي مع معلومات المزامنة
    const updatedAddress: LocalAddress = {
      ...address,
      synced: true,
      syncStatus: 'synced',
      lastSyncAttempt: new Date().toISOString(),
      localUpdatedAt: new Date().toISOString(),
      pendingOperation: undefined,
    };
    
    await addressesStore.setItem(address.id, updatedAddress);
    
    return response.data;
  } catch (error) {
    console.error('خطأ في تحديث العنوان على الخادم البعيد:', error);
    
    // تحديث حالة المزامنة إلى خطأ
    const errorAddress: LocalAddress = {
      ...address,
      synced: false,
      syncStatus: 'error',
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: 'update',
    };
    
    await addressesStore.setItem(address.id, errorAddress);
    
    throw error;
  }
}

/**
 * وظيفة لحذف عنوان من الخادم البعيد
 */
export async function deleteRemoteAddress(addressId: string) {
  try {
    await apiClient.delete(`/addresses/${addressId}`);
    
    // حذف العنوان من قاعدة البيانات المحلية
    await addressesStore.removeItem(addressId);
    
    return { success: true };
  } catch (error) {
    console.error('خطأ في حذف العنوان من الخادم البعيد:', error);
    
    // تحديث حالة المزامنة إلى خطأ للعنوان المحلي إذا كان لا يزال موجودًا
    const address = await addressesStore.getItem<LocalAddress>(addressId);
    if (address) {
      const errorAddress: LocalAddress = {
        ...address,
        synced: false,
        syncStatus: 'error',
        lastSyncAttempt: new Date().toISOString(),
        pendingOperation: 'delete',
      };
      
      await addressesStore.setItem(addressId, errorAddress);
    }
    
    throw error;
  }
} 