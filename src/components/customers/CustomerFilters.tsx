import { CustomerFilter } from '@/types/customer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CustomerFiltersProps {
  filter: CustomerFilter;
  onFilterChange: (filter: CustomerFilter) => void;
}

const CustomerFilters = ({ filter, onFilterChange }: CustomerFiltersProps) => {
  const handleSortByChange = (value: string) => {
    onFilterChange({
      ...filter,
      sortBy: value as CustomerFilter['sortBy']
    });
  };

  const handleSortOrderChange = (value: string) => {
    onFilterChange({
      ...filter,
      sortOrder: value as CustomerFilter['sortOrder']
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <Select
        value={filter.sortBy}
        onValueChange={handleSortByChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="ترتيب حسب" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">الاسم</SelectItem>
          <SelectItem value="created_at">تاريخ التسجيل</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filter.sortOrder}
        onValueChange={handleSortOrderChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="الترتيب" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">تصاعدي</SelectItem>
          <SelectItem value="desc">تنازلي</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <Switch
            id="filter-has-phone"
            checked={!!filter.hasPhone}
            onCheckedChange={(v) => onFilterChange({ ...filter, hasPhone: !!v })}
          />
          <Label htmlFor="filter-has-phone" className="text-xs sm:text-sm">لديه هاتف</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="filter-has-email"
            checked={!!filter.hasEmail}
            onCheckedChange={(v) => onFilterChange({ ...filter, hasEmail: !!v })}
          />
          <Label htmlFor="filter-has-email" className="text-xs sm:text-sm">لديه بريد</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="filter-new-only"
            checked={!!filter.newOnly}
            onCheckedChange={(v) => onFilterChange({ ...filter, newOnly: !!v })}
          />
          <Label htmlFor="filter-new-only" className="text-xs sm:text-sm">جدد (30 يوم)</Label>
        </div>
      </div>
    </div>
  );
};

export default CustomerFilters;
