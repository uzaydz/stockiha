import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Palette, Sparkles, Zap, Minimize, Play, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'

interface HeroTemplateSelectorProps {
  currentTemplate: string
  onTemplateChange: (template: string) => void
}

const templates = [
  {
    id: 'classic',
    name: 'كلاسيكي أنيق',
    description: 'تصميم احترافي ونظيف مناسب لجميع أنواع المتاجر',
    preview: 'bg-gradient-to-br from-slate-50 to-blue-50',
    accent: 'bg-blue-500',
    features: ['تصميم متجاوب', 'إحصائيات مرئية', 'عناصر تفاعلية']
  },
  {
    id: 'modern-glass',
    name: 'زجاجي حديث',
    description: 'تصميم مستقبلي بتأثيرات زجاجية وجاذبية بصرية',
    preview: 'bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600',
    accent: 'bg-purple-500',
    features: ['تأثيرات زجاجية', 'جسيمات متحركة', 'ألوان متدرجة']
  },
  {
    id: 'neobrutalism',
    name: 'عصري جريء',
    description: 'تصميم جريء ومميز بأسلوب Neobrutalism العصري',
    preview: 'bg-yellow-300',
    accent: 'bg-red-500',
    features: ['تصميم جريء', 'ألوان صريحة', 'تأثيرات مرحة']
  },
  {
    id: 'minimal',
    name: 'بسيط وأنيق',
    description: 'تصميم بسيط ونظيف يركز على المحتوى والوضوح',
    preview: 'bg-gradient-to-br from-gray-50 to-white',
    accent: 'bg-gray-600',
    features: ['بساطة في التصميم', 'قراءة واضحة', 'تركيز على المحتوى']
  },
  {
    id: 'creative',
    name: 'إبداعي متطور',
    description: 'تصميم احترافي متطور مع عناصر تفاعلية وإحصائيات',
    preview: 'bg-gradient-to-br from-blue-100 to-indigo-100',
    accent: 'bg-indigo-600',
    features: ['تصميم احترافي', 'عناصر تفاعلية', 'إحصائيات مرئية']
  },
  {
    id: 'video',
    name: 'فيديو تفاعلي',
    description: 'تصميم مخصص للفيديوهات مع خلفية متحركة وأدوات تحكم',
    preview: 'bg-gradient-to-br from-gray-900 to-gray-700',
    accent: 'bg-white',
    features: ['خلفية فيديو', 'أدوات تحكم', 'تصميم سينمائي']
  },
  {
    id: 'futuristic',
    name: 'مستقبلي تقني',
    description: 'تصميم مستقبلي متقدم بعناصر تقنية وتأثيرات رقمية',
    preview: 'bg-gradient-to-br from-cyan-900 to-blue-900',
    accent: 'bg-cyan-400',
    features: ['تأثيرات رقمية', 'عناصر تقنية', 'أنيميشن متقدم']
  }
]

export const HeroTemplateSelector: React.FC<HeroTemplateSelectorProps> = ({
  currentTemplate,
  onTemplateChange
}) => {
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">اختر قالب التصميم</h3>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => {
          const isSelected = currentTemplate === template.id
          const isHovered = hoveredTemplate === template.id

          return (
            <motion.div
              key={template.id}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 overflow-hidden ${
                  isSelected 
                    ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
                    : 'hover:shadow-md hover:border-primary/20'
                }`}
                onClick={() => onTemplateChange(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Preview Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-20 h-16 rounded-lg ${template.preview} relative overflow-hidden`}>
                        {/* Mini Design Elements */}
                        {template.id === 'classic' && (
                          <>
                            <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="absolute bottom-2 right-2 w-3 h-1 bg-gray-300 rounded"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-4 bg-white/20 rounded"></div>
                          </>
                        )}
                        
                        {template.id === 'modern-glass' && (
                          <>
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                            <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-300 rounded-full animate-pulse"></div>
                            <div className="absolute bottom-1 right-1 w-1 h-1 bg-pink-300 rounded-full animate-pulse"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-3 bg-white/20 rounded backdrop-blur-sm"></div>
                          </>
                        )}
                        
                        {template.id === 'neobrutalism' && (
                          <>
                            <div className="absolute top-1 left-1 w-3 h-2 bg-red-500 border border-black transform rotate-12"></div>
                            <div className="absolute bottom-1 right-1 w-2 h-2 bg-blue-500 border border-black rounded-full"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-3 bg-white border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                          </>
                        )}

                        {template.id === 'minimal' && (
                          <>
                            <div className="absolute top-2 left-2 w-8 h-1 bg-gray-400 rounded"></div>
                            <div className="absolute top-4 left-2 w-6 h-0.5 bg-gray-300 rounded"></div>
                            <div className="absolute bottom-2 right-2 w-3 h-3 bg-gray-500 rounded"></div>
                          </>
                        )}

                        {template.id === 'creative' && (
                          <>
                            <div className="absolute top-1 left-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <div className="absolute top-3 left-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                            <div className="absolute bottom-1 right-1 w-4 h-2 bg-indigo-300 rounded"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-4 bg-white/80 rounded border border-indigo-200"></div>
                          </>
                        )}

                        {template.id === 'video' && (
                          <>
                            <div className="absolute inset-0 bg-gray-800"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/90 rounded-full flex items-center justify-center">
                              <div className="w-0 h-0 border-l-2 border-l-gray-800 border-y-1 border-y-transparent ml-0.5"></div>
                            </div>
                            <div className="absolute bottom-1 left-1 right-1 h-0.5 bg-white/30 rounded"></div>
                          </>
                        )}

                        {template.id === 'futuristic' && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 to-blue-900"></div>
                            <div className="absolute top-1 left-1 w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
                            <div className="absolute top-2 right-1 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                            <div className="absolute bottom-1 left-2 w-1 h-1 bg-cyan-300 rounded-full animate-pulse"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-3 bg-cyan-400/20 rounded border border-cyan-400/40"></div>
                          </>
                        )}

                        {/* Selection Indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg"
                          >
                            <Check className="h-3 w-3 text-white" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Template Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                            {template.name}
                            {template.id === 'modern-glass' && <Sparkles className="h-3 w-3 text-purple-500" />}
                            {template.id === 'neobrutalism' && <Zap className="h-3 w-3 text-yellow-500" />}
                            {template.id === 'minimal' && <Minimize className="h-3 w-3 text-gray-500" />}
                            {template.id === 'creative' && <Palette className="h-3 w-3 text-indigo-500" />}
                            {template.id === 'video' && <Play className="h-3 w-3 text-white" />}
                            {template.id === 'futuristic' && <Cpu className="h-3 w-3 text-cyan-400" />}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                        
                        <div className={`w-3 h-3 rounded-full ${template.accent} flex-shrink-0`}></div>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {template.features.map((feature, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.div
                    className="mt-4"
                    animate={{ 
                      opacity: isSelected ? 1 : (isHovered ? 1 : 0.7),
                      scale: isSelected ? 1 : (isHovered ? 1 : 0.95)
                    }}
                  >
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTemplateChange(template.id)
                      }}
                    >
                      {isSelected ? 'مُحدد حالياً' : 'اختر هذا القالب'}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-sm text-blue-900 mb-1">نصيحة للتصميم</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              يمكنك تغيير القالب في أي وقت. جميع إعداداتك المخصصة (النصوص، الصور، الألوان) ستبقى محفوظة ومتوافقة مع القالب الجديد.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 