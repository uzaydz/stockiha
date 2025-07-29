import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Upload, Star, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ImageUploader from '@/components/ui/ImageUploader';

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
}

interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  platform: string;
  size_gb?: number;
  requirements?: any;
  images?: string[];
  price: number;
  is_featured: boolean;
  is_active: boolean;
  download_count: number;
  category?: GameCategory;
}

const platforms = [
  { value: 'PC', label: 'كمبيوتر شخصي' },
  { value: 'PlayStation', label: 'بلايستيشن' },
  { value: 'Xbox', label: 'إكس بوكس' },
  { value: 'Mobile', label: 'موبايل' },
];

export default function GamesCatalog() {
  const { organizationId } = useUser();
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [activeTab, setActiveTab] = useState('games');
  
  // Dialog states
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<GameCategory | null>(null);
  
  // Form states
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameForm, setGameForm] = useState({
    name: '',
    description: '',
    category_id: '',
    platform: 'PC',
    size_gb: '',
    price: '',
    is_featured: false,
    is_active: true,
    images: [] as string[],
    requirements: {
      cpu: '',
      ram: '',
      gpu: '',
      storage: '',
      os: '',
    },
  });

  const [editingCategory, setEditingCategory] = useState<GameCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchGames(), fetchCategories()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games_catalog')
        .select('*, category:game_categories(*)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      toast.error('فشل في تحميل الألعاب');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('game_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error('فشل في تحميل الفئات');
    }
  };

  const handleSaveGame = async () => {
    try {
      const slug = gameForm.name.toLowerCase().replace(/\s+/g, '-');
      const gameData = {
        ...gameForm,
        organization_id: organizationId,
        slug,
        size_gb: gameForm.size_gb ? parseFloat(gameForm.size_gb) : null,
        price: parseFloat(gameForm.price) || 0,
        updated_at: new Date().toISOString(),
      };

      if (editingGame) {
        const { error } = await supabase
          .from('games_catalog')
          .update(gameData)
          .eq('id', editingGame.id);

        if (error) throw error;
        toast.success('تم تحديث اللعبة بنجاح');
      } else {
        const { error } = await supabase
          .from('games_catalog')
          .insert([gameData]);

        if (error) throw error;
        toast.success('تم إضافة اللعبة بنجاح');
      }

      setShowGameDialog(false);
      resetGameForm();
      fetchGames();
    } catch (error: any) {
      toast.error('فشل في حفظ اللعبة');
    }
  };

  const handleSaveCategory = async () => {
    try {
      const slug = categoryForm.name.toLowerCase().replace(/\s+/g, '-');
      const categoryData = {
        ...categoryForm,
        organization_id: organizationId,
        slug,
        updated_at: new Date().toISOString(),
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('game_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('تم تحديث الفئة بنجاح');
      } else {
        const { error } = await supabase
          .from('game_categories')
          .insert([categoryData]);

        if (error) throw error;
        toast.success('تم إضافة الفئة بنجاح');
      }

      setShowCategoryDialog(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error: any) {
      toast.error('فشل في حفظ الفئة');
    }
  };

  const handleDeleteGame = async () => {
    if (!gameToDelete) return;

    try {
      // التحقق من وجود طلبات تحميل مرتبطة بهذه اللعبة (للعلم فقط)
      const { data: relatedOrders } = await supabase
        .from('game_download_orders')
        .select('id, tracking_number, status')
        .eq('game_id', gameToDelete.id);

      // حذف اللعبة مباشرة (الطلبات ستبقى مع game_id = NULL)
      const { error } = await supabase
        .from('games_catalog')
        .delete()
        .eq('id', gameToDelete.id);

      if (error) {
        toast.error(`فشل في حذف اللعبة: ${error.message}`);
        return;
      }

      // رسالة نجاح مع معلومات عن الطلبات المرتبطة
      if (relatedOrders && relatedOrders.length > 0) {
        toast.success(
          `تم حذف اللعبة بنجاح. الطلبات المرتبطة (${relatedOrders.length}) تم الاحتفاظ بها مع معلومات اللعبة.`
        );
      } else {
        toast.success('تم حذف اللعبة بنجاح');
      }

      setShowDeleteDialog(false);
      setGameToDelete(null);
      fetchGames();
    } catch (error: any) {
      toast.error(`فشل في حذف اللعبة: ${error.message || 'خطأ غير معروف'}`);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      // التحقق من وجود ألعاب مرتبطة بهذه الفئة
      const { data: gamesInCategory, error: checkError } = await supabase
        .from('games_catalog')
        .select('id, name')
        .eq('category_id', categoryToDelete.id)
        .eq('organization_id', organizationId);

      if (checkError) throw checkError;

      if (gamesInCategory && gamesInCategory.length > 0) {
        toast.error(`لا يمكن حذف هذه الفئة لأنها تحتوي على ${gamesInCategory.length} لعبة. يرجى نقل الألعاب لفئة أخرى أولاً.`);
        setShowDeleteCategoryDialog(false);
        setCategoryToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('game_categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;

      toast.success(`تم حذف الفئة "${categoryToDelete.name}" بنجاح`);
      setShowDeleteCategoryDialog(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      toast.error('فشل في حذف الفئة');
    }
  };

  const handleImageUpload = (imageUrl: string, index: number) => {
    setGameForm(prev => {
      const newImages = [...prev.images];
      if (index < newImages.length) {
        newImages[index] = imageUrl;
      } else {
        newImages.push(imageUrl);
      }
      return { ...prev, images: newImages };
    });
  };

  const handleRemoveImage = (index: number) => {
    setGameForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleAddImage = () => {
    setGameForm(prev => ({
      ...prev,
      images: [...prev.images, ''],
    }));
  };

  const resetGameForm = () => {
    setGameForm({
      name: '',
      description: '',
      category_id: '',
      platform: 'PC',
      size_gb: '',
      price: '',
      is_featured: false,
      is_active: true,
      images: [],
      requirements: {
        cpu: '',
        ram: '',
        gpu: '',
        storage: '',
        os: '',
      },
    });
    setEditingGame(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      icon: '',
      display_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
  };

  const filteredGames = games.filter(game => {
    let matches = true;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matches = game.name.toLowerCase().includes(searchLower) ||
                (game.description?.toLowerCase().includes(searchLower) || false);
    }

    if (selectedCategory !== 'all') {
      matches = matches && game.category_id === selectedCategory;
    }

    if (selectedPlatform !== 'all') {
      matches = matches && game.platform === selectedPlatform;
    }

    return matches;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">كتالوج الألعاب</h2>
            <p className="text-muted-foreground">إدارة الألعاب والفئات</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              الألعاب
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              الفئات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">إدارة الألعاب</h3>
                <p className="text-muted-foreground">عرض وإدارة جميع الألعاب في الكتالوج</p>
              </div>
              <Button onClick={() => setShowGameDialog(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة لعبة
              </Button>
            </div>

        <Card>
          <CardHeader>
            <CardTitle>البحث والتصفية</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في الألعاب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="المنصة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المنصات</SelectItem>
                {platforms.map(platform => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الألعاب</CardTitle>
            <CardDescription>عدد الألعاب: {filteredGames.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اللعبة</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>المنصة</TableHead>
                    <TableHead>الحجم</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>التحميلات</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {game.images && game.images[0] && (
                            <img
                              src={game.images[0]}
                              alt={game.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {game.name}
                              {game.is_featured && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            {game.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {game.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{game.category?.name || 'غير مصنف'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {platforms.find(p => p.value === game.platform)?.label || game.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>{game.size_gb ? `${game.size_gb} GB` : '-'}</TableCell>
                      <TableCell>{game.price} دج</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {game.download_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={game.is_active ? 'default' : 'secondary'}>
                          {game.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingGame(game);
                              setGameForm({
                                name: game.name,
                                description: game.description || '',
                                category_id: game.category_id || '',
                                platform: game.platform,
                                size_gb: game.size_gb?.toString() || '',
                                price: game.price.toString(),
                                is_featured: game.is_featured,
                                is_active: game.is_active,
                                images: game.images || [],
                                requirements: game.requirements || {
                                  cpu: '',
                                  ram: '',
                                  gpu: '',
                                  storage: '',
                                  os: '',
                                },
                              });
                              setShowGameDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setGameToDelete(game);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredGames.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد ألعاب مطابقة للبحث
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">إدارة الفئات</h3>
                <p className="text-muted-foreground">عرض وإدارة فئات الألعاب</p>
              </div>
              <Button onClick={() => setShowCategoryDialog(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة فئة
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>قائمة الفئات</CardTitle>
                <CardDescription>عدد الفئات: {categories.length}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الفئة</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>عدد الألعاب</TableHead>
                        <TableHead>الترتيب</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => {
                        const gamesCount = games.filter(game => game.category_id === category.id).length;
                        return (
                          <TableRow key={category.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {category.icon && (
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Tag className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{category.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {category.slug}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                {category.description || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {gamesCount} لعبة
                              </Badge>
                            </TableCell>
                            <TableCell>{category.display_order}</TableCell>
                            <TableCell>
                              <Badge variant={category.is_active ? 'default' : 'secondary'}>
                                {category.is_active ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategory(category);
                                    setCategoryForm({
                                      name: category.name,
                                      description: category.description || '',
                                      icon: category.icon || '',
                                      display_order: category.display_order,
                                      is_active: category.is_active,
                                    });
                                    setShowCategoryDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCategoryToDelete(category);
                                    setShowDeleteCategoryDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {categories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد فئات مضافة بعد
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Game Dialog */}
      <Dialog open={showGameDialog} onOpenChange={setShowGameDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGame ? 'تعديل اللعبة' : 'إضافة لعبة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game-name">اسم اللعبة</Label>
                <Input
                  id="game-name"
                  value={gameForm.name}
                  onChange={(e) => setGameForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="اسم اللعبة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="game-platform">المنصة</Label>
                <Select
                  value={gameForm.platform}
                  onValueChange={(value) => setGameForm(prev => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger id="game-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(platform => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="game-description">الوصف</Label>
              <Textarea
                id="game-description"
                value={gameForm.description}
                onChange={(e) => setGameForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف اللعبة"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game-category">الفئة</Label>
                <Select
                  value={gameForm.category_id}
                  onValueChange={(value) => setGameForm(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger id="game-category">
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="game-size">الحجم (GB)</Label>
                <Input
                  id="game-size"
                  type="number"
                  step="0.1"
                  value={gameForm.size_gb}
                  onChange={(e) => setGameForm(prev => ({ ...prev, size_gb: e.target.value }))}
                  placeholder="حجم اللعبة بالجيجابايت"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="game-price">السعر</Label>
              <Input
                id="game-price"
                type="number"
                step="0.01"
                value={gameForm.price}
                onChange={(e) => setGameForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="سعر اللعبة"
              />
            </div>

            <div className="space-y-2">
              <Label>متطلبات التشغيل</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="المعالج (CPU)"
                  value={gameForm.requirements.cpu}
                  onChange={(e) => setGameForm(prev => ({
                    ...prev,
                    requirements: { ...prev.requirements, cpu: e.target.value }
                  }))}
                />
                <Input
                  placeholder="الذاكرة (RAM)"
                  value={gameForm.requirements.ram}
                  onChange={(e) => setGameForm(prev => ({
                    ...prev,
                    requirements: { ...prev.requirements, ram: e.target.value }
                  }))}
                />
                <Input
                  placeholder="كرت الشاشة (GPU)"
                  value={gameForm.requirements.gpu}
                  onChange={(e) => setGameForm(prev => ({
                    ...prev,
                    requirements: { ...prev.requirements, gpu: e.target.value }
                  }))}
                />
                <Input
                  placeholder="مساحة التخزين"
                  value={gameForm.requirements.storage}
                  onChange={(e) => setGameForm(prev => ({
                    ...prev,
                    requirements: { ...prev.requirements, storage: e.target.value }
                  }))}
                />
                <Input
                  placeholder="نظام التشغيل"
                  value={gameForm.requirements.os}
                  onChange={(e) => setGameForm(prev => ({
                    ...prev,
                    requirements: { ...prev.requirements, os: e.target.value }
                  }))}
                  className="col-span-2"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>صور اللعبة</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImage}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة صورة
                </Button>
              </div>
              <div className="space-y-4">
                {gameForm.images.map((image, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">الصورة {index + 1}</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <ImageUploader
                      imageUrl={image}
                      onImageUploaded={(url) => handleImageUpload(url, index)}
                      folder="organization-assets/games"
                      maxSizeInMB={5}
                      compact={true}
                    />
                  </div>
                ))}
                {gameForm.images.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p>لا توجد صور مضافة</p>
                    <p className="text-sm">انقر على "إضافة صورة" لرفع الصور</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="game-featured"
                checked={gameForm.is_featured}
                onCheckedChange={(checked) => setGameForm(prev => ({ ...prev, is_featured: checked }))}
              />
              <Label htmlFor="game-featured" className="cursor-pointer">
                لعبة مميزة
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="game-active"
                checked={gameForm.is_active}
                onCheckedChange={(checked) => setGameForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="game-active" className="cursor-pointer">
                نشط
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGameDialog(false);
              resetGameForm();
            }}>
              إلغاء
            </Button>
            <Button onClick={handleSaveGame}>
              {editingGame ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">اسم الفئة</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="اسم الفئة"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">الوصف</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف الفئة"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-icon">الأيقونة</Label>
              <Input
                id="category-icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="اسم الأيقونة (مثل: Gamepad2)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-order">الترتيب</Label>
              <Input
                id="category-order"
                type="number"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                placeholder="ترتيب العرض"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="category-active"
                checked={categoryForm.is_active}
                onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="category-active" className="cursor-pointer">
                نشط
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCategoryDialog(false);
              resetCategoryForm();
            }}>
              إلغاء
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف اللعبة
            </AlertDialogTitle>
                         <AlertDialogDescription className="space-y-2">
               <p>سيتم حذف اللعبة "<strong>{gameToDelete?.name}</strong>" من الكتالوج نهائياً.</p>
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
                 <div className="flex items-start gap-2">
                   <div className="text-blue-600 mt-0.5">ℹ️</div>
                   <div className="space-y-1">
                     <p className="font-medium">معلومات مهمة:</p>
                     <ul className="text-sm space-y-1 list-disc list-inside">
                       <li>طلبات التحميل المرتبطة <strong>لن تُحذف</strong></li>
                       <li>سيتم الاحتفاظ بمعلومات اللعبة في الطلبات الموجودة</li>
                       <li>لا يمكن التراجع عن حذف اللعبة من الكتالوج</li>
                     </ul>
                   </div>
                 </div>
               </div>
             </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setGameToDelete(null);
            }}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGame}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف الفئة
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>سيتم حذف الفئة "<strong>{categoryToDelete?.name}</strong>" نهائياً.</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800">
                <div className="flex items-start gap-2">
                  <div className="text-yellow-600 mt-0.5">⚠️</div>
                  <div className="space-y-1">
                    <p className="font-medium">تنبيه مهم:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>لا يمكن حذف الفئة إذا كانت تحتوي على ألعاب</li>
                      <li>يجب نقل جميع الألعاب لفئة أخرى أولاً</li>
                      <li>لا يمكن التراجع عن حذف الفئة</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteCategoryDialog(false);
              setCategoryToDelete(null);
            }}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
