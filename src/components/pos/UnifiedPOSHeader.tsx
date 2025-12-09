import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Scan,
    Filter,
    ShoppingCart,
    RotateCcw,
    ShieldAlert,
    Wrench,
    Calculator,
    Receipt,
    Settings2,
    RefreshCw,
    LayoutGrid,
    ChevronDown,
    X,
    Package,
    Layers
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePOSMode } from '@/context/POSModeContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// --- Interfaces ---
interface UnifiedPOSHeaderProps {
    // Mode Control (Optional - for controlled usage)
    mode?: 'sales' | 'return' | 'loss';
    onModeChange?: (mode: 'sales' | 'return' | 'loss') => void;

    // Search & Filter
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onBarcodeSearch?: (barcode: string) => void;

    // Data State
    isLoading?: boolean;
    onRefreshData?: () => void;

    // Categories
    categories: { id: string; name: string }[];
    selectedCategory: string;
    onCategorySelect: (id: string) => void;

    // Actions
    onOpenCalculator?: () => void;
    onOpenExpenses?: () => void;
    onOpenSettings?: () => void;
    onOpenRepair?: () => void;
}

// --- Constants ---
const MODE_CONFIG = {
    sales: {
        label: 'نقطة البيع',
        icon: ShoppingCart,
        color: 'bg-blue-600',
        lightColor: 'bg-blue-50 text-blue-700',
        borderColor: 'border-blue-200',
        ringColor: 'focus:ring-blue-500',
        gradient: 'from-blue-600 to-indigo-600',
    },
    return: {
        label: 'وضع الإرجاع',
        icon: RotateCcw,
        color: 'bg-orange-500',
        lightColor: 'bg-orange-50 text-orange-700',
        borderColor: 'border-orange-200',
        ringColor: 'focus:ring-orange-500',
        gradient: 'from-orange-500 to-red-500',
    },
    loss: {
        label: 'وضع الخسائر',
        icon: ShieldAlert,
        color: 'bg-red-600',
        lightColor: 'bg-red-50 text-red-700',
        borderColor: 'border-red-200',
        ringColor: 'focus:ring-red-500',
        gradient: 'from-red-600 to-rose-600',
    }
};

