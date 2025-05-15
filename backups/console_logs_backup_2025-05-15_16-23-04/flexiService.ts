import { supabase } from '../lib/supabase-client';
import type { 
  FlexiNetwork, 
  FlexiBalance, 
  FlexiSale,
  FlexiStats
} from '../types/flexi';

// الحصول على جميع شبكات الفليكسي
export async function getFlexiNetworks(forceOrganizationId?: string): Promise<FlexiNetwork[]> {
  try {
    // محاولة الحصول على معرف المنظمة بعدة طرق
    let organizationId = forceOrganizationId;
    
    if (!organizationId) {
      // محاولة 1: من التخزين المحلي
      organizationId = localStorage.getItem('organization_id') || '';
      
      // محاولة 2: من جلسة المستخدم (إذا كان متاحًا)
      if (!organizationId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user;
          if (user) {
            organizationId = 
              user.user_metadata?.organization_id || 
              (user as any)?.organization_id ||
              user.app_metadata?.organization_id;
          }
        } catch (e) {
          console.warn('فشل في استرجاع جلسة المستخدم:', e);
        }
      }
      
      // محاولة 3: المعرف الافتراضي
      if (!organizationId) {
        organizationId = "7519afc0-d068-4235-a0f2-f92935772e0c"; 
        console.warn('استخدام معرف المنظمة الافتراضي في getFlexiNetworks:', organizationId);
      }
    }
    
    console.log('معرف المنظمة المستخدم للحصول على الشبكات:', organizationId);
    
    // استخدام وظيفة get_all_flexi_networks الموجودة بالفعل
    const { data, error } = await supabase
      .rpc('get_all_flexi_networks');
      
    if (error) {
      console.error('Error fetching flexi networks:', error);
      throw new Error('فشل في الحصول على شبكات الفليكسي');
    }
    
    if (!data || data.length === 0) {
      console.warn('لم يتم استلام أي شبكات من get_all_flexi_networks');
      return [];
    }
    
    // تجميع جميع معرفات المنظمات الموجودة في البيانات
    const availableOrganizations = new Set(data.map(n => n.organization_id));
    console.log('المنظمات المتاحة في الشبكات:', Array.from(availableOrganizations));
    
    // فلترة البيانات بمعرف المنظمة
    let filteredData = data.filter(network => network.organization_id === organizationId);
    
    // إذا لم نجد أي شبكات للمنظمة المحددة، نعرض جميع الشبكات
    if (filteredData.length === 0) {
      console.warn(`لم يتم العثور على أي شبكات للمنظمة [${organizationId}]. عرض جميع الشبكات بدلاً من ذلك.`);
      filteredData = data; // استخدام جميع البيانات بدلاً من الفلترة
    }
    
    console.log(`تم استلام ${data.length} شبكة، وبعد المعالجة أصبح ${filteredData.length} شبكة معروضة`);
    
    return filteredData;
  } catch (error) {
    console.error('خطأ في استرجاع شبكات الفليكسي:', error);
    throw error;
  }
}

// إضافة شبكة فليكسي جديدة
export async function addFlexiNetwork(network: Partial<FlexiNetwork>): Promise<FlexiNetwork> {
  try {
    // استخدام وظيفة RPC الآمنة بدلاً من الإدراج المباشر
    const { data, error } = await supabase
      .rpc('add_flexi_network', {
        p_name: network.name,
        p_description: network.description || null,
        p_icon: network.icon || 'Phone',
        p_is_active: network.is_active !== undefined ? network.is_active : true,
        p_organization_id: network.organization_id || null // تمرير معرف المؤسسة
      });
      
    if (error) {
      console.error('Error adding flexi network:', error);
      throw new Error('فشل في إضافة شبكة فليكسي جديدة');
    }
    
    // إنشاء كائن الشبكة من البيانات المرسلة
    const networkData: FlexiNetwork = {
      id: data as string, // نفترض أن وظيفة RPC تعيد معرف UUID
      name: network.name!,
      description: network.description || null,
      icon: network.icon || 'Phone',
      is_active: network.is_active !== undefined ? network.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization_id: network.organization_id!
    };
    
    return networkData;
  } catch (error) {
    console.error('Error adding flexi network:', error);
    throw new Error('فشل في إضافة شبكة فليكسي جديدة');
  }
}

