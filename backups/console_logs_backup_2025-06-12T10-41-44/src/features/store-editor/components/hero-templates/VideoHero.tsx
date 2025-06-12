import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Volume2, VolumeX, ArrowRight, Users, TrendingUp, Star, Calendar, Camera, Film } from 'lucide-react'

interface VideoHeroProps {
  settings: any
  isSelected?: boolean
  onEdit?: () => void
  onSelect?: () => void
}

export const VideoHero: React.FC<VideoHeroProps> = ({
  settings,
  isSelected,
  onEdit,
  onSelect,
}) => {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)

  return (
    <div 
      className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-black cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-4' : ''}`}
      onClick={onSelect}
      onDoubleClick={onEdit}
    >
      {/* Cinematic Background */}
      <div className="absolute inset-0">
        {settings?.videoUrl ? (
          <video
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover opacity-60"
          >
            <source src={settings.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-slate-800 to-black">
            <img
              src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop"
              alt="Video Background"
              className="w-full h-full object-cover opacity-40"
            />
          </div>
        )}
        
        {/* Cinematic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
      </div>

      {/* Film Grain Effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full opacity-20 animate-pulse">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
      </div>

      {/* Video Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            setIsPlaying(!isPlaying)
          }}
          className="bg-black/30 backdrop-blur-lg text-white hover:bg-black/50 border border-white/10 rounded-xl"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            setIsMuted(!isMuted)
          }}
          className="bg-black/30 backdrop-blur-lg text-white hover:bg-black/50 border border-white/10 rounded-xl"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Content Section - 8 columns */}
            <div className="lg:col-span-8 space-y-8">
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-block"
              >
                <Badge className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-gradient-to-r from-red-600 to-orange-600 text-white border-0 rounded-full shadow-lg">
                  <Film className="h-4 w-4" />
                  عرض حصري ومميز
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
                        قصتك
                      </span>
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400">
                        تستحق العرض
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
                className="text-xl lg:text-2xl text-gray-200 leading-relaxed max-w-3xl"
              >
                {settings?.description || 'اكتشف عالماً من المحتوى الحصري والقصص الملهمة. نحن نصنع تجارب بصرية استثنائية تترك أثراً لا يُنسى.'}
              </motion.p>

              {/* Performance Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-8"
              >
                {[
                  { icon: Users, value: '2.5M+', label: 'مشاهد', color: 'text-blue-400' },
                  { icon: Star, value: '4.9', label: 'تقييم', color: 'text-yellow-400' },
                  { icon: TrendingUp, value: '95%', label: 'رضا العملاء', color: 'text-green-400' },
                  { icon: Calendar, value: '2024', label: 'جائزة التميز', color: 'text-purple-400' }
                ].map((metric, index) => {
                  const IconComponent = metric.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="text-center"
                    >
                      <div className={`flex items-center justify-center mb-2 ${metric.color}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="text-2xl font-bold text-white">{metric.value}</div>
                      <div className="text-sm text-gray-400">{metric.label}</div>
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
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 group rounded-2xl"
                >
                  {settings?.primaryButton?.text || 'شاهد الآن'}
                  <Play className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-lg px-10 py-6 text-lg font-semibold transition-all duration-300 rounded-2xl"
                >
                  {settings?.secondaryButton?.text || 'تعلم المزيد'}
                  <ArrowRight className="mr-3 h-6 w-6" />
                </Button>
              </motion.div>
            </div>

            {/* Visual Section - 4 columns */}
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                {/* Main Video Frame */}
                <div className="relative bg-gradient-to-br from-gray-800 to-black rounded-3xl p-6 shadow-2xl border border-gray-700">
                  <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
                    <img
                      src={settings?.imageUrl || 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2000&auto=format&fit=crop'}
                      alt="Video Preview"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors duration-300">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center cursor-pointer shadow-xl"
                      >
                        <Play className="h-8 w-8 text-gray-900 ml-1" />
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Video Controls Bar */}
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                        initial={{ width: '0%' }}
                        animate={{ width: '35%' }}
                        transition={{ duration: 2, delay: 1 }}
                      />
                    </div>
                    <span className="text-white text-sm font-mono">2:15 / 6:42</span>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-4 shadow-xl"
                >
                  <Camera className="h-6 w-6 text-white" />
                </motion.div>

                <motion.div
                  animate={{ y: [5, -5, 5] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-4 -left-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-4 shadow-xl"
                >
                  <Film className="h-6 w-6 text-white" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
      </div>
    </div>
  )
}
