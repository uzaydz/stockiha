import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Star, TrendingUp, Users, ShieldCheck, CheckCircle, Truck, Award } from 'lucide-react'

interface ClassicEcommerceHeroProps {
  settings: any
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const ClassicEcommerceHero: React.FC<ClassicEcommerceHeroProps> = ({
  settings,
  isSelected,
  onEdit,
  onSelect,
}) => {
  return (
    <div 
      className={`relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-4' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-200 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute top-40 right-1/4 w-24 h-24 bg-teal-200 rounded-full opacity-20 blur-xl"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Section */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Top Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Badge variant="secondary" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 border-blue-200 rounded-full">
                <TrendingUp className="h-4 w-4" />
                أفضل العروض لهذا الموسم
              </Badge>
            </motion.div>

            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {settings?.title ? (
                  settings.title
                ) : (
                  <>
                    اكتشف عالم من{' '}
                    <span className="text-blue-600 block">المنتجات المميزة</span>
                  </>
                )}
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xl text-gray-600 leading-relaxed max-w-lg"
            >
              {settings?.description || 'تسوق من مجموعة واسعة من المنتجات عالية الجودة بأفضل الأسعار. استمتع بتجربة تسوق فريدة مع ضمان الجودة والتوصيل السريع.'}
            </motion.p>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap items-center gap-6 text-sm text-gray-600"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold">
                      {i}
                    </div>
                  ))}
                </div>
                <span className="font-medium">+10,000 عميل راض</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="font-medium">4.9 (2,847 تقييم)</span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                {settings?.primaryButton?.text || 'تسوق الآن'}
                <ArrowLeft className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg hover:border-gray-400 transition-all duration-300"
              >
                {settings?.secondaryButton?.text || 'استكشف المجموعات'}
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap items-center gap-6 pt-4"
            >
              {(settings?.trustBadges || [
                { icon: 'shield', text: 'دفع آمن 100%' },
                { icon: 'truck', text: 'توصيل مجاني' },
                { icon: 'award', text: 'ضمان الجودة' }
              ]).map((badge: any, index: number) => {
                const iconMap: any = {
                  shield: ShieldCheck,
                  truck: Truck,
                  award: Award,
                  check: CheckCircle
                }
                const IconComponent = iconMap[badge.icon] || CheckCircle
                
                return (
                  <div key={index} className="flex items-center gap-2 text-gray-600">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">{badge.text}</span>
                  </div>
                )
              })}
            </motion.div>
          </motion.div>

          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={settings?.imageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop'}
                alt="Hero Banner"
                className="w-full h-[500px] object-cover"
              />
              
              {/* Floating Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="absolute top-6 right-6 bg-white rounded-xl p-4 shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">+500 طلب</p>
                    <p className="text-xs text-gray-500">اليوم</p>
                  </div>
                </div>
              </motion.div>

              {/* Discount Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute bottom-6 left-6 bg-red-500 text-white rounded-full px-4 py-2 shadow-lg"
              >
                <span className="text-sm font-bold">خصم 30%</span>
              </motion.div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-pink-400 rounded-full animate-pulse"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
