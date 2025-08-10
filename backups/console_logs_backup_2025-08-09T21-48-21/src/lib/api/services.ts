import { supabase } from '@/lib/supabase';
import { sendWhatsappMessage } from './whatsapp';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  estimated_time: string;
  category: string;
  image?: string;
  is_available: boolean;
  is_price_dynamic: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceBooking {
  id: string;
  service_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
}

interface CreateServiceData {
  name: string;
  description: string;
  price: number;
  estimated_time: string;
  category: string;
  image?: string;
  is_available?: boolean;
  is_price_dynamic?: boolean;
  slug: string;
  organization_id: string;
}

interface UpdateServiceData {
  name?: string;
  description?: string;
  price?: number;
  estimated_time?: string;
  category?: string;
  image?: string;
  is_available?: boolean;
  is_price_dynamic?: boolean;
}

// الحصول على جميع الخدمات
export async function getServices(organizationId?: string) {
  try {
    if (!organizationId) {
      return [];
    }

    // إضافة تأخير بسيط لمنع مشاكل التزامن
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // طباعة البيانات المفصلة للتصحيح
    if (!data || data.length === 0) {
      
    } else {

    }
    
    // التحقق من البيانات قبل إرجاعها
    return Array.isArray(data) ? data as Service[] : [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    
    // تسجيل محاولة إعادة الاتصال
    try {
      
      const { data: retryData } = await supabase
        .from('services')
        .select('count')
        .eq('organization_id', organizationId);

    } catch (retryError) {
    }
    
    return [];
  }
}

// الحصول على خدمة محددة بواسطة المعرف
export async function getServiceById(id: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Service;
}

// إنشاء خدمة جديدة
export async function createService(serviceData: CreateServiceData) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw new Error('لم يتم العثور على معلومات المستخدم. يرجى تسجيل الدخول مرة أخرى.');
    }

    if (!userData.user?.user_metadata?.role || userData.user.user_metadata.role !== 'admin') {
      throw new Error('ليس لديك الصلاحيات الكافية لإضافة خدمات. يجب أن تكون مسؤول النظام.');
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{
        ...serviceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
        throw new Error('ليس لديك الصلاحيات الكافية لإضافة خدمات. يجب أن تكون مسؤول النظام.');
      }
      throw new Error(error.message);
    }

    return data as Service;
  } catch (error) {
    throw error;
  }
}

