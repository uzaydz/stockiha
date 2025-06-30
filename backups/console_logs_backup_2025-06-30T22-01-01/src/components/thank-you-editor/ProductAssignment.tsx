import { useState, useEffect } from "react";
import { useTenant } from "@/context/TenantContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckSquare, Square, RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ThankYouTemplate } from "@/pages/dashboard/ThankYouPageEditor";
import { getAllProducts, getProductCategories } from "@/api/store";

interface Product {
  id: string;
  name: string;
  thumbnail_image?: string;
  imageUrl?: string;
  price: number;
  category_id?: string;
  category?: string;
  subcategory?: string;
}

interface ProductAssignmentProps {
  template: ThankYouTemplate;
  onChange: (template: ThankYouTemplate) => void;
}

export default function ProductAssignment({
  template,
  onChange,
}: ProductAssignmentProps) {
  const { tenant } = useTenant();
  const [assignmentType, setAssignmentType] = useState<"all_products" | "specific_products">(
    template.applies_to || "all_products"
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    template.product_ids || []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // تحميل المنتجات والفئات عند بدء المكون
  useEffect(() => {
    if (tenant?.id) {
      loadProducts();
      loadCategories();
    }
  }, [tenant?.id]);

  // تحديث المنتجات المرشحة عند تغيير البحث أو الفئات المحددة
  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategories, products]);

  // تحميل المنتجات من قاعدة البيانات
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      if (!tenant?.id) {
        toast.error("معرّف المتجر غير متوفر");
        setIsLoading(false);
        return;
      }

      // استخدام دالة API الحقيقية لجلب المنتجات
      const productsData = await getAllProducts(tenant.id);
      
      if (productsData && productsData.length > 0) {
        // تنسيق البيانات لتتوافق مع واجهة المنتج المطلوبة
        const formattedProducts = productsData.map(product => ({
          id: product.id,
          name: product.name,
          thumbnail_image: product.imageUrl,
          imageUrl: product.imageUrl,
          price: product.price,
          category_id: product.category as string,
          category: product.category
        }));
        
        setProducts(formattedProducts);
        setFilteredProducts(formattedProducts);
        
      } else {
        
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل المنتجات");
    } finally {
      setIsLoading(false);
    }
  };

  // تحميل الفئات من قاعدة البيانات
  const loadCategories = async () => {
    try {
      if (!tenant?.id) {
        toast.error("معرّف المتجر غير متوفر");
        return;
      }

      // استخدام دالة API الحقيقية لجلب الفئات
      const categoriesData = await getProductCategories(tenant.id);
      
      if (categoriesData && categoriesData.length > 0) {
        // تنسيق البيانات للتوافق مع واجهة الفئة المطلوبة
        const formattedCategories = categoriesData.map(category => ({
          id: category.id,
          name: category.name
        }));
        
        setCategories(formattedCategories);
        
      } else {
        
        setCategories([]);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل الفئات");
    }
  };

  // ترشيح المنتجات بناءً على البحث والفئات المحددة
  const filterProducts = () => {
    let filtered = [...products];

    // تطبيق البحث النصي
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query)
      );
    }

    // تطبيق فلتر الفئات
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => 
        selectedCategories.includes(product.category_id || "")
      );
    }

    setFilteredProducts(filtered);
  };

  // تحديث نوع التخصيص (جميع المنتجات أو منتجات محددة)
  const handleAssignmentTypeChange = (value: string) => {
    const newType = value as "all_products" | "specific_products";
    setAssignmentType(newType);
    
    const updatedTemplate = {
      ...template,
      applies_to: newType,
    };
    
    onChange(updatedTemplate);
  };

  // تحديث المنتجات المحددة
  const handleProductSelectionChange = (productId: string, isSelected: boolean) => {
    let newSelectedProducts: string[];
    
    if (isSelected) {
      newSelectedProducts = [...selectedProducts, productId];
    } else {
      newSelectedProducts = selectedProducts.filter(id => id !== productId);
    }
    
    setSelectedProducts(newSelectedProducts);

    const updatedTemplate = {
      ...template,
      product_ids: newSelectedProducts,
    };
    
    onChange(updatedTemplate);
  };

  // تحديث فئات الترشيح
  const handleCategoryFilterChange = (categoryId: string) => {
    let newSelectedCategories: string[];
    
    if (selectedCategories.includes(categoryId)) {
      newSelectedCategories = selectedCategories.filter(id => id !== categoryId);
    } else {
      newSelectedCategories = [...selectedCategories, categoryId];
    }
    
    setSelectedCategories(newSelectedCategories);
  };

  // تحديد كل المنتجات
  const handleSelectAll = () => {
    const allProductIds = filteredProducts.map(product => product.id);
    setSelectedProducts(allProductIds);

    const updatedTemplate = {
      ...template,
      product_ids: allProductIds,
    };
    
    onChange(updatedTemplate);
  };

  // إلغاء تحديد كل المنتجات
  const handleDeselectAll = () => {
    setSelectedProducts([]);
    
    const updatedTemplate = {
      ...template,
      product_ids: [],
    };
    
    onChange(updatedTemplate);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تخصيص المنتجات</CardTitle>
          <CardDescription>
            حدد المنتجات التي ستستخدم هذا القالب في صفحة الشكر
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            defaultValue={assignmentType}
            value={assignmentType}
            onValueChange={handleAssignmentTypeChange}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="all_products" id="all_products" />
              <Label htmlFor="all_products" className="font-medium">
                جميع المنتجات
              </Label>
              <p className="text-sm text-muted-foreground mr-2">
                سيتم تطبيق هذا القالب على جميع المنتجات التي لا تملك قالب مخصص
              </p>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="specific_products" id="specific_products" />
              <Label htmlFor="specific_products" className="font-medium">
                منتجات محددة
              </Label>
              <p className="text-sm text-muted-foreground mr-2">
                اختر المنتجات التي ترغب في تطبيق هذا القالب عليها
              </p>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {assignmentType === "specific_products" && (
        <Card>
          <CardHeader>
            <CardTitle>اختيار المنتجات</CardTitle>
            <CardDescription>
              حدد المنتجات التي تريد تطبيق القالب عليها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن منتج..."
                    className="pr-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="تصفية حسب الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="py-2 px-1">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-2 space-x-reverse py-1 px-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer"
                          onClick={() => handleCategoryFilterChange(category.id)}
                        >
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => handleCategoryFilterChange(category.id)}
                          />
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-muted-foreground">
                    تم تحديد {selectedProducts.length} من {filteredProducts.length} منتج
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={handleSelectAll}
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>تحديد الكل</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={handleDeselectAll}
                  >
                    <Square className="h-4 w-4" />
                    <span>إلغاء تحديد الكل</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategories([]);
                      loadProducts();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>تحديث</span>
                  </Button>
                </div>
              </div>

              <Separator />

              {isLoading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">جاري تحميل المنتجات...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">لم يتم العثور على منتجات</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] rounded-md border p-2">
                  <div className="space-y-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className={cn(
                          "flex items-center space-x-4 space-x-reverse p-2 rounded-lg transition-colors",
                          selectedProducts.includes(product.id)
                            ? "bg-primary/5 border border-primary/20"
                            : "hover:bg-accent hover:text-accent-foreground border border-transparent"
                        )}
                      >
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => 
                            handleProductSelectionChange(product.id, checked === true)
                          }
                        />
                        <div className="h-12 w-12 rounded overflow-hidden border shrink-0">
                          <img
                            src={product.thumbnail_image || "https://via.placeholder.com/150"}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://via.placeholder.com/150";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.category || "غير مصنف"}
                          </div>
                        </div>
                        <div className="text-primary font-medium">
                          {product.price.toLocaleString()} د.ج
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {assignmentType === "all_products" && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <div className="mx-auto rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">تم تفعيل القالب لجميع المنتجات</h3>
              <p className="text-muted-foreground mt-2">
                سيتم استخدام هذا القالب لصفحة الشكر لجميع المنتجات التي لم يتم تخصيص قالب لها.
                <br />يمكنك إنشاء قوالب مخصصة لمنتجات محددة لتقديم تجربة فريدة لكل منتج.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
