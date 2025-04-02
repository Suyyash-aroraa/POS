import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Order, OrderItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePrintService } from "@/lib/print-service";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Printer, RefreshCw, Receipt, Monitor, Trash2, ArrowLeftRight, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface OrderSummaryProps {
  orderId?: number;
  orderType: 'dine_in' | 'parcel';
  tableNumber?: number;
  customerName?: string;
  onPrintKOT: () => void;
  onPrintBill: () => void;
  onFreeTable: () => void;
  onShiftTable: () => void;
  onSettle: () => void;
}

export function OrderSummary({ 
  orderId, 
  orderType, 
  tableNumber, 
  customerName, 
  onPrintKOT, 
  onPrintBill, 
  onFreeTable, 
  onShiftTable, 
  onSettle 
}: OrderSummaryProps) {
  const { toast } = useToast();
  
  // Fetch order and order items
  const { data: order, isLoading: isOrderLoading } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });
  
  const { data: orderItems, isLoading: isItemsLoading } = useQuery<OrderItem[]>({
    queryKey: [`/api/orders/${orderId}/items`],
    enabled: !!orderId,
  });
  
  const isLoading = isOrderLoading || isItemsLoading;
  
  // Check if all items are in "kot_printed" or "completed" status
  const allItemsKotPrinted = orderItems?.every(item => 
    item.status === "kot_printed" || item.status === "completed"
  );
  
  // Check if there are any pending items (for KOT)
  const hasPendingItems = orderItems?.some(item => item.status === "pending");
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          <div>
            {orderType === 'dine_in' 
              ? `Table ${tableNumber} Order` 
              : `Parcel Order ${order?.orderNumber || ''}`}
          </div>
          {order && (
            <div className="text-sm font-normal text-gray-500">
              Started: {format(new Date(order.createdAt), "MMM dd, HH:mm")}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-auto pb-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !orderItems || orderItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No items added to order yet
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Price
                </th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orderItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.menuItemName}
                    {item.specialInstructions && (
                      <div className="text-xs text-gray-500">{item.specialInstructions}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    ₹{(Number(item.price) * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <Badge variant={item.status === "pending" ? "warning" : "success"}>
                      {item.status === "pending" ? "Pending" : "Done"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
      
      {order && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Subtotal:</span>
            <span className="text-sm font-medium text-gray-900">₹{Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Tax (5%):</span>
            <span className="text-sm font-medium text-gray-900">₹{Number(order.tax).toFixed(2)}</span>
          </div>
          {orderType === 'parcel' && Number(order.packagingFee) > 0 && (
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Packaging:</span>
              <span className="text-sm font-medium text-gray-900">₹{Number(order.packagingFee).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between mb-2">
            <span className="text-sm font-bold text-gray-800">Total:</span>
            <span className="text-sm font-bold text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      )}
      
      <CardFooter className="border-t border-gray-200 p-4 grid grid-cols-3 gap-2">
        <Button
          className="flex flex-col items-center"
          onClick={onPrintKOT}
          disabled={!hasPendingItems}
        >
          <Receipt className="h-5 w-5 mb-1" />
          <span className="text-xs">Print KOT</span>
        </Button>
        
        <Button
          className="flex flex-col items-center"
          variant="outline"
          onClick={() => onPrintKOT()}
        >
          <RefreshCw className="h-5 w-5 mb-1" />
          <span className="text-xs">Reprint KOT</span>
        </Button>
        
        <Button
          className="flex flex-col items-center"
          variant="secondary"
          onClick={onPrintBill}
          disabled={!allItemsKotPrinted}
        >
          <Printer className="h-5 w-5 mb-1" />
          <span className="text-xs">Print Bill</span>
        </Button>
        
        <Button
          className="flex flex-col items-center"
          variant="outline"
          onClick={onPrintBill}
        >
          <RefreshCw className="h-5 w-5 mb-1" />
          <span className="text-xs">Reprint Bill</span>
        </Button>
        
        {orderType === 'dine_in' && (
          <>
            <Button
              className="flex flex-col items-center"
              variant="outline"
              onClick={onShiftTable}
            >
              <ArrowLeftRight className="h-5 w-5 mb-1" />
              <span className="text-xs">Shift Table</span>
            </Button>
            
            <Button
              className="flex flex-col items-center"
              variant="destructive"
              onClick={onFreeTable}
            >
              <Trash2 className="h-5 w-5 mb-1" />
              <span className="text-xs">Free Table</span>
            </Button>
          </>
        )}
        
        <Button
          className={`flex flex-col items-center ${orderType === 'parcel' ? 'col-span-3' : 'col-span-3'}`}
          variant="secondary"
          onClick={onSettle}
        >
          <CreditCard className="h-5 w-5 mb-1" />
          <span className="text-xs">Settle</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
