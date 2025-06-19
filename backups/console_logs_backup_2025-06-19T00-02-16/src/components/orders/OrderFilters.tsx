import {
  Tabs,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, ChevronDown, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

// مكون مرشحات الطلبات
const OrderFilters = ({ filterStatus, setFilterStatus, orderCounts }) => {
  // ترجمة الحالات إلى العربية
  const statusTranslations = {
    'all': 'الكل',
    'pending': 'قيد الانتظار',
    'processing': 'قيد المعالجة',
    'shipped': 'تم الشحن',
    'delivered': 'تم التسليم',
    'cancelled': 'ملغي',
  };

  // نظام الألوان والرموز للحالات
  const statusIcons = {
    'pending': <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 ml-1">{orderCounts.pending}</Badge>,
    'processing': <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 ml-1">{orderCounts.processing}</Badge>,
    'shipped': <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 ml-1">{orderCounts.shipped}</Badge>,
    'delivered': <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 ml-1">{orderCounts.delivered}</Badge>,
    'cancelled': <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 ml-1">{orderCounts.cancelled}</Badge>,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Tabs value={filterStatus} onValueChange={setFilterStatus}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 p-1">
            <TabsTrigger value="all" className="text-xs px-2 py-1.5">
              الكل
              <Badge variant="outline" className="ml-1 bg-gray-100 dark:bg-gray-800">
                {orderCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2 py-1.5">
              قيد الانتظار
              {statusIcons.pending}
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-xs px-2 py-1.5">
              قيد المعالجة
              {statusIcons.processing}
            </TabsTrigger>
            <TabsTrigger value="shipped" className="text-xs px-2 py-1.5">
              تم الشحن
              {statusIcons.shipped}
            </TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs px-2 py-1.5">
              تم التسليم
              {statusIcons.delivered}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs px-2 py-1.5">
              ملغي
              {statusIcons.cancelled}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث عن اسم العميل، رقم الطلب، ..."
            className="pl-8 pr-3 text-sm h-9" 
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-9">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">فرز وتصفية</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>حسب التاريخ</DropdownMenuLabel>
            <DropdownMenuItem>
              <Calendar className="w-4 h-4 ml-2" />
              اليوم
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="w-4 h-4 ml-2" />
              الأسبوع الماضي
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="w-4 h-4 ml-2" />
              الشهر الماضي
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>حسب الحالة</DropdownMenuLabel>
            {Object.keys(statusTranslations).map((status) => (
              <DropdownMenuItem key={status} onClick={() => setFilterStatus(status)}>
                {status === filterStatus && <Check className="w-4 h-4 ml-1" />}
                {statusTranslations[status]}
                {status !== 'all' && statusIcons[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default OrderFilters;