// تحديث خدمة موجودة
export async function updateService(id: string, serviceData: UpdateServiceData) {
  const { data, error } = await supabase
    .from('services')
    .update({
      ...serviceData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Service;
}

// حذف خدمة
export async function deleteService(id: string) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

// تنشيط أو إلغاء تنشيط خدمة
export async function toggleServiceStatus(id: string, isAvailable: boolean) {
  return updateService(id, { is_available: isAvailable });
}

// الحصول على حجوزات خدمة محددة
export async function getServiceBookings(serviceId: string) {
  const { data, error } = await supabase
    .from('service_bookings')
    .select('*')
    .eq('service_id', serviceId)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as ServiceBooking[];
}

// الحصول على جميع الحجوزات مع تفاصيل الخدمات
export async function getAllBookings() {
  const { data, error } = await supabase
    .from('service_bookings')
    .select(`
      *,
      service:service_id (*)
    `)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as ServiceBooking[];
}

// إنشاء حجز جديد
export async function createBooking(bookingData: Omit<ServiceBooking, 'id' | 'created_at' | 'updated_at' | 'service'>) {
  const { data, error } = await supabase
    .from('service_bookings')
    .insert([{
      ...bookingData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ServiceBooking;
}

// تحديث حالة الحجز
export async function updateBookingStatus(id: string, status: ServiceBooking['status']) {
  try {
    // جلب معلومات الحجز والخدمة قبل التحديث
    const { data: bookingData, error: bookingError } = await supabase
      .from('service_bookings')
      .select(`
        *,
        service:service_id (*)
      `)
      .eq('id', id)
      .single();

    if (bookingError) {
      throw new Error(bookingError.message);
    }

    // تحديث حالة الحجز
    const { data, error } = await supabase
      .from('service_bookings')
      .update({
        status,
        updated_at: new Date().toISOString(),
        completed_at: status === 'completed' ? new Date().toISOString() : bookingData.completed_at
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // في حالة تم تحديث الحالة إلى مكتملة، سيتم إرسال الإشعار عبر الزناد الذي تم إنشاؤه في قاعدة البيانات
    // ولكن يمكننا أيضًا إرسال الإشعار مباشرة من التطبيق كاحتياط
    if (status === 'completed') {
      // قم بإرسال إشعار في واجهة المستخدم
      try {
        // جلب رقم هاتف العميل
        let customerPhone = bookingData.customer_phone;
        
        // إذا لم يكن هناك رقم هاتف في الحجز وهناك معرف للعميل
        if (!customerPhone && bookingData.customer_id) {
          // جلب رقم هاتف العميل من جدول العملاء
          const { data: customerData } = await supabase
            .from('customers')
            .select('phone')
            .eq('id', bookingData.customer_id)
            .single();
            
          if (customerData && customerData.phone) {
            customerPhone = customerData.phone;
          }
        }
        
        // إذا كان هناك رقم هاتف للعميل، تحقق من وجود مسؤول متصل بواتساب
        if (customerPhone) {
          const { data: adminData } = await supabase
            .from('users')
            .select('*')
            .eq('organization_id', bookingData.organization_id)
            .eq('whatsapp_connected', true)
            .or('is_org_admin.eq.true,role.eq.admin')
            .limit(1);
            
          // إذا كان هناك مسؤول متصل بواتساب
          if (adminData && adminData.length > 0) {
            // جلب قالب الرسالة
            const { data: templateData } = await supabase
              .from('whatsapp_templates')
              .select('template_content')
              .eq('organization_id', bookingData.organization_id)
              .eq('template_name', 'service_completed')
              .eq('is_active', true)
              .single();
              
            // إنشاء وإرسال الرسالة
            try {
              // استخدم القالب أو استخدم رسالة افتراضية
              const templateContent = templateData?.template_content || 
                'مرحباً {{customer_name}}، تم إكمال خدمة "{{service_name}}" بنجاح. شكراً لاستخدامك خدماتنا!';
                
              // استبدال المتغيرات في القالب
              const message = templateContent
                .replace('{{customer_name}}', bookingData.customer_name || 'العميل')
                .replace('{{service_name}}', bookingData.service.name || 'الخدمة');
                
              // استيراد وظيفة إرسال رسائل واتساب
              const { sendWhatsappMessage } = await import('@/lib/api/whatsapp');
              
              // إرسال الرسالة
              await sendWhatsappMessage(customerPhone, message);
              
              // سجل الرسالة المرسلة في قاعدة البيانات
              await supabase.from('whatsapp_messages').insert({
                organization_id: bookingData.organization_id,
                booking_id: id,
                recipient_phone: customerPhone,
                message_content: message,
                status: 'sent'
              });

            } catch (msgError) {
              
              // سجل فشل الإرسال في قاعدة البيانات
              await supabase.from('whatsapp_messages').insert({
                organization_id: bookingData.organization_id,
                booking_id: id,
                recipient_phone: customerPhone,
                message_content: `محاولة إرسال إشعار إكمال الخدمة "${bookingData.service.name}"`,
                status: 'failed',
                error_message: msgError instanceof Error ? msgError.message : String(msgError)
              });
            }
          }
        }
      } catch (notificationError) {
        // تسجيل الخطأ فقط، لكن لا تمنع إكمال العملية بنجاح
      }
    }

    return data as ServiceBooking;
  } catch (error) {
    throw error;
  }
}

// حذف حجز
export async function deleteBooking(id: string) {
  const { error } = await supabase
    .from('service_bookings')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

// الحصول على جميع فئات الخدمات الفريدة
export async function getServiceCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('services')
    .select('category')
    .not('category', 'is', null)
    .order('category');

  if (error) {
    throw new Error(error.message);
  }

  // استخراج الفئات الفريدة
  const categories = [...new Set(data.map(item => item.category))]
    .filter(Boolean) as string[];

  return categories;
}

// الحصول على طلبات الخدمات
export async function getServiceRequests(organizationId: string) {
  try {
    if (!organizationId) {
      return [];
    }

    // طباعة قائمة معرفات المؤسسات التي تمتلك خدمات
    const { data: orgData, error: orgError } = await supabase
      .from('service_bookings')
      .select('organization_id')
      .not('organization_id', 'is', null);
    
    if (!orgError && orgData) {
      const uniqueOrgs = [...new Set(orgData.map(item => item.organization_id))];

    }
    
    // استعلام الحصول على الخدمات مع تفاصيل التقدم
    const { data, error } = await supabase
      .from('service_bookings')
      .select(`
        *,
        service:service_id (*)
      `)
      .eq('organization_id', organizationId)
      .order('id', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // طباعة البيانات المفصلة للتصحيح
    if (!data || data.length === 0) {

      // محاولة البحث عن الخدمات باستخدام أي معرف مؤسسة إذا لم تجد الخدمات بالمعرف الحالي
      if (orgData && orgData.length > 0) {
        const uniqueOrgs = [...new Set(orgData.map(item => item.organization_id))];
        if (uniqueOrgs.length > 0) {
          const alternativeOrgId = uniqueOrgs[0];

          const { data: altData, error: altError } = await supabase
            .from('service_bookings')
            .select(`
              *,
              service:service_id (*)
            `)
            .eq('organization_id', alternativeOrgId)
            .order('id', { ascending: false });
            
          if (!altError && altData && altData.length > 0) {
            
          }
        }
      }
    } else {
      
    }
    
    // التحقق من البيانات قبل إرجاعها
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw error;
  }
}
