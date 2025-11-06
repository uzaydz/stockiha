/**
 * ServicesContext - سياق الخدمات المحسن
 *
 * التحسينات:
 * - useCallback للأداء
 * - دعم حجوزات الخدمات
 * - تحديث تلقائي عند التغييرات
 * - إدارة حالة الموظفين المعينين
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode
} from 'react';
import { Service, ServiceBooking, ServiceStatus } from '@/types';
import { ServicesState, ServicesContextType } from './types';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import * as serviceService from '../serviceService';
import { supabase } from '@/lib/supabase-client';
import { mapSupabaseServiceToService } from '../mappers';
import { withCache, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';

// ============================================================================
// Initial State
// ============================================================================

const initialState: ServicesState = {
  services: [],
  serviceBookings: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Context
// ============================================================================

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ServicesProviderProps {
  children: ReactNode;
}

export const ServicesProvider = React.memo(function ServicesProvider({
  children
}: ServicesProviderProps) {
  const [state, setState] = useState<ServicesState>(initialState);
  const tenant = useTenant();
  const { user } = useAuth();

  // ========================================================================
  // Services Actions
  // ========================================================================

  const fetchServices = useCallback(async () => {
    const organizationId = tenant.currentOrganization?.id;
    if (!organizationId) {
      setState(prev => ({
        ...prev,
        error: 'لم يتم العثور على معرف المنظمة',
        isLoading: false,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // استخدام التخزين المؤقت لتحسين الأداء
      const services = await withCache<Service[]>(
        `services:${organizationId}`,
        async () => {
          const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_available', true);

          if (error) {
            throw error;
          }

          return (data || []).map(service => mapSupabaseServiceToService(service));
        },
        SHORT_CACHE_TTL
      );

      setState(prev => ({
        ...prev,
        services,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب الخدمات';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [tenant.currentOrganization?.id]);

  const addService = useCallback(async (
    service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Service> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const newService = await serviceService.addService(service);

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        services: [newService, ...prev.services],
        isLoading: false,
      }));

      return newService;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إضافة الخدمة';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const updateService = useCallback(async (service: Service): Promise<Service> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const updatedService = await serviceService.updateService(service);

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        services: prev.services.map(s =>
          s.id === service.id ? updatedService : s
        ),
        isLoading: false,
      }));

      return updatedService;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحديث الخدمة';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const deleteService = useCallback(async (serviceId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await serviceService.deleteService(serviceId);

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        services: prev.services.filter(s => s.id !== serviceId),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف الخدمة';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  // ========================================================================
  // Service Bookings Actions
  // ========================================================================

  const fetchServiceBookings = useCallback(async () => {
    const organizationId = tenant.currentOrganization?.id;
    if (!organizationId) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const bookingsData = await serviceService.getServiceBookings(organizationId);

      // استخراج الـ ServiceBooking فقط
      const bookings = bookingsData.map(item => item.serviceBooking);

      setState(prev => ({
        ...prev,
        serviceBookings: bookings,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب الحجوزات';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [tenant.currentOrganization?.id]);

  const updateServiceBookingStatus = useCallback(async (
    orderId: string,
    serviceBookingId: string,
    status: ServiceStatus,
    note?: string
  ): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await serviceService.updateServiceBookingStatus(
        orderId,
        serviceBookingId,
        status,
        note,
        user?.id
      );

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        serviceBookings: prev.serviceBookings.map(booking =>
          booking.id === serviceBookingId
            ? { ...booking, status }
            : booking
        ),
        isLoading: false,
      }));

      // إعادة جلب الحجوزات لتحديث تقدم الخدمة
      await fetchServiceBookings();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحديث حالة الحجز';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [user?.id, fetchServiceBookings]);

  const assignServiceBooking = useCallback(async (
    orderId: string,
    serviceBookingId: string,
    employeeId: string
  ): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await serviceService.assignServiceBooking(
        orderId,
        serviceBookingId,
        employeeId
      );

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        serviceBookings: prev.serviceBookings.map(booking =>
          booking.id === serviceBookingId
            ? { ...booking, assignedTo: employeeId }
            : booking
        ),
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تعيين الموظف';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const refreshServices = useCallback(async () => {
    await Promise.all([
      fetchServices(),
      fetchServiceBookings()
    ]);
  }, [fetchServices, fetchServiceBookings]);

  // ========================================================================
  // Context Value (memoized)
  // ========================================================================

  const value = useMemo<ServicesContextType>(
    () => ({
      state,
      fetchServices,
      addService,
      updateService,
      deleteService,
      fetchServiceBookings,
      updateServiceBookingStatus,
      assignServiceBooking,
      refreshServices,
    }),
    [
      state,
      fetchServices,
      addService,
      updateService,
      deleteService,
      fetchServiceBookings,
      updateServiceBookingStatus,
      assignServiceBooking,
      refreshServices,
    ]
  );

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
});

// ============================================================================
// Hook
// ============================================================================

export function useServices(): ServicesContextType {
  const context = useContext(ServicesContext);

  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }

  return context;
}

// ============================================================================
// Selectors (for performance)
// ============================================================================

/**
 * Hook للحصول على قائمة الخدمات فقط
 */
export function useServicesList() {
  const { state } = useServices();
  return useMemo(() => state.services, [state.services]);
}

/**
 * Hook للحصول على خدمة بالـ ID
 */
export function useServiceById(serviceId: string) {
  const { state } = useServices();
  return useMemo(
    () => state.services.find(s => s.id === serviceId),
    [state.services, serviceId]
  );
}

/**
 * Hook للحصول على الخدمات المتاحة فقط
 */
export function useAvailableServices() {
  const { state } = useServices();
  return useMemo(
    () => state.services.filter(s => s.isAvailable),
    [state.services]
  );
}

/**
 * Hook للحصول على الخدمات حسب الفئة
 */
export function useServicesByCategory(category: string) {
  const { state } = useServices();
  return useMemo(
    () => state.services.filter(s => s.category === category),
    [state.services, category]
  );
}

/**
 * Hook للحصول على حجوزات الخدمات
 */
export function useServiceBookings() {
  const { state } = useServices();
  return useMemo(() => state.serviceBookings, [state.serviceBookings]);
}

/**
 * Hook للحصول على حجوزات الخدمات حسب الحالة
 */
export function useServiceBookingsByStatus(status: ServiceStatus) {
  const { state } = useServices();
  return useMemo(
    () => state.serviceBookings.filter(b => b.status === status),
    [state.serviceBookings, status]
  );
}

/**
 * Hook للحصول على الحجوزات المعينة لموظف
 */
export function useServiceBookingsByEmployee(employeeId: string) {
  const { state } = useServices();
  return useMemo(
    () => state.serviceBookings.filter(b => b.assignedTo === employeeId),
    [state.serviceBookings, employeeId]
  );
}

/**
 * Hook للحصول على حالة التحميل
 */
export function useServicesLoading() {
  const { state } = useServices();
  return useMemo(() => state.isLoading, [state.isLoading]);
}

/**
 * Hook للحصول على الأخطاء
 */
export function useServicesError() {
  const { state } = useServices();
  return useMemo(() => state.error, [state.error]);
}
