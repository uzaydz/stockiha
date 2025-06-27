import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Rocket, Brain, Zap, Shield, Globe, Layers, TrendingUp, Star, BarChart3 } from 'lucide-react'

interface FuturisticHeroProps {
  settings: any
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const FuturisticHero: React.FC<FuturisticHeroProps> = ({
  settings,
  isSelected,
  onEdit,
  onSelect,
}) => {
  return (
    <div 
      className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-black cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-4' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Modern Tech Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-blue-950/30 to-purple-950/30" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>
        
        {/* Animated Glow Effects */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
        />
        
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Content Section - 7 columns */}
            <div className="lg:col-span-7 space-y-8">
              {/* Tech Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-block"
              >
                <Badge className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-0 rounded-full shadow-lg">
                  <Rocket className="h-4 w-4" />
                  تقنية الجيل القادم
                </Badge>
              </motion.div>

              {/* Main Title */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7 }}
                className="space-y-4"
              >
                <h1 className="text-5xl lg:text-8xl font-bold leading-tight">
                  {settings?.title ? (
                    settings.title
                  ) : (
                    <>
                      <span className="text-white">
                        ابتكر المستقبل
                      </span>
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                        بذكاء اصطناعي
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
                className="text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-3xl"
              >
                {settings?.description || 'منصة متطورة مدعومة بالذكاء الاصطناعي تساعدك على اتخاذ قرارات أذكى وتحقيق نتائج استثنائية. تجربة تقنية متقدمة تعيد تعريف حدود الإمكانيات.'}
              </motion.p>

              {/* Tech Features Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-4 py-8"
              >
                {[
                  { icon: Brain, label: 'ذكاء اصطناعي متقدم', value: 'AI', color: 'text-cyan-400 bg-cyan-400/10' },
                  { icon: Zap, label: 'معالجة فورية', value: '< 1ms', color: 'text-yellow-400 bg-yellow-400/10' },
                  { icon: Shield, label: 'أمان متطور', value: '256-bit', color: 'text-green-400 bg-green-400/10' },
                  { icon: Globe, label: 'تغطية عالمية', value: '180+ دولة', color: 'text-blue-400 bg-blue-400/10' },
                  { icon: TrendingUp, label: 'نمو مستمر', value: '+250%', color: 'text-purple-400 bg-purple-400/10' },
                  { icon: Star, label: 'تقييم العملاء', value: '4.9★', color: 'text-orange-400 bg-orange-400/10' }
                ].map((feature, index) => {
                  const IconComponent = feature.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      className={`${feature.color} backdrop-blur-sm border border-white/10 rounded-2xl p-4 transition-all duration-300`}
                    >
                      <IconComponent className="h-6 w-6 mb-3" />
                      <div className="text-lg font-bold text-white mb-1">{feature.value}</div>
                      <div className="text-sm text-gray-400">{feature.label}</div>
                    </motion.div>
                  )
                })}
              </motion.div>

              {/* CTA Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 pt-6"
              >
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 group rounded-2xl"
                >
                  {settings?.primaryButton?.text || 'ابدأ التجربة'}
                  <ArrowRight className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-2 border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-cyan-500/50 px-10 py-6 text-lg font-semibold transition-all duration-300 rounded-2xl backdrop-blur-sm"
                >
                  {settings?.secondaryButton?.text || 'اكتشف المزيد'}
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="flex items-center gap-8 pt-8 text-sm text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span>معتمد ISO 27001</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span>أكثر من مليون مستخدم</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span>متاح في 180+ دولة</span>
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
                {/* Main Tech Interface */}
                <div className="relative bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl">
                  <img
                    src={settings?.imageUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?q=80&w=2000&auto=format&fit=crop'}
                    alt="AI Technology"
                    className="w-full h-80 object-cover rounded-2xl"
                  />
                  
                  {/* Tech Overlay Elements */}
                  <div className="absolute inset-8 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-2xl" />
                  
                  {/* Performance Indicators */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="absolute top-12 left-12 bg-black/70 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                      <div>
                        <div className="text-xs text-gray-400">SYSTEM STATUS</div>
                        <div className="text-sm font-mono text-green-400">ACTIVE</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                    className="absolute bottom-12 right-12 bg-black/70 backdrop-blur-md rounded-xl p-4 border border-blue-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="text-xs text-gray-400">PERFORMANCE</div>
                        <div className="text-sm font-mono text-blue-400">99.9%</div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Floating Tech Elements */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-4 shadow-xl"
                >
                  <Brain className="h-8 w-8 text-white" />
                </motion.div>

                <motion.div
                  animate={{ y: [5, -5, 5] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-6 -left-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-4 shadow-xl"
                >
                  <Layers className="h-8 w-8 text-white" />
                </motion.div>

                {/* Background Glow */}
                <div className="absolute -inset-8 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 rounded-3xl blur-2xl -z-10" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
