import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface TableGridProps {
  onSelectTable: (tableNumber: string) => void;
  selectedTable: number;
}

export function TableGrid({ onSelectTable, selectedTable }: TableGridProps) {
  // Number of tables to display
  const numberOfTables = 10;
  
  // Fetch orders to determine which tables are occupied
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Get occupied tables
  const occupiedTables = orders
    ? orders
        .filter(order => order.orderType === "dine_in" && order.paymentStatus === "unpaid")
        .map(order => order.tableNumber)
    : [];
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-md p-2 mt-4">
      <h3 className="text-sm font-medium mb-2 px-1">Tables</h3>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: numberOfTables }, (_, i) => i + 1).map((tableNum) => {
          const isOccupied = occupiedTables.includes(tableNum);
          const isSelected = tableNum === selectedTable;
          
          return (
            <Button
              key={tableNum}
              variant={isSelected ? "default" : isOccupied ? "destructive" : "outline"}
              className={`h-16 ${isSelected ? "bg-green-600 hover:bg-green-700" : ""}`}
              onClick={() => onSelectTable(tableNum.toString())}
            >
              <div className="flex flex-col items-center">
                <span className="text-sm">Table</span>
                <span className="text-lg font-bold">{tableNum}</span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}