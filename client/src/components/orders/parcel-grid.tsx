import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";
import { Link } from "wouter";

// This component is a simplified version that just allows navigation to the parcel page
export function ParcelGrid() {
  // Fetch orders to determine active parcels
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  
  // Get active parcels
  const activeParcelCount = orders
    ? orders.filter(order => order.orderType === "parcel" && order.paymentStatus === "unpaid").length
    : 0;
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-md p-2 mt-4">
      <h3 className="text-sm font-medium mb-2 px-1">Parcels</h3>
      <div className="flex gap-2">
        <Link href="/parcel">
          <Button
            variant={activeParcelCount > 0 ? "destructive" : "outline"}
            className="h-16 w-32"
          >
            <div className="flex flex-col items-center">
              <Package className="h-5 w-5 mb-1" />
              <span className="text-sm">Parcels</span>
              {activeParcelCount > 0 && (
                <span className="text-sm font-bold">({activeParcelCount})</span>
              )}
            </div>
          </Button>
        </Link>
      </div>
    </div>
  );
}