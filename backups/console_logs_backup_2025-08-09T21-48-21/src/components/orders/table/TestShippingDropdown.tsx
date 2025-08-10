import React, { memo } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Truck } from "lucide-react";

interface TestShippingDropdownProps {
  onSelect: (provider: string) => void;
}

const TestShippingDropdown: React.FC<TestShippingDropdownProps> = ({ onSelect }) => {
  return (
    <DropdownMenu onOpenChange={(open) => console.log('Test Dropdown opened:', open)}>
      <DropdownMenuTrigger asChild>
        <button 
          type="button"
          className="h-8 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          اختر مزود الشحن (اختبار)
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-48 bg-white border shadow-lg"
        style={{ zIndex: 9999 }}
      >
        <DropdownMenuLabel className="text-sm font-medium px-3 py-2 flex items-center gap-2">
          <Truck className="h-4 w-4" />
          مزودو الشحن
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => {
            console.log('Yalidine clicked');
            onSelect('yalidine');
          }}
          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>ياليدين</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => {
            console.log('ZRExpress clicked');
            onSelect('zrexpress');
          }}
          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>زر إكسبرس</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default memo(TestShippingDropdown);
