import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';
import { monitorStoreComponents, validateStoreComponentsIntegrity } from '@/lib/store-components-monitor';

/**
 * إنشاء مؤسسة باستخدام الوظيفة البسيطة المحسنة
 */
export const createOrganizationSimple = async (
  organizationName: string, 
  subdomain: string, 
  userId: string,
  settings: Record<string, any> = {}
): Promise<{ success: boolean; error: Error | null; organizationId?: string }> => {
  try {

    // استدعاء وظيفة RPC المبسطة
    const { data, error } = await supabaseAdmin.rpc(
      'insert_organization_simple',
      {
        p_name: organizationName,
        p_subdomain: subdomain,
        p_owner_id: userId,
        p_settings: settings
      }
    );

    if (error) {
      return { success: false, error: error as Error };
    }

    if (!data) {
      return { 
        success: false, 
        error: new Error('فشل إنشاء المنظمة: لم يتم استرجاع المعرف')
      };
    }

    // إضافة المكونات الافتراضية للمتجر
    if (data) {
      const componentsResult = await createDefaultStoreComponents(data);
    }

    return { success: true, error: null, organizationId: data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * إنشاء مؤسسة مباشرة بدون استخدام RPC كآلية بديلة
 */
export const createOrganizationDirect = async (
  organizationName: string, 
  subdomain: string, 
  userId: string,
  settings: Record<string, any> = {}
): Promise<{ success: boolean; error: Error | null; organizationId?: string }> => {
  try {
    // 1. التحقق أولاً مما إذا كانت المنظمة موجودة بالفعل بنفس النطاق الفرعي
    const { data: existingOrg, error: checkError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
      
    if (!checkError && existingOrg) {

      // محاولة ربط المستخدم بالمنظمة الموجودة
      try {
        const { error: userUpdateError } = await supabaseAdmin
          .from('users')
          .update({
            organization_id: existingOrg.id,
            is_org_admin: true,
            role: 'admin'
          })
          .eq('id', userId);
          
        if (!userUpdateError) {
          
        }
      } catch (connectError) {
      }
      
      return { success: true, error: null, organizationId: existingOrg.id };
    }
    
    // 2. تحقق إذا كان المستخدم مرتبط بالفعل بمنظمة موجودة (owner_id)
    const { data: existingOwnerOrg, error: ownerCheckError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();
      
    if (!ownerCheckError && existingOwnerOrg) {
      
      return { success: true, error: null, organizationId: existingOwnerOrg.id };
    }
    
    // 3. إنشاء المؤسسة - تجنب استخدام select بعد الإدراج لتجنب مشكلة ON CONFLICT
    const orgData = {
      name: organizationName,
      subdomain: subdomain,
      owner_id: userId,
      subscription_tier: 'trial',
      subscription_status: 'trial',
      settings: settings
    };
    
    // إدراج بدون select
    const { error: insertError } = await supabaseAdmin
      .from('organizations')
      .insert(orgData);

    if (insertError) {

      // في حالة وجود خطأ تكرار البيانات أو ON CONFLICT، نبحث عن المؤسسة الموجودة
      if (insertError.code === '23505' || insertError.code === '42P10') {

        // البحث مرة أخرى باستخدام النطاق الفرعي بعد محاولة الإدراج
        const { data: subData, error: subError } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .maybeSingle();
          
        if (!subError && subData) {
          // تحديث ربط المستخدم بالمنظمة الموجودة
          try {
            await supabaseAdmin
              .from('users')
              .update({
                organization_id: subData.id,
                is_org_admin: true,
                role: 'admin'
              })
              .eq('id', userId);
          } catch (userError) {
            
          }
          
          return { success: true, error: null, organizationId: subData.id };
        }
      }
      
      return { success: false, error: insertError as Error };
    }
    
    // 4. البحث عن معرف المؤسسة المنشأة حديثًا
    const { data: createdOrg, error: searchError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
      
    if (searchError || !createdOrg) {
      return { success: false, error: searchError || new Error('فشل في العثور على المؤسسة المنشأة حديثًا') };
    }
    
    const organizationId = createdOrg.id;

    // 5. إضافة سجل تدقيق
    try {
      await supabaseAdmin
        .from('settings_audit_log')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          setting_type: 'organization',
          setting_key: 'creation',
          action_type: 'INSERT',
          table_name: 'organizations',
          record_id: organizationId,
          new_value: JSON.stringify(orgData),
          old_value: null
        });
    } catch (auditError) {
      // لا نعيد فشل العملية إذا فشل إنشاء سجل التدقيق
    }

    // 6. تحديث المستخدم لجعله مسؤول عن المؤسسة
    try {
      // استخدم UPDATE لتحديث معلومات المستخدم
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          organization_id: organizationId,
          is_org_admin: true,
          role: 'admin'
        })
        .eq('id', userId);

      if (userUpdateError) {
        
        // محاولة الإدراج بدلاً من التحديث
        const { error: userInsertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            organization_id: organizationId,
            is_org_admin: true,
            role: 'admin'
          });
          
        if (userInsertError) {
          // لا نفشل العملية بسبب فشل تحديث المستخدم
        }
      }
    } catch (userError) {
      // لا نفشل العملية بسبب فشل تحديث المستخدم
    }

    // إضافة المكونات الافتراضية للمتجر
    const componentsResult = await createDefaultStoreComponents(organizationId);

    return {
      success: true,
      error: null,
      organizationId: organizationId
    };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * إضافة المكونات الافتراضية للمتجر بعد إنشاء المؤسسة
 */
export const createDefaultStoreComponents = async (organizationId: string): Promise<boolean> => {
  const logPrefix = `[createDefaultStoreComponents-${organizationId}]`;
  
  try {
    // التحقق من وجود المؤسسة أولاً
    const { data: orgCheck, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();
    
    if (orgError || !orgCheck) {
      return false;
    }

    // التحقق من المكونات الموجودة مسبقاً
    const { data: existingComponents, error: checkError } = await supabaseAdmin
      .from('store_settings')
      .select('component_type, order_index')
      .eq('organization_id', organizationId);
    
    if (checkError) {
    } else {
    }

    const defaultComponents = [
      {
        id: uuidv4(),
        organization_id: organizationId,
        component_type: 'hero',
        settings: {
          title: 'أهلاً بك في سطوكيها',
          description: 'تسوق أحدث المنتجات بأفضل الأسعار في الجزائر',
          imageUrl: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
          primaryButton: {
            text: 'تسوق الآن',
            link: '/products'
          },
          secondaryButton: {
            text: 'معلومات أكثر',
            link: '/about'
          },
          primaryButtonStyle: 'primary',
          secondaryButtonStyle: 'primary',
          trustBadges: [
            { id: 'badge1', icon: 'Truck', text: 'شحن سريع' },
            { id: 'badge2', icon: 'ShieldCheck', text: 'ضمان جودة' },
            { id: 'badge3', icon: 'Gem', text: 'خدمة متميزة' }
          ],
          _isVisible: true
        },
        is_active: true,
        order_index: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        organization_id: organizationId,
        component_type: 'categories',
        settings: {
          title: 'تسوق حسب الفئة',
          description: 'استكشف منتجاتنا حسب الفئة',
          layout: 'grid',
          displayCount: 6,
          selectionMethod: 'automatic',
          selectedCategories: [],
          showDescription: true,
          showProductCount: true,
          showImages: true,
          displayStyle: 'cards',
          backgroundStyle: 'light',
          showViewAllButton: true,
          _isVisible: true
        },
        is_active: true,
        order_index: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        organization_id: organizationId,
        component_type: 'featuredproducts',
        settings: {
          title: 'منتجات مميزة',
          description: 'اكتشف مجموعتنا المختارة من المنتجات المميزة',
          displayCount: 4,
          sortBy: 'popularity',
          showRatings: true,
          categoryId: null,
          _isVisible: true
        },
        is_active: true,
        order_index: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        organization_id: organizationId,
        component_type: 'about',
        settings: {
          title: 'عن سطوكيها',
          subtitle: 'متجر إلكتروني جزائري موثوق به منذ سنوات',
          description: 'تأسست سطوكيها بهدف تقديم منتجات عالية الجودة وخدمات متميزة للعملاء في الجزائر. نحن نفخر بتوفير تجربة تسوق سهلة وآمنة مع ضمان أفضل الأسعار والجودة العالية. نلتزم دائمًا بتوفير منتجات أصلية وضمان رضا عملائنا التام.',
          features: [
            'منتجات أصلية بضمان الوكيل',
            'شحن سريع لجميع ولايات الجزائر',
            'دعم فني متخصص',
            'خدمة ما بعد البيع'
          ],
          image: 'https://images.unsplash.com/photo-1612690669207-fed642192c40?q=80&w=1740',
          storeInfo: {
            yearFounded: 2024,
            customersCount: 100,
            productsCount: 50,
            branches: 1
          },
          _isVisible: true
        },
        is_active: true,
        order_index: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        organization_id: organizationId,
        component_type: 'testimonials',
        settings: {
          title: 'آراء عملائنا',
          description: 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا',
          visibleCount: 3,
          backgroundColor: 'default',
          cardStyle: 'default',
          testimonials: undefined,
          _isVisible: true
        },
        is_active: true,
        order_index: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        organization_id: organizationId,
        component_type: 'footer',
        settings: {
          storeName: 'سطوكيها',
          logoUrl: '',
          description: 'متجر إلكتروني جزائري متخصص في بيع أحدث المنتجات التقنية والإلكترونية بأفضل الأسعار وجودة عالية.',
          socialLinks: [
            { platform: 'facebook', url: 'https://facebook.com' },
            { platform: 'twitter', url: 'https://twitter.com' },
            { platform: 'instagram', url: 'https://instagram.com' }
          ],
          contactInfo: {
            phone: '+213 21 123 456',
            email: 'info@stokia.com',
            address: 'الجزائر العاصمة، الجزائر'
          },
          footerSections: [
            {
              id: 'links1',
              title: 'روابط سريعة',
              links: [
                { id: 'home', text: 'الرئيسية', url: '/' },
                { id: 'products', text: 'المنتجات', url: '/products' },
                { id: 'categories', text: 'الفئات', url: '/categories' },
                { id: 'about', text: 'من نحن', url: '/about' }
              ]
            },
            {
              id: 'links2',
              title: 'خدمة العملاء',
              links: [
                { id: 'support', text: 'الدعم الفني', url: '/support' },
                { id: 'contact', text: 'اتصل بنا', url: '/contact' },
                { id: 'faq', text: 'الأسئلة الشائعة', url: '/faq' },
                { id: 'returns', text: 'سياسة الإرجاع', url: '/returns' }
              ]
            }
          ],
          features: [
            {
              id: '1',
              icon: 'Truck',
              title: 'شحن سريع',
              description: 'توصيل مجاني للطلبات +5000 دج'
            },
            {
              id: '2',
              icon: 'CreditCard',
              title: 'دفع آمن',
              description: 'طرق دفع متعددة 100% آمنة'
            },
            {
              id: '3',
              icon: 'Heart',
              title: 'ضمان الجودة',
              description: 'منتجات عالية الجودة معتمدة'
            },
            {
              id: '4',
              icon: 'ShieldCheck',
              title: 'دعم 24/7',
              description: 'مساعدة متوفرة طول اليوم'
            }
          ],
          copyrightText: '',
          showSocialLinks: true,
          showContactInfo: true,
          showFeatures: true,
          showNewsletter: true,
          newsletterSettings: {
            enabled: true,
            title: 'النشرة البريدية',
            description: 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
            placeholder: 'البريد الإلكتروني',
            buttonText: 'اشتراك'
          },
          showPaymentMethods: true,
          paymentMethods: ['visa', 'mastercard', 'paypal', 'mada'],
          legalLinks: [
            { id: 'privacy', text: 'سياسة الخصوصية', url: '/privacy' },
            { id: 'terms', text: 'شروط الاستخدام', url: '/terms' }
          ],
          _isVisible: true
        },
        is_active: true,
        order_index: 6,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    defaultComponents.forEach((comp, index) => {
    });

    // إدراج جميع المكونات الافتراضية مع معلومات مفصلة
    const insertStart = Date.now();
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('store_settings')
      .insert(defaultComponents)
      .select('id, component_type, order_index');

    const insertDuration = Date.now() - insertStart;

    if (insertError) {
      
      // محاولة إدراج المكونات واحد تلو الآخر لتحديد المكون المشكل
      let successCount = 0;
      
      for (let i = 0; i < defaultComponents.length; i++) {
        const component = defaultComponents[i];
        try {
          const { error: singleError } = await supabaseAdmin
            .from('store_settings')
            .insert([component]);
          
          if (singleError) {
          } else {
            successCount++;
          }
        } catch (singleException) {
        }
      }
      
      return successCount > 0;
    }

    if (insertedData) {
      insertedData.forEach(comp => {
      });
    }

    // التحقق النهائي من المكونات المدرجة
    const { data: finalCheck, error: finalError } = await supabaseAdmin
      .from('store_settings')
      .select('component_type, order_index, is_active')
      .eq('organization_id', organizationId)
      .order('order_index');

    if (finalError) {
    } else {
      finalCheck?.forEach(comp => {
      });
    }

    const expectedCount = defaultComponents.length;
    const actualCount = insertedData?.length || 0;
    
    if (actualCount === expectedCount) {
      
      // التحقق النهائي باستخدام أداة المراقبة
      setTimeout(async () => {
        const report = await monitorStoreComponents(organizationId);
      }, 1000);
      
      return true;
    } else {
      
      // إنشاء تقرير مفصل للمشكلة
      setTimeout(async () => {
        const report = await monitorStoreComponents(organizationId);
      }, 1000);
      
      return false;
    }

  } catch (error) {
    return false;
  }
};
