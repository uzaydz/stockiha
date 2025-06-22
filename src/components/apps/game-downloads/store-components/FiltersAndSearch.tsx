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
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/20 shadow-2xl overflow-hidden">
        <CardContent className="p-8">
          <div className="mb-6 text-center space-y-2">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                اختر فئة الألعاب
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">تصفح مجموعة واسعة من الألعاب المصنفة حسب النوع</p>
          </div>
          
          <div className="space-y-6">
                         {/* Main Categories Grid */}
             <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
               {/* All Categories Card */}
               <div
                 onClick={() => setSelectedCategory('all')}
                 className={`group cursor-pointer relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                   selectedCategory === 'all'
                     ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/20'
                     : 'border-border/20 bg-card/50 hover:border-primary/40 hover:bg-card/80'
                 }`}
               >
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                 <div className="relative p-4 text-center">
                   <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all duration-300 ${
                     selectedCategory === 'all'
                       ? 'bg-primary text-white shadow-sm'
                       : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                   }`}>
                     <Gamepad2 className="h-4 w-4" />
                   </div>
                   <h4 className={`font-semibold text-xs leading-tight ${
                     selectedCategory === 'all' ? 'text-primary' : 'text-foreground'
                   }`}>
                     جميع الفئات
                   </h4>
                   {selectedCategory === 'all' && (
                     <div className="absolute top-2 right-2">
                       <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                     </div>
                   )}
                 </div>
               </div>

               {/* Category Cards */}
               {categories.map((category, index) => {
                 const IconComponent = getCategoryIcon(category.name);
                 const isActive = selectedCategory === category.id;
                 const colorSchemes = [
                   { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-600', activeBg: 'bg-blue-500/15', activeBorder: 'border-blue-500', shadow: 'shadow-blue-500/20' },
                   { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'text-green-600', activeBg: 'bg-green-500/15', activeBorder: 'border-green-500', shadow: 'shadow-green-500/20' },
                   { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'text-orange-600', activeBg: 'bg-orange-500/15', activeBorder: 'border-orange-500', shadow: 'shadow-orange-500/20' },
                   { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-600', activeBg: 'bg-purple-500/15', activeBorder: 'border-purple-500', shadow: 'shadow-purple-500/20' },
                   { bg: 'bg-pink-500/10', border: 'border-pink-500/30', icon: 'text-pink-600', activeBg: 'bg-pink-500/15', activeBorder: 'border-pink-500', shadow: 'shadow-pink-500/20' },
                   { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-600', activeBg: 'bg-cyan-500/15', activeBorder: 'border-cyan-500', shadow: 'shadow-cyan-500/20' },
                   { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-600', activeBg: 'bg-emerald-500/15', activeBorder: 'border-emerald-500', shadow: 'shadow-emerald-500/20' },
                   { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', icon: 'text-indigo-600', activeBg: 'bg-indigo-500/15', activeBorder: 'border-indigo-500', shadow: 'shadow-indigo-500/20' },
                 ];
                 const scheme = colorSchemes[index % colorSchemes.length];
                 
                 return (
                   <div
                     key={category.id}
                     onClick={() => setSelectedCategory(category.id)}
                     className={`group cursor-pointer relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                       isActive
                         ? `${scheme.activeBorder} ${scheme.activeBg} shadow-md ${scheme.shadow}`
                         : `border-border/20 bg-card/50 hover:${scheme.border} hover:${scheme.bg}`
                     }`}
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                     <div className="relative p-4 text-center">
                       <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all duration-300 ${
                         isActive
                           ? `${scheme.icon.replace('text-', 'bg-')} text-white shadow-sm`
                           : `${scheme.bg} ${scheme.icon} group-hover:${scheme.bg.replace('/10', '/20')}`
                       }`}>
                         <IconComponent className="h-4 w-4" />
                       </div>
                       <h4 className={`font-semibold text-xs leading-tight line-clamp-2 ${
                         isActive ? scheme.icon : 'text-foreground'
                       }`}>
                         {category.name}
                       </h4>
                       {isActive && (
                         <div className="absolute top-2 right-2">
                           <div className={`w-2 h-2 ${scheme.icon.replace('text-', 'bg-')} rounded-full animate-pulse`} />
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>

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