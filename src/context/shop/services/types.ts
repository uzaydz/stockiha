/**
 * Services Types
 * أنواع البيانات الخاصة بالخدمات
 */

import { Service, ServiceBooking, ServiceStatus } from '@/types';

export interface ServicesState {
  services: Service[];
  serviceBookings: ServiceBooking[];
  isLoading: boolean;
  error: string | null;
}

export interface ServicesContextType {
  state: ServicesState;
  fetchServices: () => Promise<void>;
  addService: (service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Service>;
  updateService: (service: Service) => Promise<Service>;
  deleteService: (serviceId: string) => Promise<boolean>;
  fetchServiceBookings: () => Promise<void>;
  updateServiceBookingStatus: (
    orderId: string,
    serviceBookingId: string,
    status: ServiceStatus,
    note?: string
  ) => Promise<void>;
  assignServiceBooking: (
    orderId: string,
    serviceBookingId: string,
    employeeId: string
  ) => Promise<void>;
  refreshServices: () => Promise<void>;
}
