/**
 * 🎯 Smart Provider Wrapper - Types & Interfaces
 * تعريفات شاملة ومحسنة لنظام الـ Provider الذكي
 */

import { ReactNode } from 'react';

/**
 * 🎯 أنواع الصفحات المدعومة في النظام
 */
export type PageType = 
  | 'public-product'    // صفحات المنتجات العامة (خفيفة ومحسنة)
  | 'public-store'      // صفحات المتجر العامة (متوسطة الثقل)
  | 'max-store'         // صفحة المتجر Max المحسنة (مليئة بالميزات)
  | 'thank-you'         // صفحة الشكر (خفيفة جداً)
  | 'auth'              // صفحات التسجيل/الدخول (خفيفة)
  | 'dashboard'         // لوحة التحكم (ثقيلة - جميع البيانات)
  | 'public-dashboard'  // لوحة التحكم على النطاقات العامة (بدون بيانات متجر)
  | 'store-editor'      // محرر المتجر (خفيف مع RPC مخصص)
  | 'pos'               // نقطة البيع (متوسطة مع تطبيقات)
  | 'pos-orders'        // صفحات طلبيات نقطة البيع (محسنة مع RPC واحد)
  | 'super-admin'       // الإدارة العليا (خفيفة مع أمان)
  | 'call-center'       // مركز الاتصال (متوسطة مع بيانات العملاء)
  | 'landing'           // صفحات الهبوط (خفيفة مع معلومات المؤسسة)
  | 'minimal';          // صفحات بسيطة أخرى (أخف ما يمكن)

/**
 * 🔧 تكوين الـ Providers لكل نوع صفحة
 */
export interface ProviderConfig {
  // ⭐ Providers أساسية (QueryClient, Tooltip, I18n, إلخ)
  core: boolean;
  
  // 🔐 المصادقة والمستخدمين
  auth: boolean;
  
  // 🏢 المؤسسة والمستأجر
  tenant: boolean;
  
  // 📊 البيانات الشاملة (SuperUnified - ثقيل)
  unifiedData: boolean;
  
  // 🏬 بيانات المؤسسة (OrganizationData)
  organizationData: boolean;
  
  // 📈 لوحة التحكم (Dashboard-specific)
  dashboard: boolean;
  
  // 🛒 المتجر والتسوق (Shop + Store)
  shop: boolean;
  
  // 📱 التطبيقات (Apps)
  apps: boolean;
  
  // 🔔 الإشعارات (Notifications)
  notifications?: boolean;
  
  // 🎯 مزودات محسنة متخصصة
  productPage?: boolean;    // محسن للمنتجات فقط
  storePage?: boolean;      // محسن لصفحات المتجر
  productsPage?: boolean;   // محسن لصفحة المنتجات
}

/**
 * 📱 معلومات النطاق والدومين
 */
export interface DomainInfo {
  hostname: string;
  isLocalhost: boolean;
  subdomain: string | null;
  customDomain: string | null;
  isPlatformDomain: boolean;
}

/**
 * 📊 مقاييس الأداء
 */
export interface PerformanceMetrics {
  totalRenders: number;
  totalDuplicates: number;
  averageTime: number;
  warnings: string[];
  currentPageType: PageType | null;
  lastRenderDuration: number;
}

/**
 * 🎯 خصائص الـ Wrapper الرئيسي
 */
export interface SmartProviderWrapperProps {
  children: ReactNode;
}

/**
 * 🔧 تكوين نظام التحسين
 */
export interface OptimizationConfig {
  enableMemoization: boolean;
  enableFontOptimization: boolean;
  enableDuplicateDetection: boolean;
  maxConcurrentRequests: number;
}

/**
 * 🎨 خصائص الـ Theme Provider
 */
export interface ThemeProviderWrapperProps {
  children: ReactNode;
}

/**
 * 🔍 نتيجة تحديد نوع الصفحة
 */
export interface PageTypeResult {
  pageType: PageType;
  config: ProviderConfig;
  domainInfo: DomainInfo;
  cached: boolean;
}

/**
 * 📋 تكوينات الصفحات المحددة مسبقاً
 */
export type ProviderConfigMap = Record<PageType, ProviderConfig>;

/**
 * 🚨 أنواع تحذيرات الأداء
 */
export type PerformanceWarningType = 
  | 'DUPLICATE_WRAPPER_RENDER'
  | 'SLOW_USEEFFECT'
  | 'SLOW_PAGE_TYPE_DETERMINATION'
  | 'SLOW_PROVIDERS_CREATION'
  | 'VERY_SLOW_WRAPPER'
  | 'FONT_OPTIMIZATION_SLOW'
  | 'MEMORY_LEAK_DETECTED';

/**
 * 📊 بيانات تحذير الأداء
 */
export interface PerformanceWarning {
  type: PerformanceWarningType;
  data: any;
  timestamp: number;
  pageType?: PageType;
  pathname?: string;
}

/**
 * 🔄 معلومات الـ Cache
 */
export interface CacheInfo {
  lastRenderedPageType: PageType | null;
  lastRenderedPathname: string | null;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * 🎯 خيارات الرندر
 */
export interface RenderOptions {
  skipDuplicateCheck?: boolean;
  forceRerender?: boolean;
  enableDebugMode?: boolean;
}

/**
 * 📱 معلومات السياق للصفحة
 */
export interface PageContext {
  pathname: string;
  search: string;
  pageType: PageType;
  domainInfo: DomainInfo;
  isFirstRender: boolean;
  renderCount: number;
}
