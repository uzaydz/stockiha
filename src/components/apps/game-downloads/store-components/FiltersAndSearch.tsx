import React from 'react';
import { Search, Monitor, Filter, Gamepad2, Phone, Sparkles, Trophy, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameCategory, platforms } from './types';

interface FiltersAndSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedPlatform: string;
  setSelectedPlatform: (platform: string) => void;
  categories: GameCategory[];
  primaryColor?: string;
  secondaryColor?: string;
}

export default function FiltersAndSearch({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedPlatform,
  setSelectedPlatform,
  categories,
  primaryColor,
  secondaryColor,
}: FiltersAndSearchProps) {
  const getPlatformIcon = (platformValue: string) => {
    switch (platformValue) {
      case 'PC': return Monitor;
      case 'PlayStation': return Gamepad2;
      case 'Xbox': return Gamepad2;
      case 'Mobile': return Phone;
      default: return Monitor;
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('أكشن') || name.includes('حرب') || name.includes('قتال')) return Zap;
    if (name.includes('رياضة') || name.includes('سباق')) return Trophy;
    if (name.includes('مغامرة') || name.includes('خيال')) return Sparkles;
    return Gamepad2;
  };

  const getCategoryGradient = (index: number) => {
    const gradients = [
      'from-blue-500/20 to-purple-500/20 border-blue-500/30',
      'from-green-500/20 to-emerald-500/20 border-green-500/30',
      'from-orange-500/20 to-red-500/20 border-orange-500/30',
      'from-pink-500/20 to-rose-500/20 border-pink-500/30',
      'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
      'from-violet-500/20 to-purple-500/20 border-violet-500/30',
      'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
      'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="mb-8 space-y-6">
      {/* Search Bar */}
      <Card className="bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-md border-border/30 shadow-xl">
        <CardContent className="p-6">
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <Input
              placeholder="🔍 ابحث عن لعبتك المفضلة... (اسم اللعبة، الوصف، المطور)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-14 h-16 text-lg bg-background/80 border-border/50 focus:border-primary/60 focus:bg-background/95 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
            />
            {searchTerm && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {searchTerm}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Card className="bg-gradient-to-r from-card/70 to-card/50 backdrop-blur-md border-border/30 shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="mb-4 text-center">
            <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              🎮 اختر فئة الألعاب المفضلة
            </h3>
            <p className="text-sm text-muted-foreground mt-1">تصفح الألعاب حسب الفئة</p>
          </div>
          
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full bg-background/60 p-2 h-auto gap-2 rounded-xl border border-border/30 shadow-inner" 
                     style={{ 
                       gridTemplateColumns: `repeat(${Math.min(categories.length + 1, 6)}, 1fr)` 
                     }}>
              {/* All Categories Tab */}
              <TabsTrigger 
                value="all" 
                className={`h-16 px-4 text-sm font-bold transition-all duration-300 hover:scale-105 rounded-lg border-2 border-transparent ${
                  primaryColor 
                    ? 'data-[state=active]:text-white data-[state=active]:shadow-lg' 
                    : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:border-primary/30'
                } hover:bg-primary/10`}
                style={
                  selectedCategory === 'all' && primaryColor 
                    ? {
                        background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}cc)`,
                        borderColor: `${primaryColor}30`,
                      }
                    : {}
                }
              >
                <div className="flex flex-col items-center gap-2">
                  <div 
                    className={`p-2 rounded-full ${
                      primaryColor 
                        ? '' 
                        : 'bg-gradient-to-br from-primary/20 to-secondary/20'
                    }`}
                    style={
                      primaryColor 
                        ? {
                            background: `linear-gradient(to bottom right, ${primaryColor}20, ${secondaryColor || primaryColor}20)`,
                          }
                        : {}
                    }
                  >
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                  <span className="text-xs">جميع الفئات</span>
                </div>
              </TabsTrigger>
              
              {/* Category Tabs */}
              {categories.slice(0, 5).map((category, index) => {
                const IconComponent = getCategoryIcon(category.name);
                const gradientClass = getCategoryGradient(index);
                
                return (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className={`data-[state=active]:bg-gradient-to-r data-[state=active]:shadow-lg h-16 px-4 text-sm font-bold transition-all duration-300 hover:scale-105 rounded-lg border-2 border-transparent data-[state=active]:${gradientClass} hover:bg-gradient-to-r hover:${gradientClass.replace('/20', '/10')}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`p-2 bg-gradient-to-br ${gradientClass.split(' ')[0]} ${gradientClass.split(' ')[1]} rounded-full`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className="text-xs line-clamp-1">{category.name}</span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Additional Categories if more than 5 */}
            {categories.length > 5 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-3 text-center">فئات إضافية:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.slice(5).map((category, index) => {
                    const IconComponent = getCategoryIcon(category.name);
                    const gradientClass = getCategoryGradient(index + 5);
                    const isActive = selectedCategory === category.id;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 font-medium text-sm ${
                          isActive 
                            ? `bg-gradient-to-r ${gradientClass} shadow-lg` 
                            : `border-border/30 hover:bg-gradient-to-r hover:${gradientClass.replace('/20', '/10')} bg-background/50`
                        }`}
                      >
                        <div className={`p-1.5 bg-gradient-to-br ${gradientClass.split(' ')[0]} ${gradientClass.split(' ')[1]} rounded-full`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span>{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Tabs>

          {/* Active Filters Display */}
          {(selectedCategory !== 'all' || searchTerm) && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-sm font-medium text-muted-foreground mb-3 text-center">الفلاتر النشطة:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {searchTerm && (
                  <Badge 
                    variant="secondary" 
                    className={`border ${
                      primaryColor 
                        ? 'text-white' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}
                    style={
                      primaryColor 
                        ? {
                            backgroundColor: `${primaryColor}15`,
                            borderColor: `${primaryColor}30`,
                            color: primaryColor,
                          }
                        : {}
                    }
                  >
                    🔍 البحث: {searchTerm}
                  </Badge>
                )}
                {selectedCategory !== 'all' && (
                  <Badge 
                    variant="secondary" 
                    className={`border ${
                      primaryColor 
                        ? 'text-white' 
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    }`}
                    style={
                      primaryColor 
                        ? {
                            backgroundColor: `${primaryColor}15`,
                            borderColor: `${primaryColor}30`,
                            color: primaryColor,
                          }
                        : {}
                    }
                  >
                    📁 الفئة: {categories.find(c => c.id === selectedCategory)?.name}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 