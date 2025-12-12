import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

interface LossFiltersProps {
  statusFilter: string;
  typeFilter: string;
  searchQuery: string;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

const LossFilters: React.FC<LossFiltersProps> = ({
  statusFilter,
  typeFilter,
  searchQuery,
  onStatusChange,
  onTypeChange,
  onSearchChange
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Label>الفلاتر:</Label>
          </div>

          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending">في الانتظار</SelectItem>
              <SelectItem value="investigating">قيد التحقيق</SelectItem>
              <SelectItem value="approved">موافق عليها</SelectItem>
              <SelectItem value="rejected">مرفوضة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="damaged">تالف</SelectItem>
              <SelectItem value="expired">منتهي الصلاحية</SelectItem>
              <SelectItem value="theft">سرقة</SelectItem>
              <SelectItem value="spoilage">تلف طبيعي</SelectItem>
              <SelectItem value="breakage">كسر</SelectItem>
              <SelectItem value="defective">معيب</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="البحث برقم التصريح أو الوصف..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default LossFilters;



















