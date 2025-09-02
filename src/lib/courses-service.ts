import { supabase } from './supabase';
import { CoursesAccessType } from '@/types/activation';

// Cache للبيانات
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

const coursesCache = new SimpleCache();

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CourseLesson {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  video_url?: string;
  video_type?: string;
  duration?: number;
  order_index?: number;
  is_active?: boolean;
  is_free?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CourseWithAccess extends Course {
  access_type?: CoursesAccessType;
  is_accessible?: boolean;
  expires_at?: string;
  is_lifetime?: boolean;
}

export interface CourseAccessInfo {
  course_id: string;
  access_type: CoursesAccessType;
  is_accessible: boolean;
  expires_at?: string;
  is_lifetime: boolean;
  granted_at: string;
}

/**
 * خدمة إدارة الدورات مع فحص الوصول
 */
export const CoursesService = {
  /**
   * جلب جميع الدورات النشطة مع Cache
   */
  async getAllCourses(): Promise<Course[]> {
    const cacheKey = 'all_courses';
    
    // تحقق من الـ Cache أولاً
    const cachedData = coursesCache.get<Course[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      const courses = data || [];
      
      // حفظ في الـ Cache
      coursesCache.set(cacheKey, courses, 10 * 60 * 1000); // 10 minutes
      
      return courses;
    } catch (error) {
      return [];
    }
  },

  /**
   * جلب دورة محددة
   */
  async getCourseBySlug(slug: string): Promise<Course | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      return null;
    }
  },

  /**
   * جلب أقسام الدورة
   */
  async getCourseSections(courseId: string): Promise<CourseSection[]> {
    try {
      const { data, error } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * جلب دروس القسم
   */
  async getSectionLessons(sectionId: string): Promise<CourseLesson[]> {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('section_id', sectionId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * جلب جميع معلومات الوصول للدورات في استدعاء واحد
   */
  async getAllCourseAccessInfo(organizationId: string): Promise<Map<string, CourseAccessInfo>> {
    try {
      // جلب جميع معلومات الوصول المباشر للدورات
      const { data: directAccess, error: directError } = await supabase
        .from('organization_course_access')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (directError) throw directError;
      
      // جلب معلومات الاشتراك
      const { data: subscription, error: subError } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();
      
      if (subError && subError.code !== 'PGRST116') {
        throw subError;
      }
      
      const accessMap = new Map<string, CourseAccessInfo>();
      
      // معالجة الوصول المباشر
      if (directAccess) {
        for (const access of directAccess) {
          const is_expired = access.expires_at ? new Date(access.expires_at) < new Date() : false;
          
          accessMap.set(access.course_id, {
            course_id: access.course_id,
            access_type: access.access_type as CoursesAccessType,
            is_accessible: !is_expired,
            expires_at: access.expires_at,
            is_lifetime: access.expires_at === null,
            granted_at: access.granted_at
          });
        }
      }
      
      // معالجة الوصول عبر الاشتراك
      if (subscription) {
        const subscriptionAccess: CourseAccessInfo = {
          course_id: '', // سيتم تعيينه لكل دورة
          access_type: subscription.lifetime_courses_access ? CoursesAccessType.LIFETIME : CoursesAccessType.STANDARD,
          is_accessible: new Date(subscription.end_date) > new Date(),
          expires_at: subscription.end_date,
          is_lifetime: subscription.lifetime_courses_access || false,
          granted_at: subscription.start_date
        };
        
        // تطبيق الوصول عبر الاشتراك على جميع الدورات التي ليس لها وصول مباشر
        const courses = await this.getAllCourses();
        for (const course of courses) {
          if (!accessMap.has(course.id)) {
            accessMap.set(course.id, {
              ...subscriptionAccess,
              course_id: course.id
            });
          }
        }
      }
      
      return accessMap;
    } catch (error) {
      return new Map();
    }
  },

  /**
   * فحص الوصول للدورة لمؤسسة معينة
   */
  async checkCourseAccess(courseId: string, organizationId: string): Promise<CourseAccessInfo | null> {
    try {
      // جلب معلومات الوصول من جدول organization_course_access
      const { data, error } = await supabase
        .from('organization_course_access')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('course_id', courseId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (!data) {
        // لا يوجد وصول مسجل، تحقق من الاشتراك
        return this.checkSubscriptionAccess(courseId, organizationId);
      }
      
      // تحقق من انتهاء الصلاحية
      const is_expired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
      
      return {
        course_id: data.course_id,
        access_type: data.access_type as CoursesAccessType,
        is_accessible: !is_expired,
        expires_at: data.expires_at,
        is_lifetime: data.expires_at === null,
        granted_at: data.granted_at
      };
    } catch (error) {
      return null;
    }
  },

  /**
   * فحص الوصول عبر الاشتراك
   */
  async checkSubscriptionAccess(courseId: string, organizationId: string): Promise<CourseAccessInfo | null> {
    try {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();
      
      if (error || !data) {
        return null;
      }
      
      // تحقق من الوصول للدورات مدى الحياة
      if (data.lifetime_courses_access) {
        return {
          course_id: courseId,
          access_type: CoursesAccessType.LIFETIME,
          is_accessible: true,
          expires_at: undefined,
          is_lifetime: true,
          granted_at: data.start_date
        };
      }
      
      // تحقق من تاريخ انتهاء الاشتراك
      const is_expired = new Date(data.end_date) < new Date();
      
      return {
        course_id: courseId,
        access_type: CoursesAccessType.STANDARD,
        is_accessible: !is_expired,
        expires_at: data.end_date,
        is_lifetime: false,
        granted_at: data.start_date
      };
    } catch (error) {
      return null;
    }
  },

  /**
   * جلب جميع الدورات مع معلومات الوصول (محسنة)
   */
  async getCoursesWithAccess(organizationId: string): Promise<CourseWithAccess[]> {
    try {
      // جلب جميع الدورات
      const courses = await this.getAllCourses();
      
      // جلب جميع معلومات الوصول في استدعاء واحد
      const accessMap = await this.getAllCourseAccessInfo(organizationId);
      
      // دمج المعلومات
      return courses.map(course => {
        const access = accessMap.get(course.id);
        
        return {
          ...course,
          access_type: access?.access_type,
          is_accessible: access?.is_accessible || false,
          expires_at: access?.expires_at,
          is_lifetime: access?.is_lifetime || false
        };
      });
    } catch (error) {
      return [];
    }
  },

  /**
   * جلب الدورات المتاحة فقط
   */
  async getAccessibleCourses(organizationId: string): Promise<CourseWithAccess[]> {
    try {
      const coursesWithAccess = await this.getCoursesWithAccess(organizationId);
      return coursesWithAccess.filter(course => course.is_accessible);
    } catch (error) {
      return [];
    }
  },

  /**
   * جلب الدورات مدى الحياة فقط
   */
  async getLifetimeCourses(organizationId: string): Promise<CourseWithAccess[]> {
    try {
      const coursesWithAccess = await this.getCoursesWithAccess(organizationId);
      return coursesWithAccess.filter(course => course.is_lifetime);
    } catch (error) {
      return [];
    }
  },

  /**
   * منح الوصول لدورة معينة
   */
  async grantCourseAccess(
    courseId: string, 
    organizationId: string, 
    accessType: CoursesAccessType = CoursesAccessType.STANDARD,
    expiresAt?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organization_course_access')
        .upsert({
          organization_id: organizationId,
          course_id: courseId,
          access_type: accessType,
          expires_at: expiresAt,
          granted_by: null, // سيتم تعيينه من الخادم
          notes: 'تم منح الوصول تلقائياً'
        });
      
      if (error) throw error;
      
      // مسح الـ Cache المتعلق بهذه المؤسسة
      this.clearCacheForOrganization(organizationId);
      
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * إلغاء الوصول لدورة معينة
   */
  async revokeCourseAccess(courseId: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('organization_course_access')
        .delete()
        .eq('organization_id', organizationId)
        .eq('course_id', courseId);
      
      if (error) throw error;
      
      // مسح الـ Cache المتعلق بهذه المؤسسة
      this.clearCacheForOrganization(organizationId);
      
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * مسح جميع الـ Cache
   */
  clearAllCache(): void {
    coursesCache.clear();
  },

  /**
   * مسح الـ Cache المتعلق بمؤسسة معينة
   */
  clearCacheForOrganization(organizationId: string): void {
    coursesCache.delete(`course_access_${organizationId}`);
    coursesCache.delete(`courses_with_access_${organizationId}`);
  },

  /**
   * الحصول على إحصائيات الـ Cache والأداء
   */
  getCacheStats(): {
    cacheSize: number;
    cacheKeys: string[];
    performance: {
      totalRequests: number;
      cacheHits: number;
      cacheHitRate: string;
    };
  } {
    return {
      cacheSize: coursesCache.size(),
      cacheKeys: coursesCache.keys(),
      performance: {
        totalRequests: 0, // يمكن تطويرها لاحقاً
        cacheHits: 0,     // يمكن تطويرها لاحقاً
        cacheHitRate: '0%' // يمكن تطويرها لاحقاً
      }
    };
  },

  /**
   * دالة مساعدة لقياس الأداء
   */
  async measurePerformance<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    return { result, duration };
  }
};