const UnifiedPOSHeader: React.FC<UnifiedPOSHeaderProps> = ({
    mode: propMode,
    onModeChange,
    searchQuery,
    onSearchChange,
    onBarcodeSearch,
    isLoading,
    onRefreshData,
    categories,
    selectedCategory,
    onCategorySelect,
    onOpenCalculator,
    onOpenExpenses,
    onOpenSettings,
    onOpenRepair,
}) => {
    // Try to use context. To allow usage without provider (if needed later), we could make this optional.
    // But for now, we assume provider exists as per design.
    // We'll wrap in try-catch or just use it if we are sure.
    // Given usePOSMode throws, we must be inside provider.
    const posModeContext = usePOSMode();

    const activeMode = propMode ?? posModeContext.mode;
    const handleSetMode = onModeChange ?? posModeContext.setMode;

    const currentMode = MODE_CONFIG[activeMode];
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Handle barcode submission
    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (barcodeInput.trim() && onBarcodeSearch) {
            onBarcodeSearch(barcodeInput.trim());
            setBarcodeInput('');
        }
    };

    return (
        <div className="flex flex-col gap-4 w-full mb-6 select-none">

            {/* --- The Command HUD Island --- */}
            <div className={cn(
                "relative flex items-center gap-2 md:gap-3 p-2 rounded-2xl border shadow-sm transition-all duration-300",
                "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800",
                isSearchFocused ? "ring-2 ring-primary/20 shadow-md" : ""
            )}>

                {/* 1. Mode Switcher (Status Capsule) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            "flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl transition-all duration-300 group outline-none",
                            currentMode.lightColor
                        )}>
                            <div className={cn(
                                "p-1.5 rounded-lg text-white shadow-sm",
                                "bg-gradient-to-br", currentMode.gradient
                            )}>
                                <currentMode.icon className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm hidden md:block">{currentMode.label}</span>
                            <ChevronDown className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-2">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">اختر وضع العمل</DropdownMenuLabel>

                        <DropdownMenuItem onClick={() => handleSetMode('sales')} className="gap-2 cursor-pointer p-2 rounded-lg data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/30">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><ShoppingCart className="h-4 w-4" /></div>
                            <div className="flex flex-col">
                                <span className="font-medium text-blue-900 dark:text-blue-100">نقطة البيع</span>
                                <span className="text-[10px] text-muted-foreground">الوضع الافتراضي للبيع</span>
                            </div>
                            {activeMode === 'sales' && <div className="mr-auto h-2 w-2 rounded-full bg-blue-500" />}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleSetMode('return')} className="gap-2 cursor-pointer p-2 rounded-lg data-[highlighted]:bg-orange-50 dark:data-[highlighted]:bg-orange-900/30">
                            <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md"><RotateCcw className="h-4 w-4" /></div>
                            <div className="flex flex-col">
                                <span className="font-medium text-orange-900 dark:text-orange-100">وضع الإرجاع</span>
                                <span className="text-[10px] text-muted-foreground">استرجاع المنتجات من الزبائن</span>
                            </div>
                            {activeMode === 'return' && <div className="mr-auto h-2 w-2 rounded-full bg-orange-500" />}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleSetMode('loss')} className="gap-2 cursor-pointer p-2 rounded-lg data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/30">
                            <div className="p-1.5 bg-red-100 text-red-600 rounded-md"><ShieldAlert className="h-4 w-4" /></div>
                            <div className="flex flex-col">
                                <span className="font-medium text-red-900 dark:text-red-100">وضع الخسائر</span>
                                <span className="text-[10px] text-muted-foreground">تسجيل التالف والمسروق</span>
                            </div>
                            {activeMode === 'loss' && <div className="mr-auto h-2 w-2 rounded-full bg-red-500" />}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-8 bg-gray-200 dark:bg-slate-800 mx-1" />

                {/* 2. Omni-Search Bar */}
                <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                        <Search className="h-5 w-5" />
                    </div>

                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="ابحث عن منتج، باركود، أو وصف..."
                        className={cn(
                            "w-full h-11 pr-10 pl-24 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/60 transition-all",
                            "text-gray-900 dark:text-white"
                        )}
                    />

                    {/* Integrated Barcode Trigger (Right-Left aligned inside input) */}
                    <div className="absolute inset-y-0 left-2 flex items-center gap-1">
                        {/* Barcode Form (Hidden/Popover logic could go here, but for simplicity we keep pure UI action or a tiny input) */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg">
                                    <Scan className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-2" align="end">
                                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                                    <Input
                                        autoFocus
                                        placeholder="امسح الباركود هنا..."
                                        value={barcodeInput}
                                        onChange={(e) => setBarcodeInput(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                    <Button type="submit" size="sm" className="h-8">بحث</Button>
                                </form>
                            </PopoverContent>
                        </Popover>

                        {/* Filter Trigger */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-4" align="end">
                                <div className="flex flex-col gap-2">
                                    <h4 className="font-medium text-sm mb-2">خيارات العرض</h4>
                                    <div className="flex items-center gap-2">
                                        {/* Simple placeholders for now */}
                                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">الأكثر مبيعاً</Badge>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">الأحدث</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 text-red-500 border-red-200">نفذت الكمية</Badge>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 text-blue-500 border-blue-200">مخزون وافر</Badge>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="w-px h-8 bg-gray-200 dark:bg-slate-800 mx-1" />

                {/* 3. Quick Action Grid (App Menu) */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-11 w-11 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-900 group"
                        >
                            <LayoutGrid className="h-5 w-5 transition-transform group-hover:scale-110" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 p-4 rounded-2xl">
                        <div className="grid grid-cols-3 gap-3">
                            <QuickActionBtn icon={Calculator} label="آلة حاسبة" color="text-blue-500" bg="bg-blue-50 hover:bg-blue-100" onClick={onOpenCalculator} />
                            <QuickActionBtn icon={Receipt} label="مصروف" color="text-purple-500" bg="bg-purple-50 hover:bg-purple-100" onClick={onOpenExpenses} />
                            <QuickActionBtn icon={Settings2} label="إعدادات" color="text-slate-500" bg="bg-slate-50 hover:bg-slate-100" onClick={onOpenSettings} />
                            <QuickActionBtn icon={Wrench} label="تصليح" color="text-amber-500" bg="bg-amber-50 hover:bg-amber-100" onClick={onOpenRepair} />
                            <QuickActionBtn
                                icon={RefreshCw}
                                label="تحديث"
                                color={isLoading ? "text-green-500 animate-spin" : "text-green-500"}
                                bg="bg-green-50 hover:bg-green-100"
                                onClick={onRefreshData}
                            />
                        </div>
                    </PopoverContent>
                </Popover>

            </div>

            {/* --- 4. Smart Category Pills --- */}
            <div className="w-full">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex w-max space-x-2 p-1">
                        {/* All Categories Pill */}
                        <button
                            onClick={() => onCategorySelect('all')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                                selectedCategory === 'all'
                                    ? "bg-gray-900 text-white border-gray-900 shadow-md transform scale-105"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            الكل
                        </button>

                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => onCategorySelect(cat.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                                    selectedCategory === cat.id
                                        ? "bg-gray-900 text-white border-gray-900 shadow-md transform scale-105"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                )}
                            >
                                {/* Maybe add category icons later */}
                                {cat.name}
                            </button>
                        ))}

                        {/* Spacer for scroll end */}
                        <div className="w-2" />
                    </div>
                    <ScrollBar orientation="horizontal" className="invisible" />
                </ScrollArea>
            </div>

        </div>
    );
};

// Sub-component for Quick Action Grid Item
const QuickActionBtn = ({ icon: Icon, label, color, bg, onClick }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200",
            bg
        )}
    >
        <div className={cn("p-2 rounded-full bg-white shadow-sm", color)}>
            <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
    </button>
);

export default UnifiedPOSHeader;
