import { CustomerFilter } from '@/types/customer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div className="flex gap-2">
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
    </div>
  );
};

export default CustomerFilters;
