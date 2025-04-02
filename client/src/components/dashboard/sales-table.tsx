import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SalesTableProps {
  startDate: Date;
  endDate: Date;
  paymentMethod: string;
  onEditBill: (order: Order) => void;
}

export function SalesTable({ startDate, endDate, paymentMethod, onEditBill }: SalesTableProps) {
  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ["/api/orders/report", { startDate, endDate, paymentMethod }],
    queryFn: async () => {
      const res = await fetch("/api/orders/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          paymentMethod,
        }),
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      
      return res.json();
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading sales data: {error.message}
      </div>
    );
  }
  
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No sales data available for the selected period
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead>Bill No.</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Table/Parcel</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                #{order.orderNumber}
              </TableCell>
              <TableCell>
                {format(new Date(order.createdAt), "MMM dd, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                {order.orderType === "dine_in" 
                  ? `Table ${order.tableNumber}` 
                  : "Parcel"}
              </TableCell>
              <TableCell>
                ₹{Number(order.totalAmount).toFixed(2)}
              </TableCell>
              <TableCell>
                {order.paymentMethod 
                  ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) 
                  : "Unpaid"}
              </TableCell>
              <TableCell>
                <Button
                  variant="link"
                  className="text-primary hover:text-blue-800 p-0 h-auto"
                  onClick={() => onEditBill(order)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
