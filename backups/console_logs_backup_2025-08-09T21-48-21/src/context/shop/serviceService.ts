import { supabase } from '@/lib/supabase';
import { Service, ServiceStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { mapSupabaseServiceToService } from './mappers';

// وظيفة لإضافة خدمة جديدة
export const addService = async (service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .insert({
        ...service,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const mappedService = mapSupabaseServiceToService(data);
    return mappedService;
  } catch (error) {
    throw error;
  }
};

// وظيفة لتحديث خدمة
export const updateService = async (service: Service) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .update({
        name: service.name,
        description: service.description,
        price: service.price,
        estimated_time: service.estimatedTime,
        category: service.category,
        image: service.image,
        is_available: service.isAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', service.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const mappedService = mapSupabaseServiceToService(data);
    return mappedService;
  } catch (error) {
    throw error;
  }
};

// وظيفة لحذف خدمة
export const deleteService = async (serviceId: string) => {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw error;
  }
};

// وظيفة لتحديث حالة حجز الخدمة
export const updateServiceBookingStatus = async (
  orderId: string, 
  serviceBookingId: string, 
  status: ServiceStatus,
  note?: string,
  currentUserId?: string
): Promise<void> => {
  try {
    // تحديث حالة الخدمة في قاعدة البيانات
    const { error: updateError } = await supabase
      .from('service_bookings')
      .update({
        status
      })
      .eq('id', serviceBookingId)
      .eq('order_id', orderId);
    
    if (updateError) {
      throw new Error('فشل في تحديث حالة الخدمة');
    }
    
    // إضافة تقدم الخدمة
    const progressId = uuidv4();
    
    // التحقق من معلومات المستخدم الحالي
    let createdBy = currentUserId;
    
    // إذا لم يكن هناك مستخدم حالي، نحاول الحصول على المستخدم من Supabase Auth
    if (!createdBy) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData && userData.user) {
        createdBy = userData.user.id;
        
      } else {
        createdBy = '00000000-0000-0000-0000-000000000000'; // استخدام معرف افتراضي
        
      }
    } else {
      
    }
    
    // بيانات تقدم الخدمة
    const progressData = {
      id: progressId,
      service_booking_id: serviceBookingId,
      status,
      note: note || `تم تغيير الحالة إلى: ${status}`,
      timestamp: new Date().toISOString(),
      created_by: createdBy,
      slug: `progress-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`
    };

    const { data: insertedProgress, error: progressError } = await supabase
      .from('service_progress')
      .insert(progressData)
      .select();
    
    if (progressError) {
    } else {
      
    }
    
    // إذا كانت الحالة مكتملة، قم بتحديث وقت الإكمال
    if (status === 'completed') {
      const { error: completedError } = await supabase
        .from('service_bookings')
        .update({
          completed_at: new Date().toISOString()
        })
        .eq('id', serviceBookingId);
      
      if (completedError) {
      }
    }
  } catch (error) {
    throw error;
  }
};

// وظيفة لتعيين عامل للخدمة
export const assignServiceBooking = async (
  orderId: string, 
  serviceBookingId: string, 
  employeeId: string
): Promise<void> => {
  try {
    // تعيين عامل للخدمة
    const { error } = await supabase
      .from('service_bookings')
      .update({
        assigned_to: employeeId
      })
      .eq('id', serviceBookingId)
      .eq('order_id', orderId);
    
    if (error) {
      throw new Error('فشل في تعيين العامل للخدمة');
    }
  } catch (error) {
    throw error;
  }
};

// وظيفة للحصول على جميع حجوزات الخدمات
export const getServiceBookings = async (organizationId: string | undefined): Promise<{
  orderId: string;
  order: any;
  serviceBooking: any;
}[]> => {
  try {
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف منظمة صالح');
    }

    // الحصول على جميع حجوزات الخدمات مع تفاصيل الطلب
    const { data, error } = await supabase
      .from('service_bookings')
      .select(`
        *,
        orders:order_id (*)
      `)
      .eq('organization_id', organizationId);
    
    if (error) {
      throw new Error('فشل في جلب حجوزات الخدمات');
    }

    // تحويل البيانات إلى النموذج المناسب
    const result = await Promise.all((data || []).map(async (booking) => {
      // جلب تقدم الخدمة
      const { data: progressData, error: progressError } = await supabase
        .from('service_progress')
        .select('*')
        .eq('service_booking_id', booking.id)
        .order('timestamp', { ascending: false });
      
      if (progressError) {
      }
      
      return {
        orderId: booking.order_id,
        order: booking.orders,
        serviceBooking: {
          id: booking.id,
          serviceId: booking.service_id,
          serviceName: booking.service_name,
          price: booking.price,
          scheduledDate: booking.scheduled_date ? new Date(booking.scheduled_date) : undefined,
          notes: booking.notes,
          customerId: booking.customer_id,
          customer_name: booking.customer_name || undefined,
          status: booking.status,
          assignedTo: booking.assigned_to,
          completedAt: booking.completed_at ? new Date(booking.completed_at) : undefined,
          public_tracking_code: booking.public_tracking_code,
          progress: progressData ? progressData.map(p => ({
            id: p.id,
            serviceBookingId: p.service_booking_id,
            status: p.status,
            note: p.note,
            timestamp: new Date(p.timestamp),
            createdBy: p.created_by
          })) : []
        }
      };
    }));
    
    return result;
  } catch (error) {
    throw error;
  }
};
