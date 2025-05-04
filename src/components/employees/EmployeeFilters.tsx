import { EmployeeFilter } from '@/types/employee';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowDownWideNarrow,
  ArrowUpWideNarrow
} from 'lucide-react';

interface EmployeeFiltersProps {
  filter: EmployeeFilter;
  onFilterChange: (filter: EmployeeFilter) => void;
}

const EmployeeFilters = ({ filter, onFilterChange }: EmployeeFiltersProps) => {
  const handleSortByChange = (value: string) => {
    onFilterChange({
      ...filter,
      sortBy: value as EmployeeFilter['sortBy']
    });
  };

  const handleSortOrderChange = (value: string) => {
    onFilterChange({
      ...filter,
      sortOrder: value as EmployeeFilter['sortOrder']
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
          <SelectItem value="created_at">تاريخ التعيين</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filter.sortOrder}
        onValueChange={handleSortOrderChange}
      >
        <SelectTrigger className="w-[120px]">
          <div className="flex items-center gap-2">
            {filter.sortOrder === 'asc' ? (
              <ArrowUpWideNarrow className="h-4 w-4" />
            ) : (
              <ArrowDownWideNarrow className="h-4 w-4" />
            )}
            <SelectValue placeholder="الترتيب" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">تصاعدي</SelectItem>
          <SelectItem value="desc">تنازلي</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default EmployeeFilters; 