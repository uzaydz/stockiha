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
      console.error("لم يتم تمرير معرف المؤسسة إلى وظيفة getServices");
      return [];
    }
    
    console.log("جلب الخدمات للمؤسسة:", organizationId);
    
    // إضافة تأخير بسيط لمنع مشاكل التزامن
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب الخدمات:', error);
      throw new Error(error.message);
    }

    // طباعة البيانات المفصلة للتصحيح
    if (!data || data.length === 0) {
      console.log(`لم يتم العثور على خدمات للمؤسسة ${organizationId}. تأكد من صحة معرف المؤسسة.`);
    } else {
      console.log(`تم جلب ${data.length} خدمة للمؤسسة ${organizationId}`);
      console.log('أول خدمة:', data[0]?.name, 'معرف الخدمة:', data[0]?.id);
    }
    
    // التحقق من البيانات قبل إرجاعها
    return Array.isArray(data) ? data as Service[] : [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('خطأ غير متوقع أثناء جلب الخدمات:', errorMessage);
    
    // تسجيل محاولة إعادة الاتصال
    try {
      console.log('محاولة إعادة الاتصال بقاعدة البيانات...');
      const { data: retryData } = await supabase
        .from('services')
        .select('count')
        .eq('organization_id', organizationId);
        
      console.log('نتيجة إعادة الاتصال:', retryData);
    } catch (retryError) {
      console.error('فشلت محاولة إعادة الاتصال:', retryError);
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
    console.error('Error fetching service:', error);
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
    console.error('Error creating service:', error);
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
    console.error('Error updating service:', error);
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
    console.error('Error deleting service:', error);
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
    console.error('Error fetching service bookings:', error);
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
    console.error('Error fetching all bookings:', error);
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
    console.error('Error creating booking:', error);
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
      console.error('Error fetching booking details:', bookingError);
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
      console.error('Error updating booking status:', error);
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
              
              console.log('WhatsApp message sent successfully to:', customerPhone);
            } catch (msgError) {
              console.error('Error sending WhatsApp message:', msgError);
              
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
        console.error('Error sending booking completion notification:', notificationError);
      }
    }

    return data as ServiceBooking;
  } catch (error) {
    console.error('Error in updateBookingStatus:', error);
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
    console.error('Error deleting booking:', error);
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
    console.error('Error fetching service categories:', error);
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
      console.error("لم يتم تمرير معرف المؤسسة إلى وظيفة getServiceRequests");
      return [];
    }
    
    console.log("جلب طلبات الخدمات للمؤسسة:", organizationId);
    
    // طباعة قائمة معرفات المؤسسات التي تمتلك خدمات
    const { data: orgData, error: orgError } = await supabase
      .from('service_bookings')
      .select('organization_id')
      .not('organization_id', 'is', null);
    
    if (!orgError && orgData) {
      const uniqueOrgs = [...new Set(orgData.map(item => item.organization_id))];
      console.log("المؤسسات التي تمتلك خدمات:", uniqueOrgs);
      console.log("هل المؤسسة الحالية في القائمة؟", uniqueOrgs.includes(organizationId));
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
      console.error('خطأ في جلب طلبات الخدمات:', error);
      throw new Error(error.message);
    }

    // طباعة البيانات المفصلة للتصحيح
    if (!data || data.length === 0) {
      console.log(`لم يتم العثور على طلبات خدمات للمؤسسة ${organizationId}. تأكد من صحة معرف المؤسسة.`);
      
      // محاولة البحث عن الخدمات باستخدام أي معرف مؤسسة إذا لم تجد الخدمات بالمعرف الحالي
      if (orgData && orgData.length > 0) {
        const uniqueOrgs = [...new Set(orgData.map(item => item.organization_id))];
        if (uniqueOrgs.length > 0) {
          const alternativeOrgId = uniqueOrgs[0];
          console.log(`محاولة جلب الخدمات باستخدام معرف مؤسسة بديل: ${alternativeOrgId}`);
          
          const { data: altData, error: altError } = await supabase
            .from('service_bookings')
            .select(`
              *,
              service:service_id (*)
            `)
            .eq('organization_id', alternativeOrgId)
            .order('id', { ascending: false });
            
          if (!altError && altData && altData.length > 0) {
            console.log(`تم العثور على ${altData.length} خدمة في المؤسسة البديلة.`);
          }
        }
      }
    } else {
      console.log(`تم جلب ${data.length} طلب خدمة للمؤسسة ${organizationId}`);
    }
    
    // التحقق من البيانات قبل إرجاعها
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("خطأ في استرجاع طلبات الخدمات:", error);
    throw error;
  }
} 