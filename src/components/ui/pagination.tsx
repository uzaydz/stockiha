import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, ButtonProps } from "@/components/ui/button"

// مكونات shadcn/ui القياسية للـ pagination
const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      {
        "border border-input bg-background hover:bg-accent hover:text-accent-foreground": !isActive,
        "bg-primary text-primary-foreground hover:bg-primary/90": isActive,
      },
      size === "default" && "h-10 px-4 py-2",
      size === "sm" && "h-9 rounded-md px-3",
      size === "lg" && "h-11 rounded-md px-8",
      size === "icon" && "h-10 w-10",
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>السابق</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>التالي</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">المزيد من الصفحات</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

// مكون الـ pagination المخصص للمنتجات
interface CustomPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showSizeChanger?: boolean
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  totalItems?: number
  loading?: boolean
}

const CustomPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showSizeChanger = false,
  pageSize = 10,
  onPageSizeChange,
  totalItems = 0,
  loading = false
}: CustomPaginationProps) => {
  const generatePageNumbers = () => {
    const pages = []
    const showPages = 5 // عدد الصفحات المرئية

    if (totalPages <= showPages) {
      // إذا كان إجمالي الصفحات أقل من أو يساوي العدد المرئي
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // إذا كان إجمالي الصفحات أكبر من العدد المرئي
      const startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
      const endPage = Math.min(totalPages, startPage + showPages - 1)
      
      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) {
          pages.push('...')
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = generatePageNumbers()
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems)
  const endItem = Math.min(currentPage * pageSize, totalItems)

  if (totalPages === 0) return null

  return (
    <div className="flex flex-col gap-4 items-center justify-between px-2 sm:flex-row">
      {/* معلومات الصفحة الحالية */}
      <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            عرض {startItem} - {endItem} من أصل {totalItems.toLocaleString('ar-EG')} عنصر
          </span>
        </div>
        
        {/* اختيار عدد العناصر في الصفحة */}
        {showSizeChanger && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>عرض:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-input bg-background px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              disabled={loading}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>عنصر</span>
          </div>
        )}
      </div>

      {/* أزرار التنقل */}
      <div className="flex items-center gap-1">
        {/* زر الصفحة السابقة */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="h-9 w-9 p-0 hover:bg-accent hover:text-accent-foreground"
          title="الصفحة السابقة"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">الصفحة السابقة</span>
        </Button>

        {/* أرقام الصفحات */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            <React.Fragment key={`page-${page}-${index}`}>
              {page === '...' ? (
                <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">المزيد من الصفحات</span>
                </span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  disabled={loading}
                  className={cn(
                    "h-9 w-9 p-0 transition-all",
                    currentPage === page
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={`الصفحة ${page}`}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* زر الصفحة التالية */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="h-9 w-9 p-0 hover:bg-accent hover:text-accent-foreground"
          title="الصفحة التالية"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">الصفحة التالية</span>
        </Button>
      </div>
    </div>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  CustomPagination,
}
