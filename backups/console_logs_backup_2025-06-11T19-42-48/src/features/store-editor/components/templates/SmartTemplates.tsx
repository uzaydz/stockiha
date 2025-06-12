import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Filter,
  Star,
  TrendingUp,
  Clock,
  Sparkles,
  ShoppingBag,
  Zap,
  Palette,
  Users,
  Heart,
  ArrowRight,
  Download,
  Eye,
  Code2,
  Layers3,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Template {
  id: string
  name: string
  category: string
  thumbnail: string
  description: string
  features: string[]
  rating: number
  downloads: number
  isPremium: boolean
  isNew: boolean
  aiScore: number
  industries: string[]
  colorScheme: string[]
}

interface SmartTemplatesProps {
  onSelectTemplate: (template: Template) => void
  className?: string
}

// Mock templates data
const templates: Template[] = [
  {
    id: 'modern-fashion',
    name: 'متجر الأزياء العصري',
    category: 'fashion',
    thumbnail: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400',
    description: 'تصميم أنيق ومتطور لمتاجر الأزياء والملابس',
    features: ['تصميم متجاوب', 'معرض صور متقدم', 'فلاتر منتجات ذكية', 'مؤثرات حركية'],
    rating: 4.8,
    downloads: 2340,
    isPremium: false,
    isNew: true,
    aiScore: 95,
    industries: ['أزياء', 'ملابس', 'إكسسوارات'],
    colorScheme: ['#000000', '#FFFFFF', '#E5E5E5']
  },
  {
    id: 'tech-store-pro',
    name: 'متجر التقنية المتقدم',
    category: 'electronics',
    thumbnail: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400',
    description: 'مثالي للإلكترونيات والأجهزة التقنية',
    features: ['مقارنة منتجات', 'مواصفات تفصيلية', 'تقييمات متقدمة', 'دعم AR'],
    rating: 4.9,
    downloads: 3567,
    isPremium: true,
    isNew: false,
    aiScore: 92,
    industries: ['إلكترونيات', 'أجهزة', 'تقنية'],
    colorScheme: ['#0066CC', '#333333', '#F5F5F5']
  },
  {
    id: 'beauty-boutique',
    name: 'بوتيك الجمال',
    category: 'beauty',
    thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400',
    description: 'تصميم فاخر لمنتجات التجميل والعناية',
    features: ['عرض 360°', 'نصائح جمالية', 'اختبار افتراضي', 'مدونة متكاملة'],
    rating: 4.7,
    downloads: 1890,
    isPremium: true,
    isNew: true,
    aiScore: 88,
    industries: ['تجميل', 'عناية', 'عطور'],
    colorScheme: ['#FFB6C1', '#FFF0F5', '#FF69B4']
  },
  {
    id: 'food-delivery',
    name: 'توصيل الطعام السريع',
    category: 'food',
    thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    description: 'نظام متكامل لطلبات الطعام والتوصيل',
    features: ['تتبع مباشر', 'قائمة تفاعلية', 'نظام نقاط', 'دفع متعدد'],
    rating: 4.6,
    downloads: 4230,
    isPremium: false,
    isNew: false,
    aiScore: 90,
    industries: ['مطاعم', 'توصيل', 'طعام'],
    colorScheme: ['#FF6B6B', '#4ECDC4', '#FFE66D']
  }
]

const categories = [
  { id: 'all', name: 'الكل', icon: Layers3 },
  { id: 'fashion', name: 'أزياء', icon: ShoppingBag },
  { id: 'electronics', name: 'إلكترونيات', icon: Zap },
  { id: 'beauty', name: 'جمال', icon: Heart },
  { id: 'food', name: 'طعام', icon: Users },
]

export const SmartTemplates: React.FC<SmartTemplatesProps> = ({ onSelectTemplate, className }) => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'ai'>('popular')
  const [showFilters, setShowFilters] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.industries.some(ind => ind.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  }).sort((a, b) => {
    if (sortBy === 'popular') return b.downloads - a.downloads
    if (sortBy === 'newest') return b.isNew ? 1 : -1
    if (sortBy === 'ai') return b.aiScore - a.aiScore
    return 0
  })

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold mb-4">قوالب ذكية</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن قالب..."
            className="pr-10"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0 gap-2"
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </Button>
            )
          })}
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between">
          <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="popular" className="text-xs gap-1">
                <TrendingUp className="h-3 w-3" />
                الأكثر شعبية
              </TabsTrigger>
              <TabsTrigger value="newest" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                الأحدث
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                توصية AI
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        معاينة
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onSelectTemplate(template)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        استخدام
                      </Button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      {template.isPremium && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      {template.isNew && (
                        <Badge variant="secondary">جديد</Badge>
                      )}
                    </div>

                    {/* AI Score */}
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="bg-black/50 text-white">
                        AI Score: {template.aiScore}%
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{template.description}</p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.features.slice(0, 3).map((feature, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {template.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.features.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{template.rating}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Download className="h-4 w-4" />
                          <span>{template.downloads.toLocaleString('ar-SA')}</span>
                        </div>
                      </div>
                      
                      {/* Color Scheme */}
                      <div className="flex gap-1">
                        {template.colorScheme.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد قوالب مطابقة للبحث</p>
          </div>
        )}
      </ScrollArea>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview content would go here */}
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-4">{previewTemplate.name}</h3>
                <img
                  src={previewTemplate.thumbnail}
                  alt={previewTemplate.name}
                  className="w-full rounded-lg mb-4"
                />
                <div className="flex gap-2">
                  <Button onClick={() => onSelectTemplate(previewTemplate)}>
                    استخدام هذا القالب
                  </Button>
                  <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                    إغلاق
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}