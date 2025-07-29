import React, { useState, useEffect } from 'react';
import { Star, StarHalf, Loader2 } from 'lucide-react';
import './testimonials.css';
import { supabase } from '@/lib/supabase';

export interface TestimonialItem {
  id: string;
  name: string;
  role?: string;
  avatar: string;
  comment: string;
  rating: number;
}

export interface TestimonialsSettings {
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  cardsBackgroundColor: string;
  cardsTextColor: string;
  layout: 'grid' | 'carousel' | 'masonry';
  columns: number;
  showRatings: boolean;
  showAvatars: boolean;
  avatarSize: 'small' | 'medium' | 'large';
  animation: 'none' | 'fade' | 'slide';
  items: TestimonialItem[];
  useDbTestimonials?: boolean;
  organizationId?: string;
}

interface TestimonialsComponentProps {
  settings: TestimonialsSettings;
  className?: string;
}

export const TestimonialsComponent: React.FC<TestimonialsComponentProps> = ({
  settings,
  className = '',
}) => {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(settings.items || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch testimonials from the database if useDbTestimonials is true
  useEffect(() => {
    if (settings.useDbTestimonials && settings.organizationId) {
      fetchDbTestimonials();
    } else {
      setTestimonials(settings.items || []);
    }
  }, [settings.useDbTestimonials, settings.organizationId, settings.items]);

  const fetchDbTestimonials = async () => {
    if (!settings.organizationId) return;
    
    setIsLoading(true);
    try {
      // 🚀 محاولة استخدام البيانات المحفوظة من appInitializer أولاً
      const { getAppInitData } = await import('@/lib/appInitializer');
      const appData = getAppInitData();
      
      if (appData?.testimonials && appData.testimonials.length > 0) {
        console.log('✅ [TestimonialsComponent] استخدام البيانات المحفوظة من appInitializer:', appData.testimonials.length);
        const mappedItems: TestimonialItem[] = appData.testimonials.map((item: any) => ({
          id: item.id,
          name: item.customer_name,
          role: item.product_name || '',
          avatar: item.customer_avatar || '',
          comment: item.comment,
          rating: item.rating
        }));
        
        setTestimonials(mappedItems);
        setIsLoading(false);
        return;
      }
      
      // 🔄 إذا لم تتوفر البيانات المحفوظة، جلب من قاعدة البيانات مع التنسيق
      console.log('🔄 [TestimonialsComponent] جلب من قاعدة البيانات مع التنسيق');
      const { coordinateRequest } = await import('@/lib/api/requestCoordinator');
      
      const data = await coordinateRequest(
        'customer_testimonials',
        { 
          organization_id: settings.organizationId,
          is_active: true,
          order: 'created_at.desc'
        },
        async () => {
          const { data, error } = await supabase
            .from('customer_testimonials')
            .select('*')
            .eq('organization_id', settings.organizationId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          return data;
        },
        'TestimonialsComponent'
      );
      
      if (data) {
        const mappedItems: TestimonialItem[] = data.map((item: any) => ({
          id: item.id,
          name: item.customer_name,
          role: item.product_name || '',
          avatar: item.customer_avatar || '',
          comment: item.comment,
          rating: item.rating
        }));
        
        setTestimonials(mappedItems);
      }
    } catch (err) {
      console.error('❌ [TestimonialsComponent] خطأ في جلب الشهادات:', err);
      setError('Failed to load testimonials');
      // Fallback to local items
      setTestimonials(settings.items || []);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const starsArray = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      starsArray.push(
        <Star
          key={`star-${i}`}
          className="text-yellow-500"
          fill="currentColor"
          size={16}
        />
      );
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      starsArray.push(
        <StarHalf
          key="half-star"
          className="text-yellow-500"
          fill="currentColor"
          size={16}
        />
      );
    }
    
    // Add empty stars
    const emptyStars = 5 - starsArray.length;
    for (let i = 0; i < emptyStars; i++) {
      starsArray.push(
        <Star
          key={`empty-star-${i}`}
          className="text-gray-300"
          size={16}
        />
      );
    }
    
    return starsArray;
  };
  
  const getLayoutClassName = () => {
    switch (settings.layout) {
      case 'carousel':
        return 'testimonials-carousel';
      case 'masonry':
        return 'testimonials-masonry';
      case 'grid':
      default:
        return `testimonials-grid grid-cols-1 sm:grid-cols-2 ${
          settings.columns >= 3 ? `md:grid-cols-${Math.min(settings.columns, 4)}` : ''
        }`;
    }
  };
  
  const getAvatarSizeClass = () => {
    switch (settings.avatarSize) {
      case 'small':
        return 'w-12 h-12';
      case 'large':
        return 'w-20 h-20';
      case 'medium':
      default:
        return 'w-16 h-16';
    }
  };
  
  const getAnimationClass = () => {
    switch (settings.animation) {
      case 'fade':
        return 'animate-fade-in';
      case 'slide':
        return 'animate-slide-in';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div 
        className="testimonials-component w-full py-12 px-4 flex justify-center items-center"
        style={{
          backgroundColor: settings.backgroundColor,
          color: settings.textColor,
          minHeight: '200px'
        }}
      >
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    );
  }

  if (error) {
    // Silently render with local items instead of showing error
  }

  return (
    <div
      className={`testimonials-component w-full py-12 px-4 ${className}`}
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
      }}
    >
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 
            className="text-3xl font-bold mb-4"
            style={{ color: settings.textColor }}
          >
            {settings.title}
          </h2>
          {settings.subtitle && (
            <p 
              className="text-lg opacity-80"
              style={{ color: settings.textColor }}
            >
              {settings.subtitle}
            </p>
          )}
        </div>
        
        {/* Testimonials */}
        <div className={`${getLayoutClassName()} gap-6 ${getAnimationClass()}`}>
          {testimonials.length > 0 ? testimonials.map((item) => (
            <div
              key={item.id}
              className="testimonial-card p-6 rounded-lg shadow-md transition-transform hover:shadow-lg hover:-translate-y-1"
              style={{
                backgroundColor: settings.cardsBackgroundColor,
                color: settings.cardsTextColor,
                borderColor: settings.accentColor,
              }}
            >
              {/* Testimonial content */}
              <div className="mb-4 font-medium italic relative">
                <span className="text-5xl absolute -top-4 -right-2 opacity-20" style={{ color: settings.accentColor }}>
                  "
                </span>
                <p className="relative">{item.comment}</p>
              </div>
              
              {/* Rating */}
              {settings.showRatings && (
                <div className="flex items-center mb-4">
                  {renderStars(item.rating)}
                </div>
              )}
              
              {/* Customer info */}
              <div className="flex items-center">
                {settings.showAvatars && item.avatar && (
                  <div className={`${getAvatarSizeClass()} mr-4 rounded-full overflow-hidden flex-shrink-0`}>
                    <img
                      src={item.avatar}
                      alt={`صورة ${item.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h4 className="font-bold">{item.name}</h4>
                  {item.role && (
                    <p className="text-sm opacity-80">{item.role}</p>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center p-8">
              <p className="text-lg opacity-70">لم يتم إضافة أي تقييمات بعد.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsComponent;
