import { type OrderItem } from "./table/OrderTableTypes";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderItemsListProps = {
  items: OrderItem[];
};

const OrderItemsList = ({ items }: OrderItemsListProps) => {
  return (
    <Table className="border rounded-sm">
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="font-medium">المنتج</TableHead>
          <TableHead className="w-[80px] text-center font-medium">الكمية</TableHead>
          <TableHead className="w-[120px] text-left font-medium">السعر</TableHead>
          <TableHead className="w-[120px] text-left font-medium">المجموع</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{item.product_name}</span>
                <div className="flex items-center gap-2 mt-1">
                  {item.color_name && (
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground ml-1">اللون:</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs h-5 px-1 flex items-center gap-1"
                      >
                        {item.color_code && (
                          <span 
                            className="w-3 h-3 rounded-full inline-block" 
                            style={{ backgroundColor: item.color_code }}
                          />
                        )}
                        {item.color_name}
                      </Badge>
                    </div>
                  )}
                  
                  {item.size_name && (
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground ml-1">المقاس:</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs h-5 px-1"
                      >
                        {item.size_name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-center font-mono">{item.quantity}</TableCell>
            <TableCell className="text-left font-mono">{formatPrice(item.unit_price)}</TableCell>
            <TableCell className="text-left font-mono font-medium">{formatPrice(item.total_price)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default OrderItemsList; 