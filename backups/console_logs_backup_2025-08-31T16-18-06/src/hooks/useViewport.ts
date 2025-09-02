import { useState, useEffect } from 'react'

interface ViewportSize {
  width: number
  height: number
}

interface ViewportBreakpoints {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
}

/**
 * Hook للحصول على معلومات viewport الحالية
 * يستخدم للاستجابة للشاشات المختلفة
 */
export const useViewport = (): ViewportSize & ViewportBreakpoints => {
  const [viewport, setViewport] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let ticking = false
    const handleResize = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight
        })
        ticking = false
      })
    }

    // إضافة مستمع الحدث
    window.addEventListener('resize', handleResize, { passive: true } as any)
    
    // تنظيف المستمع عند إلغاء المكون
    return () => {
      window.removeEventListener('resize', handleResize as any)
    }
  }, [])

  // تحديد نقاط التوقف (breakpoints)
  const isMobile = viewport.width < 768
  const isTablet = viewport.width >= 768 && viewport.width < 1024
  const isDesktop = viewport.width >= 1024 && viewport.width < 1440
  const isLargeDesktop = viewport.width >= 1440

  return {
    ...viewport,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop
  }
}

/**
 * Hook للحصول على حجم viewport محدد
 */
export const useViewportSize = (): ViewportSize => {
  const { width, height } = useViewport()
  return { width, height }
}

/**
 * Hook للتحقق من حجم viewport محدد
 */
export const useViewportBreakpoint = (breakpoint: 'mobile' | 'tablet' | 'desktop' | 'largeDesktop'): boolean => {
  const viewport = useViewport()
  
  switch (breakpoint) {
    case 'mobile':
      return viewport.isMobile
    case 'tablet':
      return viewport.isTablet
    case 'desktop':
      return viewport.isDesktop
    case 'largeDesktop':
      return viewport.isLargeDesktop
    default:
      return false
  }
}

export default useViewport
