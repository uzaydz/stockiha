import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Wand2, Palette, Layout, Type, Image, ShoppingBag, Users, TrendingUp, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface AITemplateGeneratorProps {
  onGenerate: (template: any) => void
  isGenerating?: boolean
}

const templateCategories = [
  { value: 'fashion', label: 'أزياء وموضة', icon: ShoppingBag },
  { value: 'electronics', label: 'إلكترونيات', icon: Zap },
  { value: 'beauty', label: 'جمال وعناية', icon: Sparkles },
  { value: 'food', label: 'طعام ومشروبات', icon: ShoppingBag },
  { value: 'services', label: 'خدمات', icon: Users },
  { value: 'general', label: 'عام', icon: Layout },
]

const colorSchemes = [
  { value: 'vibrant', label: 'حيوي ومشرق', colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'] },
  { value: 'elegant', label: 'أنيق وراقي', colors: ['#2C3E50', '#E74C3C', '#ECF0F1'] },
  { value: 'modern', label: 'عصري', colors: ['#6C5CE7', '#00B894', '#FDCB6E'] },
  { value: 'minimal', label: 'بسيط', colors: ['#2D3436', '#636E72', '#B2BEC3'] },
  { value: 'warm', label: 'دافئ', colors: ['#E17055', '#FDCB6E', '#00B894'] },
]

export const AITemplateGenerator: React.FC<AITemplateGeneratorProps> = ({ onGenerate, isGenerating = false }) => {
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('general')
  const [colorScheme, setColorScheme] = useState('modern')
  const [targetAudience, setTargetAudience] = useState('')

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('الرجاء إدخال وصف للمتجر')
      return
    }

    // Simulate AI generation
    toast.info('جاري إنشاء التصميم بالذكاء الاصطناعي...', { duration: 3000 })
    
    // Here you would call your actual AI API
    setTimeout(() => {
      const generatedTemplate = {
        name: 'تصميم AI مخصص',
        category,
        colorScheme: colorSchemes.find(cs => cs.value === colorScheme),
        elements: [
          {
            id: 'ai-hero',
            type: 'hero',
            properties: {
              title: 'مرحباً بك في متجرك الجديد',
              subtitle: prompt,
              primaryButton: { text: 'ابدأ التسوق', link: '/products' },
              imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2340',
            },
          },
          // Add more generated elements based on AI logic
        ],
      }
      
      onGenerate(generatedTemplate)
      toast.success('تم إنشاء التصميم بنجاح! 🎉')
    }, 2000)
  }

  return (
    <Card className="border-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-purple-600" />
          مولد القوالب بالذكاء الاصطناعي
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt Input */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            صف متجرك ومنتجاتك
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: متجر إلكترونيات متخصص في الهواتف الذكية واللابتوبات، أريد تصميم عصري وجذاب باللون الأزرق..."
            className="min-h-[100px]"
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            نوع المتجر
          </label>
          <div className="grid grid-cols-2 gap-2">
            {templateCategories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    category === cat.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Color Scheme */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            نظام الألوان
          </label>
          <div className="space-y-2">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.value}
                onClick={() => setColorScheme(scheme.value)}
                className={`w-full p-3 rounded-lg border-2 transition-all ${
                  colorScheme === scheme.value
                    ? 'border-purple-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{scheme.label}</span>
                  <div className="flex gap-1">
                    {scheme.colors.map((color, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded-full border border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            الجمهور المستهدف (اختياري)
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="مثال: الشباب من 18-35 سنة"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              جاري الإنشاء...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              إنشاء التصميم بالذكاء الاصطناعي
            </>
          )}
        </Button>

        {/* AI Features */}
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            ميزات الذكاء الاصطناعي
          </h4>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li>• تحليل النص وفهم احتياجات متجرك</li>
            <li>• اختيار الألوان المناسبة لنوع النشاط</li>
            <li>• إنشاء محتوى مخصص للمنتجات</li>
            <li>• تحسين التصميم لتحويلات أفضل</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