// تحديث شبكة فليكسي
export async function updateFlexiNetwork(id: string, network: Partial<FlexiNetwork>): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('update_flexi_network', {
      p_network_id: id,
      p_name: network.name,
      p_description: network.description || '',
      p_icon: network.icon || 'Phone',
      p_is_active: network.is_active !== undefined ? network.is_active : true
    });
    
  if (error) {
    console.error('Error updating flexi network:', error);
    throw new Error('فشل في تحديث شبكة الفليكسي');
  }
  
  return data;
}

// حذف شبكة فليكسي
export async function deleteFlexiNetwork(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('delete_flexi_network', {
      p_network_id: id
    });
    
  if (error) {
    console.error('Error deleting flexi network:', error);
    throw new Error('فشل في حذف شبكة الفليكسي');
  }
  
  return data;
}

// الحصول على أرصدة الفليكسي
export async function getFlexiBalances(forceOrganizationId?: string): Promise<FlexiBalance[]> {
  try {
    // استخدام وظيفة RPC الجديدة التي تتجاوز سياسات RLS
    const { data, error } = await supabase
      .rpc('get_all_flexi_balances');
      
    if (error) {
      console.error('Error fetching flexi balances:', error);
      throw new Error('فشل في الحصول على أرصدة الفليكسي');
    }
    
    if (!data || data.length === 0) {
      console.warn('لم يتم استلام أي بيانات من وظيفة get_all_flexi_balances');
      return [];
    }
    
    console.log(`تم استلام ${data.length} سجل من قاعدة البيانات`);
    
    // محاولة الحصول على معرف المنظمة بعدة طرق
    let organizationId = forceOrganizationId;
    
    if (!organizationId) {
      // محاولة 1: من التخزين المحلي
      organizationId = localStorage.getItem('organization_id') || '';
      
      // محاولة 2: من جلسة المستخدم (إذا كان متاحًا)
      if (!organizationId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user;
          if (user) {
            organizationId = 
              user.user_metadata?.organization_id || 
              (user as any)?.organization_id ||
              user.app_metadata?.organization_id;
          }
        } catch (e) {
          console.warn('فشل في استرجاع جلسة المستخدم:', e);
        }
      }
      
      // محاولة 3: المعرف الافتراضي
      if (!organizationId) {
        organizationId = "7519afc0-d068-4235-a0f2-f92935772e0c"; 
        console.warn('استخدام معرف المنظمة الافتراضي:', organizationId);
      }
    }
    
    console.log('معرف المنظمة المستخدم لتصفية الأرصدة:', organizationId);
    
    // تجميع جميع معرفات المنظمات الموجودة في البيانات
    const availableOrganizations = new Set(data.map(b => b.organization_id));
    console.log('المنظمات المتاحة في البيانات:', Array.from(availableOrganizations));
    
    // 1. فلترة الأرصدة بحسب المنظمة
    let orgBalances = data.filter(b => b.organization_id === organizationId);
    
    // إذا لم نجد أي أرصدة للمنظمة المحددة، نظهر جميع الأرصدة بدلاً من إرجاع مصفوفة فارغة
    if (orgBalances.length === 0) {
      console.warn(`لم يتم العثور على أي أرصدة للمنظمة [${organizationId}]. عرض جميع الأرصدة بدلاً من ذلك.`);
      orgBalances = data; // استخدام جميع البيانات بدلاً من الفلترة
    }
    
    // 2. بناء قائمة بأحدث سجل لكل شبكة
    const latestBalances = new Map<string, FlexiBalance>();
    
    // فرز الأرصدة بتاريخ التحديث تنازليًا (الأحدث أولاً)
    orgBalances.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    
    // أخذ أول سجل لكل شبكة فقط (وهو الأحدث بسبب الفرز السابق)
    for (const balance of orgBalances) {
      if (!latestBalances.has(balance.network_id)) {
        latestBalances.set(balance.network_id, balance);
      }
    }
    
    const result = Array.from(latestBalances.values());
    console.log(`تم تصفية الأرصدة: ${result.length} سجل من أصل ${data.length} سجل كلي`);
    
    // طباعة الأرصدة للتحقق
    if (result.length > 0) {
      const networks = result.map(b => `${b.network_id}: ${b.balance}`).join(', ');
      console.log(`الأرصدة النهائية: ${networks}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error in getFlexiBalances:', error);
    throw error;
  }
}

// تحديث رصيد الفليكسي
export async function updateFlexiBalance(networkId: string, newBalance: number, organizationId: string): Promise<void> {
  // استخدام وظيفة RPC الجديدة التي تتجاوز سياسات RLS
  const { data, error } = await supabase
    .rpc('manage_flexi_balance', {
      p_network_id: networkId,
      p_balance: newBalance,
      p_organization_id: organizationId
    });
      
  if (error) {
    console.error('Error updating flexi balance:', error);
    throw new Error('فشل في تحديث رصيد الفليكسي');
  }
  
  console.log('تم تحديث الرصيد بنجاح، معرف السجل:', data);
}

// الحصول على مبيعات الفليكسي
export async function getFlexiSales(limit: number = 10, offset: number = 0): Promise<{ data: FlexiSale[], count: number }> {
  const { data, error, count } = await supabase
    .from('flexi_sales')
    .select('*, network:flexi_networks(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) {
    console.error('Error fetching flexi sales:', error);
    throw new Error('فشل في الحصول على مبيعات الفليكسي');
  }
  
  return { data: data || [], count: count || 0 };
}

// إضافة عملية بيع فليكسي
export async function addFlexiSale(sale: Partial<FlexiSale>): Promise<FlexiSale> {
  try {
    // استخدام وظيفة RPC التي تتجاوز سياسات RLS
    const { data, error } = await supabase
      .rpc('add_flexi_sale', {
        p_network_id: sale.network_id,
        p_amount: sale.amount,
        p_phone_number: sale.phone_number || null,
        p_status: sale.status || 'completed',
        p_notes: sale.notes || null,
        p_created_by: sale.created_by || null,
        p_organization_id: sale.organization_id
      });
      
    if (error) {
      console.error('Error adding flexi sale:', error);
      throw new Error('فشل في إضافة عملية بيع الفليكسي');
    }
    
    // إنشاء كائن المبيعات من البيانات المرسلة بدلاً من محاولة استرجاعها
    const saleData: FlexiSale = {
      id: data as string, // نفترض أن وظيفة RPC تعيد معرف UUID
      network_id: sale.network_id!,
      amount: sale.amount!,
      phone_number: sale.phone_number || null,
      status: (sale.status as 'pending' | 'completed' | 'failed') || 'completed',
      notes: sale.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: sale.created_by || null,
      organization_id: sale.organization_id!
    };
    
    return saleData;
  } catch (error) {
    console.error('Error adding flexi sale:', error);
    throw new Error('فشل في إضافة عملية بيع الفليكسي');
  }
}

// تحديث حالة عملية بيع فليكسي
export async function updateFlexiSaleStatus(id: string, status: 'pending' | 'completed' | 'failed', notes?: string) {
  const updateData: Partial<FlexiSale> = { status };
  if (notes) updateData.notes = notes;
  
  const { data, error } = await supabase
    .from('flexi_sales')
    .update(updateData)
    .eq('id', id)
    .select();
    
  if (error) throw error;
  return data[0] as FlexiSale;
}

// استرجاع عملية بيع فليكسي (في حالة الفشل)
export async function refundFlexiSale(id: string) {
  // الحصول على بيانات العملية
  const { data: sale } = await supabase
    .from('flexi_sales')
    .select('*')
    .eq('id', id)
    .single();
    
  if (!sale) {
    throw new Error('العملية غير موجودة');
  }
  
  if (sale.status === 'failed') {
    throw new Error('تم استرجاع هذه العملية مسبقاً');
  }
  
  // تحديث حالة العملية
  const { error: saleError } = await supabase
    .from('flexi_sales')
    .update({ status: 'failed', notes: 'تم استرجاع المبلغ' })
    .eq('id', id);
    
  if (saleError) throw saleError;
  
  // إعادة المبلغ إلى الرصيد
  const { data: balanceData } = await supabase
    .from('flexi_balances')
    .select('balance')
    .eq('network_id', sale.network_id)
    .single();
    
  const newBalance = (balanceData?.balance || 0) + sale.amount;
  const { error: balanceError } = await supabase
    .from('flexi_balances')
    .update({ balance: newBalance, updated_at: new Date() })
    .eq('network_id', sale.network_id);
    
  if (balanceError) throw balanceError;
  
  return true;
}

// الحصول على إحصائيات الفليكسي
export async function getFlexiStats(): Promise<any[]> {
  const { data, error } = await supabase
    .rpc('get_flexi_stats');
    
  if (error) {
    console.error('Error fetching flexi stats:', error);
    throw new Error('فشل في الحصول على إحصائيات الفليكسي');
  }
  
  return data || [];
}

// حذف رصيد فليكسي
export async function deleteFlexiBalance(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('delete_flexi_balance', {
      p_balance_id: id
    });
    
  if (error) {
    console.error('Error deleting flexi balance:', error);
    throw new Error('فشل في حذف رصيد الفليكسي');
  }
  
  return data;
} 