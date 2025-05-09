import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface ComponentPreviewProps {
  type: string;
  settings: any;
}

const ComponentPreview: React.FC<ComponentPreviewProps> = ({ type, settings }) => {
  // تحويل النوع إلى حروف صغيرة لمقارنة غير حساسة لحالة الأحرف
  const normalizedType = type.toLowerCase();
  
  // صورة بديلة محلية بدلاً من استخدام خدمة خارجية
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YzZjRmNiIvPjxwYXRoIGQ9Ik0zMTAuNSAyMTkuNUwzNjUuNSAxNzVMMzc0LjUgMTgzLjVMNDAwIDIwM0w0NjkgMTQ5LjVMNDk2LjUgMTc1TDUyNS41IDE0Ni41TDUzNC41IDE2My41TDYwMCAyMzAuNUw0MDAgMjgwTDMxMC41IDIxOS41WiIgZmlsbD0iI2UyZThmMCIvPjxjaXJjbGUgY3g9IjM0NyIgY3k9IjE0NiIgcj0iMTgiIGZpbGw9IiNlMmU4ZjAiLz48cGF0aCBkPSJNMjM4LjUgMjQ5LjVDMjM4LjUgMjQ5LjUgMjYwLjUgMjA1IDMwMi41IDE5NC41QzM0NC41IDE4NCA0MDAuNSAyMTMgNDAwLjUgMjEzTDIzOC41IDI1NS41VjI0OS41WiIgZmlsbD0iI2UyZThmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjOTQ5NDk0Ij7LktmI2LHYqSDYp9mE2K7ZhNmB2YrYqTwvdGV4dD48L3N2Zz4=';

  switch (normalizedType) {
    case 'hero':
      return (
        <div className="relative rounded-lg overflow-hidden border">
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30 z-10"></div>
          <img 
            src={settings.imageUrl || fallbackImage} 
            alt="معاينة" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 z-20 flex flex-col justify-center p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">{settings.title || 'عنوان الهيرو'}</h2>
            <p className="mb-4 text-sm opacity-90">{settings.description || 'وصف القسم يظهر هنا'}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                {settings.primaryButton?.text || 'زر رئيسي'}
              </Button>
              <Button size="sm" variant="outline" className="text-white border-white hover:bg-white/20">
                {settings.secondaryButton?.text || 'زر ثانوي'}
              </Button>
            </div>
            {settings.trustBadges && settings.trustBadges.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {settings.trustBadges.map((badge: any, i: number) => (
                  <div key={i} className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-1">
                    <Check className="w-3 h-3" /> 
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    
    case 'categorysection':
    case 'productcategories':
      return (
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">{settings.title || 'عرض الفئات'}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{settings.description || 'استعرض تشكيلة منتجاتنا حسب الفئات'}</p>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: Math.min(settings.displayCount || settings.maxCategories || 3, 6) }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="aspect-[4/3] bg-muted"></div>
                <div className="p-3">
                  <h3 className="text-sm font-medium">فئة {i + 1}</h3>
                  {settings.showDescription && (
                    <p className="text-xs text-muted-foreground mt-1">وصف مختصر للفئة</p>
                  )}
                  {settings.showProductCount && (
                    <p className="text-xs font-medium mt-2">{Math.floor(Math.random() * 30)} منتج</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {settings.enableViewAll && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm">عرض جميع الفئات</Button>
            </div>
          )}
        </div>
      );
    
    case 'featuredproducts':
      return (
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">{settings.title || 'منتجات مميزة'}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{settings.description || 'اكتشف منتجاتنا المميزة المختارة خصيصاً لك'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: Math.min(settings.displayCount || 4, 4) }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="aspect-square bg-muted"></div>
                <div className="p-3">
                  <h3 className="text-sm font-medium">منتج {i + 1}</h3>
                  <p className="text-xs text-muted-foreground mt-1">وصف مختصر للمنتج</p>
                  <p className="text-sm font-medium mt-2">{(99.99 * (i + 1)).toFixed(2)} دج</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    
    case 'customertestimonials':
      return (
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">{settings.title || 'آراء العملاء'}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{settings.description || 'استمع إلى تجارب عملائنا الحقيقية مع منتجاتنا وخدماتنا'}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(settings.testimonials || []).slice(0, Math.min(settings.visibleCount || 3, 3)).map((testimonial: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border ${settings.cardStyle === 'elevated' ? 'shadow-md' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium overflow-hidden">
                    {testimonial.customerAvatar ? (
                      <img 
                        src={testimonial.customerAvatar} 
                        alt={testimonial.customerName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      testimonial.customerName.substring(0, 2)
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{testimonial.customerName}</h3>
                    {testimonial.verified && (
                      <span className="text-xs text-green-600">عميل موثق</span>
                    )}
                  </div>
                </div>
                <p className="text-sm mb-3">{testimonial.comment}</p>
                {testimonial.productName && (
                  <div className="text-xs text-muted-foreground mt-2">
                    عن منتج: {testimonial.productName}
                  </div>
                )}
              </div>
            ))}
            {(!settings.testimonials || settings.testimonials.length === 0) && (
              Array.from({ length: Math.min(settings.visibleCount || 3, 3) }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10"></div>
                    <div>
                      <div className="h-4 w-24 bg-muted rounded"></div>
                      <div className="h-3 w-16 bg-muted/50 rounded mt-1"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted rounded"></div>
                    <div className="h-4 w-5/6 bg-muted rounded"></div>
                    <div className="h-4 w-4/6 bg-muted rounded"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    
    case 'about':
      return (
        <div className="border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold mb-1">{settings.title || 'عن المتجر'}</h2>
              <h3 className="text-lg text-muted-foreground mb-3">{settings.subtitle || 'تعرف علينا أكثر'}</h3>
              <p className="text-sm mb-4">{settings.description || 'هنا نص وصفي عن المتجر وقصته ورسالته وقيمه. يمكن استخدام هذا النص لبناء الثقة مع العملاء وتعريفهم بالمتجر بشكل أفضل.'}</p>
              
              {settings.storeInfo && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {settings.storeInfo.yearFounded && (
                    <div className="p-3 bg-muted/30 rounded-md">
                      <div className="text-lg font-bold text-primary">{settings.storeInfo.yearFounded}</div>
                      <div className="text-xs text-muted-foreground">سنة التأسيس</div>
                    </div>
                  )}
                  {settings.storeInfo.customersCount > 0 && (
                    <div className="p-3 bg-muted/30 rounded-md">
                      <div className="text-lg font-bold text-primary">{settings.storeInfo.customersCount}+</div>
                      <div className="text-xs text-muted-foreground">عميل سعيد</div>
                    </div>
                  )}
                  {settings.storeInfo.productsCount > 0 && (
                    <div className="p-3 bg-muted/30 rounded-md">
                      <div className="text-lg font-bold text-primary">{settings.storeInfo.productsCount}+</div>
                      <div className="text-xs text-muted-foreground">منتج متنوع</div>
                    </div>
                  )}
                  {settings.storeInfo.branches > 0 && (
                    <div className="p-3 bg-muted/30 rounded-md">
                      <div className="text-lg font-bold text-primary">{settings.storeInfo.branches}</div>
                      <div className="text-xs text-muted-foreground">فروع في الجزائر</div>
                    </div>
                  )}
                </div>
              )}
              
              {settings.features && settings.features.length > 0 && (
                <div className="space-y-2 mt-4">
                  {settings.features.map((feature: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              {settings.image && (
                <img 
                  src={settings.image} 
                  alt="عن المتجر" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      );
      
    case 'countdownoffers':
      return (
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-bold mb-2">{settings.title || 'عروض محدودة بوقت'}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{settings.subtitle || 'تسوق الآن قبل انتهاء العروض الحصرية'}</p>
          
          <div className={settings.layout === 'slider' ? 'flex overflow-x-auto gap-4' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
            {settings.offers && settings.offers.length > 0 ? (
              settings.offers.slice(0, Math.min(settings.maxItems || 3, 6)).map((offer: any, i: number) => (
                <div key={i} className="rounded-lg border shadow-sm overflow-hidden">
                  <div className="relative">
                    <div className="aspect-[5/3] bg-muted">
                      {offer.productImage && (
                        <img 
                          src={offer.productImage} 
                          alt={offer.productName} 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="absolute top-2 start-2 bg-red-600 text-white text-xs px-2 py-1 rounded-sm">
                      خصم {offer.discountPercentage}%
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium">{offer.productName || `منتج ${i + 1}`}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-red-600">{offer.discountedPrice} {settings.currency}</span>
                      <span className="text-sm text-muted-foreground line-through">{offer.originalPrice} {settings.currency}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center text-xs mt-3">
                      <div className="bg-gray-100 p-1 rounded-md">
                        <div className="font-mono font-bold">1</div>
                        <div className="text-muted-foreground">يوم</div>
                      </div>
                      <div className="bg-gray-100 p-1 rounded-md">
                        <div className="font-mono font-bold">12</div>
                        <div className="text-muted-foreground">ساعة</div>
                      </div>
                      <div className="bg-gray-100 p-1 rounded-md">
                        <div className="font-mono font-bold">36</div>
                        <div className="text-muted-foreground">دقيقة</div>
                      </div>
                      <div className="bg-gray-100 p-1 rounded-md">
                        <div className="font-mono font-bold">45</div>
                        <div className="text-muted-foreground">ثانية</div>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-3">{settings.buttonText || 'تسوق الآن'}</Button>
                  </div>
                </div>
              ))
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border shadow-sm overflow-hidden">
                  <div className="aspect-[5/3] bg-muted"></div>
                  <div className="p-3">
                    <div className="h-5 w-2/3 bg-muted rounded"></div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-4 w-16 bg-red-100 rounded"></div>
                      <div className="h-3 w-12 bg-muted rounded"></div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-3">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="bg-gray-100 p-1 rounded-md h-12"></div>
                      ))}
                    </div>
                    <div className="h-8 w-full bg-primary/20 rounded mt-3"></div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {settings.showViewAll && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">عرض جميع العروض</Button>
            </div>
          )}
        </div>
      );
      
    default:
      return (
        <div className="flex items-center justify-center h-40 bg-muted rounded-md">
          <p className="text-muted-foreground">المعاينة غير متوفرة لهذا النوع من المكونات ({type})</p>
        </div>
      );
  }
};

export default ComponentPreview; 