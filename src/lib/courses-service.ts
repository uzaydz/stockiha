import { supabase } from './supabase';
import { ActivationService } from './activation-service';
import { CourseAccess, CoursesAccessType } from '@/types/activation';

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
   * جلب جميع الدورات النشطة
   */
  async getAllCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching courses:', error);
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
      console.error('Error fetching course:', error);
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
      console.error('Error fetching course sections:', error);
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
      console.error('Error fetching section lessons:', error);
      return [];
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
      console.error('Error checking course access:', error);
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
      console.error('Error checking subscription access:', error);
      return null;
    }
  },

  /**
   * جلب جميع الدورات مع معلومات الوصول
   */
  async getCoursesWithAccess(organizationId: string): Promise<CourseWithAccess[]> {
    try {
      // جلب جميع الدورات
      const courses = await this.getAllCourses();
      
      // جلب معلومات الوصول لجميع الدورات
      const accessPromises = courses.map(course => 
        this.checkCourseAccess(course.id, organizationId)
      );
      
      const accessResults = await Promise.all(accessPromises);
      
      // دمج المعلومات
      return courses.map((course, index) => {
        const access = accessResults[index];
        
        return {
          ...course,
          access_type: access?.access_type,
          is_accessible: access?.is_accessible || false,
          expires_at: access?.expires_at,
          is_lifetime: access?.is_lifetime || false
        };
      });
    } catch (error) {
      console.error('Error fetching courses with access:', error);
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
      console.error('Error fetching accessible courses:', error);
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
      console.error('Error fetching lifetime courses:', error);
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
          granted_by: (await supabase.auth.getUser()).data.user?.id,
          notes: 'تم منح الوصول تلقائياً'
        });
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error granting course access:', error);
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
      
      return true;
    } catch (error) {
      console.error('Error revoking course access:', error);
      return false;
    }
  }
};
