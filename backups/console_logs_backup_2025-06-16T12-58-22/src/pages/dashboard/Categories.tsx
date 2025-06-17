import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { toast } from 'sonner';
import { getCategories } from '@/lib/api/unified-api';
import type { Category } from '@/lib/api/categories';
import CategoriesHeader from '@/components/category/CategoriesHeader';
import CategoriesList from '@/components/category/CategoriesList';
import CategoriesFilter from '@/components/category/CategoriesFilter';
import AddCategoryDialog from '@/components/category/AddCategoryDialog';
import { useTenant } from '@/context/TenantContext';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<string>('name-asc');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const { currentOrganization } = useTenant();

  // جلب بيانات الفئات
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const organizationId = currentOrganization?.id;
        const categoriesData = await getCategories(organizationId);
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);
      } catch (error) {
        toast.error('حدث خطأ أثناء تحميل الفئات');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [currentOrganization]);

  // تطبيق فلاتر البحث والترتيب
  useEffect(() => {
    let result = [...categories];

    // تطبيق فلتر البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        category => 
          category.name.toLowerCase().includes(query) || 
          (category.description && category.description.toLowerCase().includes(query))
      );
    }

    // تطبيق فلتر الحالة
    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        result = result.filter(category => category.is_active);
      } else if (activeFilter === 'inactive') {
        result = result.filter(category => !category.is_active);
      }
    }
    
    // تطبيق فلتر النوع
    if (typeFilter !== 'all') {
      result = result.filter(category => category.type === typeFilter);
    }

    // تطبيق الترتيب
    if (sortOption === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    setFilteredCategories(result);
  }, [categories, searchQuery, sortOption, activeFilter, typeFilter]);

  // تحديث الفئات بعد العمليات
  const refreshCategories = async () => {
    try {
      const organizationId = currentOrganization?.id;
      const categoriesData = await getCategories(organizationId);
      setCategories(categoriesData);
      toast.success('تم تحديث قائمة الفئات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الفئات');
    }
  };

  // معالج إضافة فئة جديدة
  const handleAddCategory = () => {
    setIsAddCategoryOpen(true);
  };

  return (
    <Layout>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">جاري تحميل الفئات...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 w-full">
          {/* رأس صفحة الفئات مع العنوان وزر الإضافة */}
          <CategoriesHeader 
            categoryCount={filteredCategories.length}
            onAddCategory={handleAddCategory}
          />
          
          {/* صف الفلاتر */}
          <CategoriesFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOption={sortOption}
            onSortChange={setSortOption}
            activeFilter={activeFilter}
            onActiveFilterChange={setActiveFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />
          
          {/* قائمة الفئات */}
          <CategoriesList 
            categories={filteredCategories}
            onRefreshCategories={refreshCategories}
          />
          
          {/* مربع حوار إضافة فئة */}
          <AddCategoryDialog
            open={isAddCategoryOpen}
            onOpenChange={setIsAddCategoryOpen}
            onCategoryAdded={refreshCategories}
          />
        </div>
      )}
    </Layout>
  );
};

export default Categories;
