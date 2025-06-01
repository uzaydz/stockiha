import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Star, Shield, Award, Users, Clock, Heart } from 'lucide-react'

interface CreativeHeroProps {
  settings: any
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const CreativeHero: React.FC<CreativeHeroProps> = ({
  settings,
  isSelected,
  onEdit,
  onSelect,
}) => {
  return (
    <div 
      className={`relative overflow-hidden bg-white dark:bg-gray-900 cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-4' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Modern Grid Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950" />
        
        {/* Geometric Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-blue-600" />
        </svg>
        
        {/* Modern Accent Shapes */}
        <motion.div
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl opacity-20 transform rotate-12"
        />
        
        <motion.div
          animate={{ 
            x: [0, -25, 0],
            y: [0, 15, 0],
            rotate: [0, -3, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-32 left-16 w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl opacity-20 transform -rotate-12"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Content Section - 7 columns */}
            <div className="lg:col-span-7 space-y-8">
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-block"
              >
                <Badge className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 rounded-full shadow-lg">
                  <Star className="h-4 w-4" />
                  الحل الأمثل لنجاحك
                </Badge>
              </motion.div>

              {/* Main Title */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7 }}
                className="space-y-4"
              >
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  {settings?.title ? (
                    settings.title
                  ) : (
                    <>
                      <span className="text-gray-900 dark:text-white">
                        ابنِ مستقبل
                      </span>
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                        أعمالك اليوم
                      </span>
                    </>
                  )}
                </h1>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl"
              >
                {settings?.description || 'منصة شاملة ومتقدمة تجمع كل ما تحتاجه لإدارة وتطوير أعمالك بكفاءة وذكاء، مع أحدث التقنيات والحلول المبتكرة.'}
              </motion.p>

              {/* Features Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8"
              >
                {(settings?.features || [
                  { icon: 'shield', text: 'أمان متقدم', color: 'blue' },
                  { icon: 'award', text: 'جودة مضمونة', color: 'green' },
                  { icon: 'users', text: 'دعم 24/7', color: 'purple' },
                  { icon: 'clock', text: 'سرعة فائقة', color: 'orange' },
                  { icon: 'heart', text: 'سهولة الاستخدام', color: 'red' },
                  { icon: 'star', text: 'تقييم 5 نجوم', color: 'yellow' }
                ]).slice(0, 6).map((feature: any, index: number) => {
                  const iconMap: any = {
                    shield: Shield,
                    award: Award,
                    users: Users,
                    clock: Clock,
                    heart: Heart,
                    star: Star
                  }
                  const colorMap: any = {
                    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
                    green: 'text-green-600 bg-green-50 dark:bg-green-950/50',
                    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50',
                    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-950/50',
                    red: 'text-red-600 bg-red-50 dark:bg-red-950/50',
                    yellow: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/50'
                  }
                  const IconComponent = iconMap[feature.icon] || Star
                  const colorClass = colorMap[feature.color] || 'text-blue-600 bg-blue-50 dark:bg-blue-950/50'
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      className={`flex items-center gap-3 p-4 rounded-2xl ${colorClass} backdrop-blur-sm transition-all duration-300`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{feature.text}</span>
                    </motion.div>
                  )
                })}
              </motion.div>

              {/* CTA Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 pt-8"
              >
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 group rounded-2xl"
                >
                  {settings?.primaryButton?.text || 'ابدأ الآن مجاناً'}
                  <ArrowRight className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-10 py-6 text-lg font-semibold transition-all duration-300 rounded-2xl"
                >
                  {settings?.secondaryButton?.text || 'شاهد العرض التوضيحي'}
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="flex items-center gap-8 pt-8 text-sm text-gray-500 dark:text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>+10,000 عميل راض</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>أمان مضمون 100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>ضمان استرداد المال</span>
                </div>
              </motion.div>
            </div>

            {/* Visual Section - 5 columns */}
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                <div className="relative">
                  {/* Main Visual Container */}
                  <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700">
                    <img
                      src={settings?.imageUrl || 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2000&auto=format&fit=crop'}
                      alt="Business Solution"
                      className="w-full h-80 object-cover rounded-2xl"
                    />
                    
                    {/* Floating Elements */}
                    <motion.div
                      animate={{ y: [-5, 5, -5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-4 -right-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-4 shadow-lg"
                    >
                      <Award className="h-6 w-6 text-white" />
                    </motion.div>

                    <motion.div
                      animate={{ y: [5, -5, 5] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -bottom-4 -left-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg"
                    >
                      <Shield className="h-6 w-6 text-white" />
                    </motion.div>
                  </div>

                  {/* Background Decorative Elements */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl -z-10 blur-xl" />
                  
                  {/* Statistics Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="absolute top-8 left-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">4.9/5</div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">تقييم العملاء</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}