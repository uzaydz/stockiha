import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, ArrowUpRight, Sparkles, Zap, Globe, Heart, ShieldCheck, CheckCircle, Truck, Award } from 'lucide-react'

interface ModernGlassHeroProps {
  settings: any
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const ModernGlassHero: React.FC<ModernGlassHeroProps> = ({
  settings,
  isSelected,
  onEdit,
  onSelect,
}) => {
  return (
    <div 
      className={`relative min-h-[600px] overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-4' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full opacity-10"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 4 + 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Mesh Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Section */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 text-white"
          >
            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative"
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-lg bg-white/10 border border-white/20 shadow-lg">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span className="text-sm font-medium">مجموعة حصرية 2024</span>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
            </motion.div>

            {/* Main Title with Gradient Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-7xl font-black leading-tight">
                {settings?.title ? (
                  <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {settings.title}
                  </span>
                ) : (
                  <>
                    <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                      تسوق بذكاء
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                      عيش الفخامة
                    </span>
                  </>
                )}
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl text-purple-100 leading-relaxed max-w-xl"
            >
              {settings?.description || 'اكتشف عالماً جديداً من التسوق الرقمي مع تقنيات الذكاء الاصطناعي ومنتجات مختارة بعناية فائقة لتجربة لا تُنسى.'}
            </motion.p>

            {/* Floating Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-wrap gap-4"
            >
              {[
                { icon: Globe, value: '50+', label: 'دولة' },
                { icon: Heart, value: '1M+', label: 'عميل سعيد' },
                { icon: Zap, value: '24/7', label: 'دعم فوري' }
              ].map((stat, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20">
                  <div className="p-2 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-lg">
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{stat.value}</div>
                    <div className="text-xs text-purple-200">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Advanced CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg"
                className="group relative overflow-hidden bg-gradient-to-r from-yellow-400 to-pink-400 hover:from-yellow-300 hover:to-pink-300 text-gray-900 px-8 py-4 text-lg font-bold shadow-2xl transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {settings?.primaryButton?.text || 'ابدأ التسوق'}
                  <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-yellow-400 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="group border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg backdrop-blur-sm transition-all duration-300"
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                {settings?.secondaryButton?.text || 'شاهد العرض'}
              </Button>
            </motion.div>

            {/* Modern Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="flex flex-wrap items-center gap-4 pt-6"
            >
              {(settings?.trustBadges || [
                { icon: 'shield', text: 'حماية متقدمة' },
                { icon: 'truck', text: 'توصيل فوري' },
                { icon: 'award', text: 'جودة مضمونة' }
              ]).map((badge: any, index: number) => {
                const iconMap: any = {
                  shield: ShieldCheck,
                  truck: Truck,
                  award: Award,
                  check: CheckCircle
                }
                const IconComponent = iconMap[badge.icon] || CheckCircle
                
                return (
                  <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-lg bg-white/10 border border-white/20">
                    <IconComponent className="h-4 w-4 text-yellow-300" />
                    <span className="text-sm font-medium text-purple-100">{badge.text}</span>
                  </div>
                )
              })}
            </motion.div>
          </motion.div>

          {/* Image Section with Glass Effect */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            {/* Main Image Container */}
            <div className="relative">
              <motion.div 
                className="relative rounded-3xl overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={settings?.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=2126&auto=format&fit=crop'}
                  alt="Hero Banner"
                  className="w-full h-[500px] object-cover"
                />
                
                {/* Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/30 via-transparent to-transparent"></div>
              </motion.div>

              {/* Floating Glass Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute -top-6 -left-6 p-4 rounded-2xl backdrop-blur-xl bg-white/20 border border-white/30 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-400 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-white">
                    <p className="font-bold">تجربة مميزة</p>
                    <p className="text-xs opacity-80">AI مدعوم بـ</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="absolute -bottom-6 -right-6 p-4 rounded-2xl backdrop-blur-xl bg-white/20 border border-white/30 shadow-2xl"
              >
                <div className="text-center text-white">
                  <div className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                    ⭐ 4.9
                  </div>
                  <p className="text-xs opacity-80">من 10K+ تقييم</p>
                </div>
              </motion.div>

              {/* Decorative Elements */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 -right-8 w-16 h-16 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full opacity-20 blur-xl"
              ></motion.div>
              
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute bottom-1/4 -left-8 w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30 blur-lg"
              ></motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  )
} 