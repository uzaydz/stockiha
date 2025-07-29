/**
 * Query Keys موحدة لتجنب الاستدعاءات المكررة
 * 
 * هذا الملف يوحد جميع query keys المستخدمة في التطبيق
 * لضمان عدم تكرار الاستدعاءات لنفس البيانات
 */

export const QueryKeys = {
  // بيانات المؤسسة
  organization: (orgId: string) => ['organization', orgId],
  organizationSettings: (orgId: string) => ['organization-settings', orgId],
  organizationApps: (orgId: string) => ['organization-apps', orgId],
  organizationSubscription: (orgId: string) => ['organization-subscription', orgId],
  
  // بيانات POS
  completePOSData: (orgId: string) => ['complete-pos-data', orgId],
  posSettings: (orgId: string) => ['pos-settings', orgId],
  posOrders: (orgId: string) => ['pos-orders', orgId],
  posOrdersStats: (orgId: string) => ['pos-orders-stats', orgId],
  
  // فئات المنتجات
  productCategories: (orgId: string) => ['product-categories', orgId],
  
  // المنتجات
  products: (orgId: string) => ['products', orgId],
  
  // العملاء
  customers: (orgId: string) => ['customers', orgId],
  
  // الموظفين
  users: (orgId: string) => ['users', orgId],
  
  // الطلبات
  orders: (orgId: string) => ['orders', orgId],
  
  // البيانات الموحدة (لتجنب الاستدعاءات المكررة)
  unifiedData: (orgId: string) => ['unified-data', orgId],
  
  // إعدادات التطبيق
  appInitialization: (domain?: string, subdomain?: string, orgId?: string) => 
    ['app-initialization', domain, subdomain, orgId].filter(Boolean),
  
  // إعدادات الثيم (استخدام نفس key كـ organization settings)
  themeSettings: (orgId: string) => QueryKeys.organizationSettings(orgId),
  
  // خدمات الشحن
  shippingSettings: (orgId: string, providerCode: string) => 
    ['shipping-settings', orgId, providerCode],
} as const;

/**
 * دالة مساعدة للحصول على query key بناءً على النوع
 */
export const getQueryKey = (type: keyof typeof QueryKeys, ...args: any[]) => {
  const keyGenerator = QueryKeys[type] as any;
  if (typeof keyGenerator === 'function') {
    return keyGenerator.apply(null, args);
  }
  return keyGenerator;
};

/**
 * دالة لتحديث جميع query keys المرتبطة بمؤسسة معينة
 */
export const getOrganizationRelatedKeys = (orgId: string) => [
  QueryKeys.organization(orgId),
  QueryKeys.organizationSettings(orgId),
  QueryKeys.organizationApps(orgId),
  QueryKeys.organizationSubscription(orgId),
  QueryKeys.completePOSData(orgId),
  QueryKeys.posSettings(orgId),
  QueryKeys.productCategories(orgId),
  QueryKeys.products(orgId),
  QueryKeys.customers(orgId),
  QueryKeys.users(orgId),
  QueryKeys.orders(orgId),
];

/**
 * دالة لإبطال جميع البيانات المرتبطة بمؤسسة
 */
export const invalidateOrganizationData = async (
  queryClient: any, 
  orgId: string,
  specificKeys?: string[]
) => {
  const keysToInvalidate = specificKeys 
    ? specificKeys.map(key => [key, orgId])
    : getOrganizationRelatedKeys(orgId);
  
  await Promise.all(
    keysToInvalidate.map(key => 
      queryClient.invalidateQueries({ queryKey: key })
    )
  );
};
