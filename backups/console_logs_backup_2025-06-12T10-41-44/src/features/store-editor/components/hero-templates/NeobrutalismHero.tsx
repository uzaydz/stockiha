import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Zap, Target, Rocket, ShieldCheck, CheckCircle, Truck, Award, Star, Crown } from 'lucide-react'

interface NeobrutalismHeroProps {
  settings: any
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const NeobrutalismHero: React.FC<NeobrutalismHeroProps> = ({
  settings,
  isSelected,
  onEdit,
  onSelect,
}) => {
  return (
    <div 
      className={`relative overflow-hidden bg-yellow-300 cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-4' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Geometric Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%3E%3Cg%20fill%3D%22%23000%22%20fill-opacity%3D%220.05%22%3E%3Crect%20width%3D%222%22%20height%3D%2240%22/%3E%3Crect%20width%3D%2240%22%20height%3D%222%22/%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
          
          {/* Decorative Shapes */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-red-500 rounded-lg transform rotate-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500 rounded-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute top-40 right-1/4 w-24 h-24 bg-green-500 transform rotate-45 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute bottom-40 left-1/4 w-20 h-20 bg-purple-500 rounded-lg transform -rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
        </div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content Section */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            className="space-y-8"
          >
            {/* Bold Badge */}
            <motion.div
              initial={{ opacity: 0, rotate: -10, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            >
              <div className="inline-block px-6 py-3 bg-black text-white font-black text-sm uppercase tracking-wider transform -rotate-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] border-4 border-black">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  منتجات حصرية 2024
                </div>
              </div>
            </motion.div>

            {/* Main Title - Bold and Impactful */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.3 }}
            >
              <h1 className="text-5xl lg:text-8xl font-black text-black leading-none uppercase tracking-tight">
                {settings?.title ? (
                  <span className="block">
                    {settings.title.split(' ').map((word: string, index: number) => (
                      <span key={index} className={`block ${index % 2 === 0 ? 'text-black' : 'text-red-500'}`}>
                        {word}
                      </span>
                    ))}
                  </span>
                ) : (
                  <>
                    <span className="block text-black">تسوق</span>
                    <span className="block text-red-500">كالمحترفين</span>
                    <span className="block text-blue-500">اشتري</span>
                    <span className="block text-green-500">بذكاء</span>
                  </>
                )}
              </h1>
            </motion.div>

            {/* Description Box */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="p-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-1"
            >
              <p className="text-xl font-bold text-black leading-relaxed">
                {settings?.description || 'نحن نقدم أفضل المنتجات بأسعار لا تصدق! تسوق الآن واحصل على صفقات حصرية مع ضمان الجودة والأداء المتميز.'}
              </p>
            </motion.div>

            {/* Bold Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              {[
                { icon: Target, value: '100K+', label: 'عميل', color: 'bg-red-500' },
                { icon: Zap, value: '24/7', label: 'دعم', color: 'bg-blue-500' },
                { icon: Rocket, value: '99%', label: 'رضا', color: 'bg-green-500' }
              ].map((stat, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 }}
                  className={`${stat.color} text-white p-4 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform ${index % 2 === 0 ? 'rotate-2' : '-rotate-2'}`}
                >
                  <div className="flex items-center gap-2">
                    <stat.icon className="h-5 w-5" />
                    <div>
                      <div className="font-black text-lg">{stat.value}</div>
                      <div className="font-bold text-sm">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Brutal CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-6"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: -1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg"
                  className="group relative bg-red-500 hover:bg-red-600 text-white px-10 py-6 text-xl font-black uppercase tracking-wider border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform transition-all duration-200"
                >
                  {settings?.primaryButton?.text || 'اشتري الآن!'}
                  <ArrowRight className="mr-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05, rotate: 1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline"
                  size="lg"
                  className="bg-white hover:bg-yellow-100 text-black px-10 py-6 text-xl font-black uppercase tracking-wider border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform transition-all duration-200"
                >
                  {settings?.secondaryButton?.text || 'تصفح الكل'}
                </Button>
              </motion.div>
            </motion.div>

            {/* Bold Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap items-center gap-4 pt-6"
            >
              {(settings?.trustBadges || [
                { icon: 'shield', text: 'حماية كاملة' },
                { icon: 'truck', text: 'توصيل سريع' },
                { icon: 'award', text: 'جودة مضمونة' }
              ]).map((badge: any, index: number) => {
                const iconMap: any = {
                  shield: ShieldCheck,
                  truck: Truck,
                  award: Award,
                  check: CheckCircle
                }
                const IconComponent = iconMap[badge.icon] || CheckCircle
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500']
                
                return (
                  <motion.div 
                    key={index}
                    whileHover={{ scale: 1.1, rotate: index % 2 === 0 ? 3 : -3 }}
                    className={`flex items-center gap-2 px-4 py-2 ${colors[index % colors.length]} text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-sm uppercase">{badge.text}</span>
                  </motion.div>
                )
              })}
            </motion.div>
          </motion.div>

          {/* Image Section - Brutal Style */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3, type: "spring", bounce: 0.4 }}
            className="relative"
          >
            {/* Main Image with Brutal Frame */}
            <motion.div 
              className="relative transform rotate-2"
              whileHover={{ rotate: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white p-4">
                <img
                  src={settings?.imageUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2340&auto=format&fit=crop'}
                  alt="Hero Banner"
                  className="w-full h-[500px] object-cover border-4 border-black"
                />
                
                {/* Brutal Overlay Elements */}
                <div className="absolute top-8 left-8 bg-yellow-400 text-black px-4 py-2 font-black text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-3">
                  جديد!
                </div>
              </div>
            </motion.div>

            {/* Floating Brutal Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.5, type: "spring", bounce: 0.6 }}
              className="absolute -top-8 -right-8 bg-red-500 text-white p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform rotate-12"
            >
              <div className="text-center">
                <div className="font-black text-2xl">50%</div>
                <div className="font-bold text-sm">خصم</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.5, type: "spring", bounce: 0.6 }}
              className="absolute -bottom-8 -left-8 bg-green-500 text-white p-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-12"
            >
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 fill-current" />
                <div>
                  <div className="font-black text-lg">5.0</div>
                  <div className="font-bold text-xs">تقييم</div>
                </div>
              </div>
            </motion.div>

            {/* Decorative Brutal Elements */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-1/3 -left-12 w-8 h-8 bg-pink-500 border-2 border-black transform rotate-45"
            ></motion.div>
            
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute bottom-1/3 -right-12 w-12 h-12 bg-blue-500 rounded-full border-4 border-black"
            ></motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Brutal Border */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-black"></div>
    </div>
  )
}
